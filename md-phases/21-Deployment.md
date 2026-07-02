# AlgoWix Platform — 21 Deployment

**Document Version:** 1.0.0  
**Status:** Approved

---

## 1. Deployment Strategy

### Release Strategy: Blue-Green Deployment

```
Blue (current live)  ◄── Traffic: 100%
Green (new version)  ◄── Traffic: 0% (being deployed)

Deployment:
1. Deploy new version to Green
2. Run smoke tests on Green
3. Shift 10% traffic to Green (canary)
4. Monitor error rate, latency
5. Shift 100% traffic to Green (Green is now live)
6. Keep Blue for 30 minutes (instant rollback if needed)
7. Decommission Blue
```

---

## 2. Docker Configuration

### Backend Dockerfile

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build:api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["node", "dist/server.js"]
```

### Frontend Dockerfile

```dockerfile
# apps/web/Dockerfile
FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

FROM base AS builder
COPY package.json pnpm-lock.yaml ./
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build:web

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

### Docker Compose (Local Development)

```yaml
# docker-compose.yml
version: '3.9'

services:
  api:
    build: ./apps/api
    ports: ["4000:4000"]
    environment:
      DATABASE_URL: "sqlserver://localhost:1433;database=algowix_dev;user=sa;password=DevPass123!;trustServerCertificate=true"
      REDIS_URL: "redis://redis:6379"
      NODE_ENV: development
    depends_on: [db, redis]
    volumes:
      - ./apps/api/src:/app/src   # hot reload

  web:
    build: ./apps/web
    ports: ["3000:3000"]
    environment:
      NEXT_PUBLIC_API_URL: "http://localhost:4000"
      NODE_ENV: development
    depends_on: [api]

  db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    ports: ["1433:1433"]
    environment:
      ACCEPT_EULA: "Y"
      SA_PASSWORD: "DevPass123!"
      MSSQL_PID: "Developer"
    volumes:
      - mssql_data:/var/opt/mssql

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --requirepass devredispass

volumes:
  mssql_data:
```

---

## 3. Azure Infrastructure (Terraform)

```hcl
# infrastructure/terraform/main.tf

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
  backend "azurerm" {
    resource_group_name  = "algowix-terraform"
    storage_account_name = "algowixterraform"
    container_name       = "tfstate"
    key                  = "platform.terraform.tfstate"
  }
}

resource "azurerm_resource_group" "platform" {
  name     = "algowix-platform-${var.environment}"
  location = "Central India"
}

# Azure SQL
resource "azurerm_mssql_server" "platform" {
  name                         = "algowix-sql-${var.environment}"
  resource_group_name          = azurerm_resource_group.platform.name
  location                     = azurerm_resource_group.platform.location
  version                      = "12.0"
  administrator_login          = var.sql_admin_user
  administrator_login_password = var.sql_admin_password
}

resource "azurerm_mssql_database" "platform" {
  name      = "algowix_platform"
  server_id = azurerm_mssql_server.platform.id
  sku_name  = var.environment == "production" ? "BC_Gen5_4" : "GP_Gen5_2"
  
  threat_detection_policy {
    state = "Enabled"
  }
}

# Azure Cache for Redis
resource "azurerm_redis_cache" "platform" {
  name                = "algowix-redis-${var.environment}"
  resource_group_name = azurerm_resource_group.platform.name
  location            = azurerm_resource_group.platform.location
  capacity            = var.environment == "production" ? 2 : 1
  family              = "C"
  sku_name            = var.environment == "production" ? "Standard" : "Basic"
  minimum_tls_version = "1.2"
}

# App Service Plan
resource "azurerm_service_plan" "platform" {
  name                = "algowix-asp-${var.environment}"
  resource_group_name = azurerm_resource_group.platform.name
  location            = azurerm_resource_group.platform.location
  os_type             = "Linux"
  sku_name            = var.environment == "production" ? "P2v3" : "B2"
}

# Backend App Service
resource "azurerm_linux_web_app" "api" {
  name                = "algowix-api-${var.environment}"
  resource_group_name = azurerm_resource_group.platform.name
  location            = azurerm_resource_group.platform.location
  service_plan_id     = azurerm_service_plan.platform.id

  site_config {
    always_on         = true
    http2_enabled     = true
    minimum_tls_version = "1.2"
    
    application_stack {
      docker_image     = "algowix/platform-api"
      docker_image_tag = var.api_image_tag
    }
    
    health_check_path = "/health"
  }

  app_settings = {
    WEBSITES_ENABLE_APP_SERVICE_STORAGE = "false"
    DATABASE_URL                        = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.db_url.id})"
    REDIS_URL                           = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.redis_url.id})"
    NODE_ENV                            = var.environment
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.platform.connection_string
  }
}

# Azure Key Vault
resource "azurerm_key_vault" "platform" {
  name                = "algowix-kv-${var.environment}"
  resource_group_name = azurerm_resource_group.platform.name
  location            = azurerm_resource_group.platform.location
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"
  purge_protection_enabled = var.environment == "production"
}
```

---

## 4. Environment Configuration

```
environments/
├── dev/
│   ├── terraform.tfvars
│   └── app-settings.json
├── staging/
│   ├── terraform.tfvars
│   └── app-settings.json
└── production/
    ├── terraform.tfvars
    └── app-settings.json
```

---

## 5. Deployment Checklist

```
Pre-deployment:
□ All tests passing (unit + integration + E2E)
□ Security scan (Snyk or similar) passed
□ Database migrations reviewed and tested on staging
□ Environment variables verified in Key Vault
□ Blue-green target (Green) is healthy

Deployment:
□ Run: prisma migrate deploy (migrations first)
□ Deploy API containers
□ Deploy Web containers
□ Run smoke tests
□ Monitor error rate for 10 minutes

Post-deployment:
□ Verify all health checks passing
□ Verify Sentry has no new P0 errors
□ Verify Application Insights shows normal metrics
□ Update deployment log
□ Notify team in Slack
```

---

*Next: [22-Security.md — Security Architecture, Threat Model, Penetration Testing]*

---
**Document Control**  
Owner: DevOps Lead + Platform Architect
