BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [platform].[Organizations] ADD [dateFormat] NVARCHAR(20) NOT NULL CONSTRAINT [Organizations_dateFormat_df] DEFAULT 'DD/MM/YYYY',
[language] NVARCHAR(10) NOT NULL CONSTRAINT [Organizations_language_df] DEFAULT 'en';

-- AlterTable
ALTER TABLE [platform].[OrgInvites] ADD [message] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [platform].[Branches] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [code] NVARCHAR(50),
    [address] NVARCHAR(500),
    [city] NVARCHAR(100),
    [state] NVARCHAR(100),
    [country] NVARCHAR(100),
    [pincode] NVARCHAR(20),
    [phone] NVARCHAR(20),
    [isHeadOffice] BIT NOT NULL CONSTRAINT [Branches_isHeadOffice_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Branches_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [deletedAt] DATETIME2,
    CONSTRAINT [Branches_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [platform].[Departments] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [code] NVARCHAR(50),
    [parentId] UNIQUEIDENTIFIER,
    [headUserId] UNIQUEIDENTIFIER,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Departments_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [deletedAt] DATETIME2,
    CONSTRAINT [Departments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [platform].[Teams] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Teams_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [deletedAt] DATETIME2,
    CONSTRAINT [Teams_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [platform].[TeamMembers] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [teamId] UNIQUEIDENTIFIER NOT NULL,
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [role] NVARCHAR(20) NOT NULL CONSTRAINT [TeamMembers_role_df] DEFAULT 'MEMBER',
    [joinedAt] DATETIME2 NOT NULL CONSTRAINT [TeamMembers_joinedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TeamMembers_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TeamMembers_teamId_userId_key] UNIQUE NONCLUSTERED ([teamId],[userId])
);

-- AddForeignKey
ALTER TABLE [platform].[Branches] ADD CONSTRAINT [Branches_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [platform].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [platform].[Departments] ADD CONSTRAINT [Departments_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [platform].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [platform].[Departments] ADD CONSTRAINT [Departments_parentId_fkey] FOREIGN KEY ([parentId]) REFERENCES [platform].[Departments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [platform].[Teams] ADD CONSTRAINT [Teams_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [platform].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [platform].[TeamMembers] ADD CONSTRAINT [TeamMembers_teamId_fkey] FOREIGN KEY ([teamId]) REFERENCES [platform].[Teams]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [platform].[TeamMembers] ADD CONSTRAINT [TeamMembers_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [platform].[Users]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
