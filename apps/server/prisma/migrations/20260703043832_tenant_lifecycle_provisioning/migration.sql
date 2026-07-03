BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [platform].[Organizations] DROP CONSTRAINT [Organizations_status_df];
ALTER TABLE [platform].[Organizations] ADD CONSTRAINT [Organizations_status_df] DEFAULT 'PENDING' FOR [status];
ALTER TABLE [platform].[Organizations] ADD [cancelledAt] DATETIME2,
[dedicatedDbSecretRef] NVARCHAR(255),
[purgeScheduledAt] DATETIME2,
[purgedAt] DATETIME2,
[suspendReason] NVARCHAR(500),
[suspendedAt] DATETIME2,
[tenancyType] NVARCHAR(20) NOT NULL CONSTRAINT [Organizations_tenancyType_df] DEFAULT 'SHARED';

-- AlterTable
ALTER TABLE [platform].[Subscriptions] ADD [adminLoginUrl] NVARCHAR(500),
[lastProvisionError] NVARCHAR(1000),
[providerTenantId] NVARCHAR(255),
[provisionAttempts] INT NOT NULL CONSTRAINT [Subscriptions_provisionAttempts_df] DEFAULT 0,
[provisionedAt] DATETIME2,
[provisioningStatus] NVARCHAR(20) NOT NULL CONSTRAINT [Subscriptions_provisioningStatus_df] DEFAULT 'PENDING',
[tenantUrl] NVARCHAR(500);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
