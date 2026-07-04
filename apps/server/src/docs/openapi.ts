import swaggerJsdoc from "swagger-jsdoc";

// 10-API-Gateway.md §8 — Azure APIM's built-in developer portal, substituted
// with a self-hosted swagger-ui-express instance (there's no Azure account
// to host a real APIM developer portal against). Only annotates the routers
// built in this session (products, api-keys) rather than retrofitting every
// pre-existing route — that would be its own large, separate pass.
export const openApiSpec = swaggerJsdoc({
  definition: {
    openapi: "3.1.0",
    info: {
      title: "AlgoWix Platform API",
      version: "1.0.0",
      description: "Platform API for products, subscriptions, and developer API keys.",
    },
    servers: [{ url: "/api/v1" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        apiKey: { type: "apiKey", in: "header", name: "Authorization" },
      },
    },
  },
  apis: ["./src/modules/product/*.router.ts", "./src/modules/organization/organization.router.ts"],
});
