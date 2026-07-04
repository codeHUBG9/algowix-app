BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [platform].[ProductPlans] ADD [trialConfig] NVARCHAR(max);

-- AlterTable
ALTER TABLE [platform].[Subscriptions] ADD [dunningStage] INT NOT NULL CONSTRAINT [Subscriptions_dunningStage_df] DEFAULT 0,
[lastDunningActionAt] DATETIME2,
[paymentFailedAt] DATETIME2;

-- CreateTable
CREATE TABLE [billing].[InvoiceSequences] (
    [year] INT NOT NULL,
    [lastNumber] INT NOT NULL CONSTRAINT [InvoiceSequences_lastNumber_df] DEFAULT 0,
    CONSTRAINT [InvoiceSequences_pkey] PRIMARY KEY CLUSTERED ([year])
);

-- CreateTable
CREATE TABLE [billing].[Invoices] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [subscriptionId] UNIQUEIDENTIFIER NOT NULL,
    [invoiceNumber] NVARCHAR(30) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Invoices_status_df] DEFAULT 'DRAFT',
    [currency] NCHAR(3) NOT NULL CONSTRAINT [Invoices_currency_df] DEFAULT 'INR',
    [billingCycle] NVARCHAR(20) NOT NULL,
    [subtotal] DECIMAL(12,2) NOT NULL,
    [discountAmount] DECIMAL(12,2) NOT NULL CONSTRAINT [Invoices_discountAmount_df] DEFAULT 0,
    [creditApplied] DECIMAL(12,2) NOT NULL CONSTRAINT [Invoices_creditApplied_df] DEFAULT 0,
    [isIGST] BIT NOT NULL CONSTRAINT [Invoices_isIGST_df] DEFAULT 0,
    [cgstAmount] DECIMAL(12,2) NOT NULL CONSTRAINT [Invoices_cgstAmount_df] DEFAULT 0,
    [sgstAmount] DECIMAL(12,2) NOT NULL CONSTRAINT [Invoices_sgstAmount_df] DEFAULT 0,
    [igstAmount] DECIMAL(12,2) NOT NULL CONSTRAINT [Invoices_igstAmount_df] DEFAULT 0,
    [taxAmount] DECIMAL(12,2) NOT NULL CONSTRAINT [Invoices_taxAmount_df] DEFAULT 0,
    [total] DECIMAL(12,2) NOT NULL,
    [amountDue] DECIMAL(12,2) NOT NULL,
    [gatewayProvider] NVARCHAR(20) NOT NULL,
    [gatewayOrderId] NVARCHAR(255),
    [periodStart] DATETIME2 NOT NULL,
    [periodEnd] DATETIME2 NOT NULL,
    [dueDate] DATETIME2 NOT NULL,
    [paidAt] DATETIME2,
    [voidedAt] DATETIME2,
    [pdfUrl] NVARCHAR(500),
    [notes] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Invoices_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Invoices_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Invoices_invoiceNumber_key] UNIQUE NONCLUSTERED ([invoiceNumber])
);

-- CreateTable
CREATE TABLE [billing].[InvoiceLineItems] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [invoiceId] UNIQUEIDENTIFIER NOT NULL,
    [description] NVARCHAR(500) NOT NULL,
    [quantity] INT NOT NULL CONSTRAINT [InvoiceLineItems_quantity_df] DEFAULT 1,
    [unitPrice] DECIMAL(12,2) NOT NULL,
    [amount] DECIMAL(12,2) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [InvoiceLineItems_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [InvoiceLineItems_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [billing].[Payments] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [invoiceId] UNIQUEIDENTIFIER NOT NULL,
    [gatewayProvider] NVARCHAR(20) NOT NULL,
    [gatewayPaymentId] NVARCHAR(255),
    [gatewayOrderId] NVARCHAR(255),
    [amount] DECIMAL(12,2) NOT NULL,
    [currency] NCHAR(3) NOT NULL CONSTRAINT [Payments_currency_df] DEFAULT 'INR',
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Payments_status_df] DEFAULT 'PENDING',
    [method] NVARCHAR(30),
    [failureReason] NVARCHAR(500),
    [refundedAmount] DECIMAL(12,2) NOT NULL CONSTRAINT [Payments_refundedAmount_df] DEFAULT 0,
    [paidAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Payments_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Payments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [billing].[PaymentMethods] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [gatewayProvider] NVARCHAR(20) NOT NULL,
    [gatewayMethodId] NVARCHAR(255) NOT NULL,
    [type] NVARCHAR(20) NOT NULL,
    [brand] NVARCHAR(30),
    [last4] NCHAR(4),
    [expiryMonth] INT,
    [expiryYear] INT,
    [isDefault] BIT NOT NULL CONSTRAINT [PaymentMethods_isDefault_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PaymentMethods_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PaymentMethods_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [billing].[Credits] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [amount] DECIMAL(12,2) NOT NULL,
    [remainingAmount] DECIMAL(12,2) NOT NULL,
    [reason] NVARCHAR(255) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Credits_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Credits_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [billing].[Coupons] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [code] NVARCHAR(50) NOT NULL,
    [type] NVARCHAR(20) NOT NULL,
    [value] DECIMAL(10,2) NOT NULL,
    [appliesTo] NVARCHAR(20) NOT NULL CONSTRAINT [Coupons_appliesTo_df] DEFAULT 'ALL',
    [appliesToProducts] NVARCHAR(max),
    [maxUses] INT,
    [currentUses] INT NOT NULL CONSTRAINT [Coupons_currentUses_df] DEFAULT 0,
    [minOrderAmount] DECIMAL(12,2),
    [validFrom] DATETIME2 NOT NULL,
    [validUntil] DATETIME2 NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [Coupons_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Coupons_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Coupons_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Coupons_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [billing].[CouponRedemptions] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [couponId] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [invoiceId] UNIQUEIDENTIFIER NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [CouponRedemptions_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [CouponRedemptions_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [billing].[Invoices] ADD CONSTRAINT [Invoices_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [platform].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [billing].[Invoices] ADD CONSTRAINT [Invoices_subscriptionId_fkey] FOREIGN KEY ([subscriptionId]) REFERENCES [platform].[Subscriptions]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [billing].[InvoiceLineItems] ADD CONSTRAINT [InvoiceLineItems_invoiceId_fkey] FOREIGN KEY ([invoiceId]) REFERENCES [billing].[Invoices]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [billing].[Payments] ADD CONSTRAINT [Payments_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [platform].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [billing].[Payments] ADD CONSTRAINT [Payments_invoiceId_fkey] FOREIGN KEY ([invoiceId]) REFERENCES [billing].[Invoices]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [billing].[PaymentMethods] ADD CONSTRAINT [PaymentMethods_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [platform].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [billing].[Credits] ADD CONSTRAINT [Credits_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [platform].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [billing].[CouponRedemptions] ADD CONSTRAINT [CouponRedemptions_couponId_fkey] FOREIGN KEY ([couponId]) REFERENCES [billing].[Coupons]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [billing].[CouponRedemptions] ADD CONSTRAINT [CouponRedemptions_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [platform].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [billing].[CouponRedemptions] ADD CONSTRAINT [CouponRedemptions_invoiceId_fkey] FOREIGN KEY ([invoiceId]) REFERENCES [billing].[Invoices]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
