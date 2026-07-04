BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [developer].[ApiKeys] ADD [environment] NVARCHAR(10) NOT NULL CONSTRAINT [ApiKeys_environment_df] DEFAULT 'live';

-- AlterTable
ALTER TABLE [platform].[Users] ADD [notificationPrefs] NVARCHAR(max);

-- CreateTable
CREATE TABLE [developer].[Integrations] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [provider] NVARCHAR(50) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Integrations_status_df] DEFAULT 'DISCONNECTED',
    [accessTokenEnc] NVARCHAR(max),
    [refreshTokenEnc] NVARCHAR(max),
    [scopes] NVARCHAR(max),
    [connectedAt] DATETIME2,
    [connectedById] UNIQUEIDENTIFIER,
    [metadata] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Integrations_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Integrations_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Integrations_organizationId_provider_key] UNIQUE NONCLUSTERED ([organizationId],[provider])
);

-- CreateTable
CREATE TABLE [developer].[MarketplaceListings] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [slug] NVARCHAR(100) NOT NULL,
    [name] NVARCHAR(150) NOT NULL,
    [description] NVARCHAR(1000) NOT NULL,
    [developerName] NVARCHAR(150) NOT NULL,
    [developerEmail] NVARCHAR(255) NOT NULL,
    [type] NVARCHAR(30) NOT NULL,
    [price] DECIMAL(10,2),
    [logoUrl] NVARCHAR(500),
    [screenshots] NVARCHAR(max),
    [tags] NVARCHAR(max),
    [category] NVARCHAR(50) NOT NULL,
    [rating] DECIMAL(3,2) NOT NULL CONSTRAINT [MarketplaceListings_rating_df] DEFAULT 0,
    [reviewCount] INT NOT NULL CONSTRAINT [MarketplaceListings_reviewCount_df] DEFAULT 0,
    [installCount] INT NOT NULL CONSTRAINT [MarketplaceListings_installCount_df] DEFAULT 0,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [MarketplaceListings_status_df] DEFAULT 'APPROVED',
    [webhookEvents] NVARCHAR(max),
    [requiredScopes] NVARCHAR(max),
    [installUrl] NVARCHAR(500),
    [webhookUrl] NVARCHAR(500),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [MarketplaceListings_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [MarketplaceListings_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [MarketplaceListings_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [developer].[MarketplaceInstalls] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [listingId] UNIQUEIDENTIFIER NOT NULL,
    [installedById] UNIQUEIDENTIFIER NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [MarketplaceInstalls_status_df] DEFAULT 'ACTIVE',
    [installedAt] DATETIME2 NOT NULL CONSTRAINT [MarketplaceInstalls_installedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [uninstalledAt] DATETIME2,
    CONSTRAINT [MarketplaceInstalls_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [MarketplaceInstalls_organizationId_listingId_key] UNIQUE NONCLUSTERED ([organizationId],[listingId])
);

-- CreateTable
CREATE TABLE [developer].[ApiRequestLogs] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [apiKeyId] UNIQUEIDENTIFIER,
    [method] NVARCHAR(10) NOT NULL,
    [path] NVARCHAR(255) NOT NULL,
    [statusCode] INT NOT NULL,
    [latencyMs] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ApiRequestLogs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ApiRequestLogs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [developer].[Integrations] ADD CONSTRAINT [Integrations_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [platform].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [developer].[MarketplaceInstalls] ADD CONSTRAINT [MarketplaceInstalls_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [platform].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [developer].[MarketplaceInstalls] ADD CONSTRAINT [MarketplaceInstalls_listingId_fkey] FOREIGN KEY ([listingId]) REFERENCES [developer].[MarketplaceListings]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [developer].[ApiRequestLogs] ADD CONSTRAINT [ApiRequestLogs_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [platform].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
