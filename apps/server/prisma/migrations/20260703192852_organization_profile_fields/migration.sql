BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [platform].[Organizations] ADD [address] NVARCHAR(500),
[city] NVARCHAR(100),
[email] NVARCHAR(255),
[foundedYear] INT,
[legalName] NVARCHAR(255),
[phone] NVARCHAR(20),
[pincode] NVARCHAR(20),
[state] NVARCHAR(100),
[website] NVARCHAR(255);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
