BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [platform].[Products] ADD [consecutiveFailures] INT NOT NULL CONSTRAINT [Products_consecutiveFailures_df] DEFAULT 0,
[healthStatus] NVARCHAR(20) NOT NULL CONSTRAINT [Products_healthStatus_df] DEFAULT 'unknown',
[lastHealthCheckAt] DATETIME2,
[lastHealthSuccessAt] DATETIME2,
[version] NVARCHAR(50);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
