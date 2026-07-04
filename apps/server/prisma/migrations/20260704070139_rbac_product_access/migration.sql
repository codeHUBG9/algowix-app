BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [platform].[RoleProductAccess] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [roleId] UNIQUEIDENTIFIER NOT NULL,
    [productId] UNIQUEIDENTIFIER NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RoleProductAccess_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [RoleProductAccess_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RoleProductAccess_roleId_productId_key] UNIQUE NONCLUSTERED ([roleId],[productId])
);

-- AddForeignKey
ALTER TABLE [platform].[RoleProductAccess] ADD CONSTRAINT [RoleProductAccess_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [platform].[Roles]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [platform].[RoleProductAccess] ADD CONSTRAINT [RoleProductAccess_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [platform].[Products]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
