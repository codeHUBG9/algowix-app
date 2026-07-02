# AlgoWix Platform — 23 CI/CD

**Document Version:** 1.0.0  
**Status:** Approved

---

## 1. CI/CD Overview

```
Developer pushes code
        │
        ▼
Azure DevOps Pipeline triggers
        │
  ┌─────┴──────────────────────────────────┐
  │           CI Pipeline                   │
  │  1. Install dependencies               │
  │  2. Type check (tsc --noEmit)          │
  │  3. Lint (ESLint)                      │
  │  4. Unit tests (Vitest)                │
  │  5. Integration tests (Supertest)      │
  │  6. Security scan (Snyk)              │
  │  7. Build Docker image                 │
  │  8. Push to Azure Container Registry  │
  └─────┬──────────────────────────────────┘
        │
  ┌─────┴─────────────────────────────────┐
  │           CD Pipeline                  │
  │                                        │
  │  develop branch → dev environment     │
  │  main branch    → staging environment │
  │  Manual approve → production           │
  └────────────────────────────────────────┘
```

---

## 2. Azure DevOps Pipeline Configuration

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include: ['main', 'develop', 'feature/*']

variables:
  PNPM_VERSION: '8'
  NODE_VERSION: '20'
  CONTAINER_REGISTRY: 'algowixacr.azurecr.io'

stages:
  - stage: CI
    displayName: 'Build & Test'
    jobs:
      - job: BuildAndTest
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '$(NODE_VERSION)'

          - script: npm install -g pnpm@$(PNPM_VERSION)
            displayName: 'Install pnpm'

          - script: pnpm install --frozen-lockfile
            displayName: 'Install dependencies'

          - script: pnpm type-check
            displayName: 'TypeScript type check'

          - script: pnpm lint
            displayName: 'ESLint'

          - script: pnpm test:unit --coverage
            displayName: 'Unit tests'

          - task: PublishTestResults@2
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: '**/test-results.xml'

          - task: PublishCodeCoverageResults@1
            inputs:
              codeCoverageTool: 'Cobertura'
              summaryFileLocation: '**/coverage/cobertura-coverage.xml'

          - script: pnpm snyk test --severity-threshold=high
            displayName: 'Security scan'
            env:
              SNYK_TOKEN: $(SNYK_TOKEN)

          - task: Docker@2
            displayName: 'Build & Push API image'
            inputs:
              containerRegistry: 'AlgoWixACR'
              repository: 'platform-api'
              command: 'buildAndPush'
              Dockerfile: 'apps/api/Dockerfile'
              tags: |
                $(Build.SourceBranchName)-$(Build.BuildId)
                latest

  - stage: DeployDev
    condition: eq(variables['Build.SourceBranch'], 'refs/heads/develop')
    dependsOn: CI
    jobs:
      - deployment: DeployToDev
        environment: 'algowix-dev'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: |
                    az webapp config container set \
                      --name algowix-api-dev \
                      --resource-group algowix-platform-dev \
                      --docker-custom-image-name $(CONTAINER_REGISTRY)/platform-api:$(Build.BuildId)
                  displayName: 'Deploy API to dev'

                - script: |
                    npx prisma migrate deploy
                  displayName: 'Run DB migrations'
                  env:
                    DATABASE_URL: $(DEV_DATABASE_URL)

  - stage: DeployStaging
    condition: eq(variables['Build.SourceBranch'], 'refs/heads/main')
    dependsOn: CI
    jobs:
      - deployment: DeployToStaging
        environment: 'algowix-staging'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploy to staging..."
                  displayName: 'Deploy to staging'
                - script: pnpm test:e2e --env staging
                  displayName: 'E2E tests on staging'

  - stage: DeployProduction
    condition: eq(variables['Build.SourceBranch'], 'refs/heads/main')
    dependsOn: DeployStaging
    jobs:
      - deployment: DeployToProduction
        environment: 'algowix-production'  # Requires manual approval gate
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Blue-green deployment to production..."
```

---

## 3. Testing Strategy

### Test Pyramid

```
                    ┌─────┐
                    │ E2E │  (10%) — Playwright, critical paths only
                   ┌┴─────┴┐
                   │  API  │  (30%) — Supertest, all endpoints
                  ┌┴───────┴┐
                  │  Unit   │  (60%) — Vitest, services and utilities
                 └───────────┘
```

### Unit Test Coverage Requirements

```
Minimum coverage thresholds (enforced in CI):
  statements: 80%
  branches: 75%
  functions: 80%
  lines: 80%
```

### Integration Tests (API)

```typescript
// tests/api/subscriptions.test.ts
describe('POST /api/v1/subscriptions', () => {
  it('should create a subscription for authenticated org', async () => {
    const { token, orgId } = await createTestOrg();
    
    const response = await request(app)
      .post('/api/v1/subscriptions')
      .set('Cookie', `access_token=${token}`)
      .send({ productSlug: 'crm', planSlug: 'starter' })
      .expect(201);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('TRIALING');
    expect(response.body.data.organizationId).toBe(orgId);
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/login.spec.ts
test('user can login and reach dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@algowix.com');
  await page.fill('[name="password"]', 'TestPass123!');
  await page.click('[type="submit"]');
  await page.waitForURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

---

## 4. Quality Gates

No PR can be merged without:
- [ ] All CI checks green
- [ ] Code review approved (min 1 reviewer)
- [ ] No critical/high security vulnerabilities
- [ ] Coverage not decreased below thresholds
- [ ] No TODO/FIXME left in changed files (enforced by linter)
- [ ] TypeScript: no errors, no `any` without comment

No production deployment without:
- [ ] Staging E2E tests passing
- [ ] Manual QA sign-off
- [ ] Migration review by DBA
- [ ] Product Manager approval
- [ ] Engineering Lead approval

---

## 5. Monitoring Post-Deployment

```
Automated post-deployment checks (15 min window):
├── Error rate < 0.1% (Sentry)
├── P95 API latency < 200ms (Application Insights)
├── All product health checks passing
├── No spike in failed logins
└── Payment success rate > 99%

If any check fails: automatic rollback triggered
```

---

*Next: [24-Roadmap.md — 12-Week Build Plan, Milestones, Team Structure]*

---
**Document Control**  
Owner: DevOps Lead
