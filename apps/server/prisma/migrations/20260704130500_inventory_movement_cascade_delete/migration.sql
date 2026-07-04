BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [inventory].[InventoryMovements] DROP CONSTRAINT [InventoryMovements_itemId_fkey];

-- AddForeignKey
ALTER TABLE [inventory].[InventoryMovements] ADD CONSTRAINT [InventoryMovements_itemId_fkey] FOREIGN KEY ([itemId]) REFERENCES [inventory].[InventoryItems]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
