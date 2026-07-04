BEGIN TRY

BEGIN TRAN;

-- CreateSchema
EXEC sp_executesql N'CREATE SCHEMA [inventory];';;

-- CreateTable
CREATE TABLE [inventory].[InventoryItems] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [sku] NVARCHAR(50) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(1000),
    [category] NVARCHAR(100),
    [quantity] INT NOT NULL CONSTRAINT [InventoryItems_quantity_df] DEFAULT 0,
    [reorderPoint] INT NOT NULL CONSTRAINT [InventoryItems_reorderPoint_df] DEFAULT 10,
    [unitCost] DECIMAL(10,2) NOT NULL,
    [unitPrice] DECIMAL(10,2) NOT NULL,
    [location] NVARCHAR(255),
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [InventoryItems_status_df] DEFAULT 'ACTIVE',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [InventoryItems_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [InventoryItems_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [InventoryItems_organizationId_sku_key] UNIQUE NONCLUSTERED ([organizationId],[sku])
);

-- CreateTable
CREATE TABLE [inventory].[InventoryMovements] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [itemId] UNIQUEIDENTIFIER NOT NULL,
    [type] NVARCHAR(20) NOT NULL,
    [quantity] INT NOT NULL,
    [reason] NVARCHAR(500),
    [performedBy] UNIQUEIDENTIFIER NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [InventoryMovements_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [InventoryMovements_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [inventory].[InventoryItems] ADD CONSTRAINT [InventoryItems_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [platform].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [inventory].[InventoryMovements] ADD CONSTRAINT [InventoryMovements_itemId_fkey] FOREIGN KEY ([itemId]) REFERENCES [inventory].[InventoryItems]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
