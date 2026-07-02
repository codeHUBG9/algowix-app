BEGIN TRY

BEGIN TRAN;

-- CreateSchema
EXEC sp_executesql N'CREATE SCHEMA [audit];';;

-- CreateSchema
EXEC sp_executesql N'CREATE SCHEMA [billing];';;

-- CreateSchema
EXEC sp_executesql N'CREATE SCHEMA [developer];';;

-- CreateSchema
EXEC sp_executesql N'CREATE SCHEMA [files];';;

-- CreateSchema
EXEC sp_executesql N'CREATE SCHEMA [platform];';;

-- CreateTable
CREATE TABLE [platform].[Organizations] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [slug] NVARCHAR(100) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [logoUrl] NVARCHAR(500),
    [industry] NVARCHAR(100),
    [size] NVARCHAR(20),
    [country] NCHAR(2) NOT NULL,
    [currency] NCHAR(3) NOT NULL CONSTRAINT [Organizations_currency_df] DEFAULT 'INR',
    [timezone] NVARCHAR(50) NOT NULL CONSTRAINT [Organizations_timezone_df] DEFAULT 'Asia/Kolkata',
    [billingEmail] NVARCHAR(255) NOT NULL,
    [taxId] NVARCHAR(50),
    [taxType] NVARCHAR(20),
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Organizations_status_df] DEFAULT 'ACTIVE',
    [plan] NVARCHAR(20) NOT NULL CONSTRAINT [Organizations_plan_df] DEFAULT 'STARTER',
    [trialEndsAt] DATETIME2,
    [settings] NVARCHAR(max),
    [metadata] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Organizations_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [deletedAt] DATETIME2,
    CONSTRAINT [Organizations_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Organizations_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [platform].[Users] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [email] NVARCHAR(255) NOT NULL,
    [emailVerified] BIT NOT NULL CONSTRAINT [Users_emailVerified_df] DEFAULT 0,
    [emailVerifiedAt] DATETIME2,
    [passwordHash] NVARCHAR(255),
    [firstName] NVARCHAR(100) NOT NULL,
    [lastName] NVARCHAR(100) NOT NULL,
    [displayName] NVARCHAR(200),
    [avatarUrl] NVARCHAR(500),
    [phone] NVARCHAR(20),
    [phoneVerified] BIT NOT NULL CONSTRAINT [Users_phoneVerified_df] DEFAULT 0,
    [language] NVARCHAR(10) NOT NULL CONSTRAINT [Users_language_df] DEFAULT 'en',
    [timezone] NVARCHAR(50) NOT NULL CONSTRAINT [Users_timezone_df] DEFAULT 'Asia/Kolkata',
    [twoFactorEnabled] BIT NOT NULL CONSTRAINT [Users_twoFactorEnabled_df] DEFAULT 0,
    [twoFactorMethod] NVARCHAR(10),
    [twoFactorSecret] NVARCHAR(255),
    [backupCodes] NVARCHAR(max),
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Users_status_df] DEFAULT 'ACTIVE',
    [loginAttempts] INT NOT NULL CONSTRAINT [Users_loginAttempts_df] DEFAULT 0,
    [lockedUntil] DATETIME2,
    [lastLoginAt] DATETIME2,
    [lastLoginIp] NVARCHAR(45),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Users_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [deletedAt] DATETIME2,
    CONSTRAINT [Users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [platform].[OrgMemberships] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [roleId] UNIQUEIDENTIFIER NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [OrgMemberships_status_df] DEFAULT 'ACTIVE',
    [isPrimary] BIT NOT NULL CONSTRAINT [OrgMemberships_isPrimary_df] DEFAULT 0,
    [joinedAt] DATETIME2 NOT NULL CONSTRAINT [OrgMemberships_joinedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [invitedBy] UNIQUEIDENTIFIER,
    [invitedAt] DATETIME2,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [OrgMemberships_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [OrgMemberships_userId_organizationId_key] UNIQUE NONCLUSTERED ([userId],[organizationId])
);

-- CreateTable
CREATE TABLE [platform].[OrgInvites] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [email] NVARCHAR(255) NOT NULL,
    [roleId] UNIQUEIDENTIFIER NOT NULL,
    [token] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [OrgInvites_status_df] DEFAULT 'PENDING',
    [expiresAt] DATETIME2 NOT NULL,
    [invitedById] UNIQUEIDENTIFIER NOT NULL,
    [acceptedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OrgInvites_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [OrgInvites_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [OrgInvites_token_key] UNIQUE NONCLUSTERED ([token])
);

-- CreateTable
CREATE TABLE [platform].[Sessions] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER,
    [refreshTokenHash] NVARCHAR(255) NOT NULL,
    [userAgent] NVARCHAR(500),
    [ipAddress] NVARCHAR(45),
    [deviceType] NVARCHAR(50),
    [deviceName] NVARCHAR(100),
    [lastActiveAt] DATETIME2 NOT NULL CONSTRAINT [Sessions_lastActiveAt_df] DEFAULT CURRENT_TIMESTAMP,
    [expiresAt] DATETIME2 NOT NULL,
    [revokedAt] DATETIME2,
    [replacedByHash] NVARCHAR(255),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Sessions_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Sessions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Sessions_refreshTokenHash_key] UNIQUE NONCLUSTERED ([refreshTokenHash])
);

-- CreateTable
CREATE TABLE [platform].[EmailVerifications] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [token] NVARCHAR(255) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [usedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [EmailVerifications_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [EmailVerifications_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [EmailVerifications_token_key] UNIQUE NONCLUSTERED ([token])
);

-- CreateTable
CREATE TABLE [platform].[PasswordResets] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [token] NVARCHAR(255) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [usedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PasswordResets_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PasswordResets_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PasswordResets_token_key] UNIQUE NONCLUSTERED ([token])
);

-- CreateTable
CREATE TABLE [platform].[Roles] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER,
    [name] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(500),
    [isSystem] BIT NOT NULL CONSTRAINT [Roles_isSystem_df] DEFAULT 0,
    [isDefault] BIT NOT NULL CONSTRAINT [Roles_isDefault_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Roles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Roles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Roles_organizationId_name_key] UNIQUE NONCLUSTERED ([organizationId],[name])
);

-- CreateTable
CREATE TABLE [platform].[Permissions] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [resource] NVARCHAR(100) NOT NULL,
    [action] NVARCHAR(100) NOT NULL,
    [scope] NVARCHAR(50) NOT NULL,
    [description] NVARCHAR(500),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Permissions_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Permissions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Permissions_resource_action_scope_key] UNIQUE NONCLUSTERED ([resource],[action],[scope])
);

-- CreateTable
CREATE TABLE [platform].[RolePermissions] (
    [roleId] UNIQUEIDENTIFIER NOT NULL,
    [permissionId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [RolePermissions_pkey] PRIMARY KEY CLUSTERED ([roleId],[permissionId])
);

-- CreateTable
CREATE TABLE [platform].[Products] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [slug] NVARCHAR(50) NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(1000),
    [shortDescription] NVARCHAR(200),
    [logoUrl] NVARCHAR(500),
    [baseUrl] NVARCHAR(500) NOT NULL,
    [contractApiPath] NVARCHAR(100) NOT NULL CONSTRAINT [Products_contractApiPath_df] DEFAULT '/api/platform',
    [category] NVARCHAR(100) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [Products_isActive_df] DEFAULT 1,
    [isPublic] BIT NOT NULL CONSTRAINT [Products_isPublic_df] DEFAULT 1,
    [isBeta] BIT NOT NULL CONSTRAINT [Products_isBeta_df] DEFAULT 0,
    [sortOrder] INT NOT NULL CONSTRAINT [Products_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Products_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Products_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Products_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [platform].[ProductPlans] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [productId] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [slug] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(500),
    [monthlyPrice] DECIMAL(10,2) NOT NULL,
    [annualPrice] DECIMAL(10,2),
    [currency] NCHAR(3) NOT NULL CONSTRAINT [ProductPlans_currency_df] DEFAULT 'INR',
    [trialDays] INT NOT NULL CONSTRAINT [ProductPlans_trialDays_df] DEFAULT 14,
    [isActive] BIT NOT NULL CONSTRAINT [ProductPlans_isActive_df] DEFAULT 1,
    [maxSeats] INT,
    [features] NVARCHAR(max) NOT NULL,
    [limits] NVARCHAR(max) NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [ProductPlans_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ProductPlans_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ProductPlans_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ProductPlans_productId_slug_key] UNIQUE NONCLUSTERED ([productId],[slug])
);

-- CreateTable
CREATE TABLE [platform].[Subscriptions] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [productId] UNIQUEIDENTIFIER NOT NULL,
    [planId] UNIQUEIDENTIFIER NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Subscriptions_status_df] DEFAULT 'TRIALING',
    [seatCount] INT NOT NULL CONSTRAINT [Subscriptions_seatCount_df] DEFAULT 1,
    [billingCycle] NVARCHAR(20) NOT NULL CONSTRAINT [Subscriptions_billingCycle_df] DEFAULT 'MONTHLY',
    [trialStartsAt] DATETIME2,
    [trialEndsAt] DATETIME2,
    [currentPeriodStart] DATETIME2 NOT NULL,
    [currentPeriodEnd] DATETIME2 NOT NULL,
    [cancelAtPeriodEnd] BIT NOT NULL CONSTRAINT [Subscriptions_cancelAtPeriodEnd_df] DEFAULT 0,
    [cancelledAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Subscriptions_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Subscriptions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Subscriptions_organizationId_productId_key] UNIQUE NONCLUSTERED ([organizationId],[productId])
);

-- CreateTable
CREATE TABLE [platform].[Notifications] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [type] NVARCHAR(100) NOT NULL,
    [title] NVARCHAR(255) NOT NULL,
    [body] NVARCHAR(1000) NOT NULL,
    [actionUrl] NVARCHAR(500),
    [isRead] BIT NOT NULL CONSTRAINT [Notifications_isRead_df] DEFAULT 0,
    [readAt] DATETIME2,
    [channel] NVARCHAR(20) NOT NULL CONSTRAINT [Notifications_channel_df] DEFAULT 'IN_APP',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Notifications_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Notifications_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [audit].[AuditLogs] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [actorId] UNIQUEIDENTIFIER,
    [actorType] NVARCHAR(50) NOT NULL,
    [actorEmail] NVARCHAR(255),
    [action] NVARCHAR(200) NOT NULL,
    [resource] NVARCHAR(100) NOT NULL,
    [resourceId] NVARCHAR(255),
    [ipAddress] NVARCHAR(45),
    [userAgent] NVARCHAR(500),
    [before] NVARCHAR(max),
    [after] NVARCHAR(max),
    [severity] NVARCHAR(20) NOT NULL CONSTRAINT [AuditLogs_severity_df] DEFAULT 'INFO',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditLogs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLogs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [developer].[ApiKeys] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [keyHash] NVARCHAR(255) NOT NULL,
    [keyPrefix] NVARCHAR(10) NOT NULL,
    [scopes] NVARCHAR(max) NOT NULL,
    [lastUsedAt] DATETIME2,
    [expiresAt] DATETIME2,
    [isActive] BIT NOT NULL CONSTRAINT [ApiKeys_isActive_df] DEFAULT 1,
    [createdById] UNIQUEIDENTIFIER NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ApiKeys_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ApiKeys_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ApiKeys_keyHash_key] UNIQUE NONCLUSTERED ([keyHash])
);

-- CreateTable
CREATE TABLE [developer].[Webhooks] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [url] NVARCHAR(500) NOT NULL,
    [secret] NVARCHAR(255) NOT NULL,
    [events] NVARCHAR(max) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [Webhooks_isActive_df] DEFAULT 1,
    [lastTriggeredAt] DATETIME2,
    [failureCount] INT NOT NULL CONSTRAINT [Webhooks_failureCount_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Webhooks_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Webhooks_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [developer].[WebhookDeliveries] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [webhookId] UNIQUEIDENTIFIER NOT NULL,
    [eventType] NVARCHAR(100) NOT NULL,
    [payload] NVARCHAR(max) NOT NULL,
    [statusCode] INT,
    [response] NVARCHAR(2000),
    [attempt] INT NOT NULL CONSTRAINT [WebhookDeliveries_attempt_df] DEFAULT 1,
    [success] BIT NOT NULL CONSTRAINT [WebhookDeliveries_success_df] DEFAULT 0,
    [deliveredAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [WebhookDeliveries_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WebhookDeliveries_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [files].[Files] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [uploadedById] UNIQUEIDENTIFIER NOT NULL,
    [filename] NVARCHAR(255) NOT NULL,
    [originalName] NVARCHAR(255) NOT NULL,
    [mimeType] NVARCHAR(100) NOT NULL,
    [sizeBytes] BIGINT NOT NULL,
    [blobUrl] NVARCHAR(500) NOT NULL,
    [cdnUrl] NVARCHAR(500),
    [folder] NVARCHAR(255),
    [isPublic] BIT NOT NULL CONSTRAINT [Files_isPublic_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Files_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [deletedAt] DATETIME2,
    CONSTRAINT [Files_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [platform].[OrgMemberships] ADD CONSTRAINT [OrgMemberships_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [platform].[Users]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [platform].[OrgMemberships] ADD CONSTRAINT [OrgMemberships_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [platform].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [platform].[OrgMemberships] ADD CONSTRAINT [OrgMemberships_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [platform].[Roles]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [platform].[OrgInvites] ADD CONSTRAINT [OrgInvites_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [platform].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [platform].[OrgInvites] ADD CONSTRAINT [OrgInvites_invitedById_fkey] FOREIGN KEY ([invitedById]) REFERENCES [platform].[Users]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [platform].[Sessions] ADD CONSTRAINT [Sessions_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [platform].[Users]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [platform].[EmailVerifications] ADD CONSTRAINT [EmailVerifications_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [platform].[Users]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [platform].[PasswordResets] ADD CONSTRAINT [PasswordResets_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [platform].[Users]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [platform].[RolePermissions] ADD CONSTRAINT [RolePermissions_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [platform].[Roles]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [platform].[RolePermissions] ADD CONSTRAINT [RolePermissions_permissionId_fkey] FOREIGN KEY ([permissionId]) REFERENCES [platform].[Permissions]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [platform].[ProductPlans] ADD CONSTRAINT [ProductPlans_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [platform].[Products]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [platform].[Subscriptions] ADD CONSTRAINT [Subscriptions_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [platform].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [platform].[Subscriptions] ADD CONSTRAINT [Subscriptions_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [platform].[Products]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [platform].[Subscriptions] ADD CONSTRAINT [Subscriptions_planId_fkey] FOREIGN KEY ([planId]) REFERENCES [platform].[ProductPlans]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [platform].[Notifications] ADD CONSTRAINT [Notifications_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [platform].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [platform].[Notifications] ADD CONSTRAINT [Notifications_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [platform].[Users]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [audit].[AuditLogs] ADD CONSTRAINT [AuditLogs_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [platform].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [developer].[ApiKeys] ADD CONSTRAINT [ApiKeys_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [platform].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [developer].[Webhooks] ADD CONSTRAINT [Webhooks_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [platform].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [developer].[WebhookDeliveries] ADD CONSTRAINT [WebhookDeliveries_webhookId_fkey] FOREIGN KEY ([webhookId]) REFERENCES [developer].[Webhooks]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [files].[Files] ADD CONSTRAINT [Files_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [platform].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
