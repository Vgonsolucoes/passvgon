-- Migration 0002_cofre_core
-- PassVGON — Cofre de Senhas de TI por Cliente
-- Estratégia: NÃO DESTRUTIVA. Tabelas existentes users/accounts/sessions/verification_tokens/audit_logs
--   são preservadas e recebem apenas colunas novas com DEFAULTs seguros.
-- Todas as tabelas novas (clients, credentials, assets complementares, vínculos, memberships, etc.)
--   são criadas com IF NOT EXISTS para idempotência em reexecuções.

-- ============== ENUMS ==============

DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER', 'OPERATOR', 'AUDITOR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "TokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'TWO_FACTOR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "MembershipPermission" AS ENUM (
        'VIEW_METADATA',
        'REVEAL_SECRET',
        'COPY_SECRET',
        'CREATE_CREDENTIAL',
        'EDIT_CREDENTIAL',
        'DELETE_CREDENTIAL',
        'MANAGE_ACCESS',
        'AUDIT_VIEW'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "AuditResult" AS ENUM ('SUCCESS', 'DENIED', 'FAILED', 'PENDING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "CredentialCategory" AS ENUM (
        'M365_TENANT',
        'WINDOWS_SERVER_AD',
        'REMOTE_ACCESS_RDP',
        'FIREWALL_VPN',
        'SWITCH_WIFI',
        'PRINTER',
        'NAS_BACKUP',
        'DATABASE',
        'SYSTEM_PORTAL',
        'OTHER'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DECOMMISSIONED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============== COLUNAS NOVAS EM TABELAS EXISTENTES (migração segura, só ADD se não existir) ==============

-- users: passwordAlgo + 2FA aprimorado

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordAlgo" TEXT NOT NULL DEFAULT 'bcrypt';

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorSecretEnc" TEXT;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorBackupCodes" TEXT;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorLastTotp" TEXT;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastTwoFactorAttemptAt" TIMESTAMP(3);

-- sessions: controle 2FA

ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "twoFactorVerified" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "twoFactorRequired" BOOLEAN NOT NULL DEFAULT FALSE;

-- audit_logs: cliente + credencial + resultado + metadata

ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "clientId" TEXT;

ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "credentialId" TEXT;

ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "result" "AuditResult" NOT NULL DEFAULT 'SUCCESS';

ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

DO $$ BEGIN
    ALTER TABLE "audit_logs"
        ADD CONSTRAINT "audit_logs_clientId_fkey"
        FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "audit_logs"
        ADD CONSTRAINT "audit_logs_credentialId_fkey"
        FOREIGN KEY ("credentialId") REFERENCES "credentials"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;

-- ============== NOVA TABELA: clients (multi-tenant) ==============

CREATE TABLE IF NOT EXISTS "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "document" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "clients_slug_key" ON "clients"("slug");
CREATE INDEX IF NOT EXISTS "clients_status_idx" ON "clients"("status");
CREATE INDEX IF NOT EXISTS "clients_name_idx" ON "clients"("name");

-- ============== NOVA TABELA: client_memberships ==============

CREATE TABLE IF NOT EXISTS "client_memberships" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissions" "MembershipPermission"[] NOT NULL DEFAULT ARRAY[]::"MembershipPermission"[],
    "isPrimary" BOOLEAN NOT NULL DEFAULT FALSE,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "client_memberships_clientId_userId_key"
    ON "client_memberships"("clientId", "userId");
CREATE INDEX IF NOT EXISTS "client_memberships_userId_idx" ON "client_memberships"("userId");

DO $$ BEGIN
    ALTER TABLE "client_memberships"
        ADD CONSTRAINT "client_memberships_clientId_fkey"
        FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "client_memberships"
        ADD CONSTRAINT "client_memberships_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============== NOVA TABELA: credentials (ENTIDADE PRINCIPAL DO COFRE) ==============

CREATE TABLE IF NOT EXISTS "credentials" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "CredentialCategory" NOT NULL,
    "username" TEXT,
    "passwordEncrypted" TEXT,
    "passwordIv" TEXT,
    "passwordAlgo" TEXT NOT NULL DEFAULT 'aes-256-gcm',
    "url" TEXT,
    "hostname" TEXT,
    "domain" TEXT,
    "tenantId" TEXT,
    "unit" TEXT,
    "environment" TEXT,
    "owner" TEXT,
    "notesEncrypted" TEXT,
    "expiresAt" TIMESTAMP(3),
    "authorId" TEXT,
    "updaterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "credentials_clientId_idx" ON "credentials"("clientId");
CREATE INDEX IF NOT EXISTS "credentials_category_idx" ON "credentials"("category");
CREATE INDEX IF NOT EXISTS "credentials_clientId_category_idx" ON "credentials"("clientId", "category");
CREATE INDEX IF NOT EXISTS "credentials_clientId_username_idx" ON "credentials"("clientId", "username");
CREATE INDEX IF NOT EXISTS "credentials_createdAt_idx" ON "credentials"("createdAt");
CREATE INDEX IF NOT EXISTS "credentials_updatedAt_idx" ON "credentials"("updatedAt");
CREATE INDEX IF NOT EXISTS "credentials_expiresAt_idx" ON "credentials"("expiresAt");

DO $$ BEGIN
    ALTER TABLE "credentials"
        ADD CONSTRAINT "credentials_clientId_fkey"
        FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "credentials"
        ADD CONSTRAINT "credentials_authorId_fkey"
        FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "credentials"
        ADD CONSTRAINT "credentials_updaterId_fkey"
        FOREIGN KEY ("updaterId") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============== NOVA TABELA: credential_tags ==============

CREATE TABLE IF NOT EXISTS "credential_tags" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "credential_tags_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "credential_tags_clientId_name_key" ON "credential_tags"("clientId", "name");

-- tabela de ligação N:M Credential <-> Tag (via array Postgres: campo virtual no Prisma via join tabela _CredentialTags se necessário;
-- para simplificar o modelo Prisma, vamos usar um array de tag IDs em JSON ou tabela associativa.
-- Como o schema Prisma acima declarou `tags CredentialTag[]` sem tabela associativa, precisamos
-- declarar uma tabela associativa _CredentialToCredentialTag.)

CREATE TABLE IF NOT EXISTS "_CredentialToCredentialTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "_CredentialToCredentialTag_AB_unique" ON "_CredentialToCredentialTag"("A","B");
CREATE INDEX IF NOT EXISTS "_CredentialToCredentialTag_B_index" ON "_CredentialToCredentialTag"("B");

DO $$ BEGIN
    ALTER TABLE "_CredentialToCredentialTag"
        ADD CONSTRAINT "_CredentialToCredentialTag_A_fkey"
        FOREIGN KEY ("A") REFERENCES "credentials"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "_CredentialToCredentialTag"
        ADD CONSTRAINT "_CredentialToCredentialTag_B_fkey"
        FOREIGN KEY ("B") REFERENCES "credential_tags"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============== NOVA TABELA: microsoft_tenants ==============

CREATE TABLE IF NOT EXISTS "microsoft_tenants" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "defaultDomain" TEXT,
    "adminPortalUrl" TEXT DEFAULT 'https://admin.microsoft.com',
    "notes" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "microsoft_tenants_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "microsoft_tenants_clientId_idx" ON "microsoft_tenants"("clientId");
CREATE UNIQUE INDEX IF NOT EXISTS "microsoft_tenants_clientId_tenantId_key"
    ON "microsoft_tenants"("clientId", "tenantId");

DO $$ BEGIN
    ALTER TABLE "microsoft_tenants"
        ADD CONSTRAINT "microsoft_tenants_clientId_fkey"
        FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============== NOVA TABELA: servers ==============

CREATE TABLE IF NOT EXISTS "servers" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hostname" TEXT,
    "ipAddress" TEXT,
    "os" TEXT,
    "role" TEXT,
    "location" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "servers_clientId_idx" ON "servers"("clientId");
CREATE INDEX IF NOT EXISTS "servers_status_idx" ON "servers"("status");

DO $$ BEGIN
    ALTER TABLE "servers"
        ADD CONSTRAINT "servers_clientId_fkey"
        FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============== NOVA TABELA: printers ==============

CREATE TABLE IF NOT EXISTS "printers" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "ipAddress" TEXT,
    "adminPanel" TEXT,
    "location" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "printers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "printers_clientId_idx" ON "printers"("clientId");

DO $$ BEGIN
    ALTER TABLE "printers"
        ADD CONSTRAINT "printers_clientId_fkey"
        FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============== NOVA TABELA: networks ==============

CREATE TABLE IF NOT EXISTS "networks" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vlan" INTEGER,
    "cidr" TEXT,
    "gateway" TEXT,
    "dnsServers" TEXT,
    "location" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "networks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "networks_clientId_idx" ON "networks"("clientId");

DO $$ BEGIN
    ALTER TABLE "networks"
        ADD CONSTRAINT "networks_clientId_fkey"
        FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============== NOVA TABELA: documents ==============

CREATE TABLE IF NOT EXISTS "documents" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT,
    "fileName" TEXT,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "storageRef" TEXT,
    "notes" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "serverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "documents_clientId_idx" ON "documents"("clientId");
CREATE INDEX IF NOT EXISTS "documents_type_idx" ON "documents"("type");

DO $$ BEGIN
    ALTER TABLE "documents"
        ADD CONSTRAINT "documents_clientId_fkey"
        FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "documents"
        ADD CONSTRAINT "documents_serverId_fkey"
        FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============== NOVA TABELA: diagrams ==============

CREATE TABLE IF NOT EXISTS "diagrams" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "layout" JSONB,
    "options" JSONB,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagrams_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "diagrams_clientId_idx" ON "diagrams"("clientId");

DO $$ BEGIN
    ALTER TABLE "diagrams"
        ADD CONSTRAINT "diagrams_clientId_fkey"
        FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============== TABELAS DE VÍNCULOS N:M Credential x Assets complementares ==============

CREATE TABLE IF NOT EXISTS "credential_servers" (
    "credentialId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credential_servers_pkey" PRIMARY KEY ("credentialId","serverId")
);
DO $$ BEGIN
    ALTER TABLE "credential_servers"
        ADD CONSTRAINT "credential_servers_credentialId_fkey"
        FOREIGN KEY ("credentialId") REFERENCES "credentials"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "credential_servers"
        ADD CONSTRAINT "credential_servers_serverId_fkey"
        FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "credential_printers" (
    "credentialId" TEXT NOT NULL,
    "printerId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credential_printers_pkey" PRIMARY KEY ("credentialId","printerId")
);
DO $$ BEGIN
    ALTER TABLE "credential_printers"
        ADD CONSTRAINT "credential_printers_credentialId_fkey"
        FOREIGN KEY ("credentialId") REFERENCES "credentials"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "credential_printers"
        ADD CONSTRAINT "credential_printers_printerId_fkey"
        FOREIGN KEY ("printerId") REFERENCES "printers"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "credential_networks" (
    "credentialId" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credential_networks_pkey" PRIMARY KEY ("credentialId","networkId")
);
DO $$ BEGIN
    ALTER TABLE "credential_networks"
        ADD CONSTRAINT "credential_networks_credentialId_fkey"
        FOREIGN KEY ("credentialId") REFERENCES "credentials"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "credential_networks"
        ADD CONSTRAINT "credential_networks_networkId_fkey"
        FOREIGN KEY ("networkId") REFERENCES "networks"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "credential_documents" (
    "credentialId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credential_documents_pkey" PRIMARY KEY ("credentialId","documentId")
);
DO $$ BEGIN
    ALTER TABLE "credential_documents"
        ADD CONSTRAINT "credential_documents_credentialId_fkey"
        FOREIGN KEY ("credentialId") REFERENCES "credentials"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "credential_documents"
        ADD CONSTRAINT "credential_documents_documentId_fkey"
        FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============== ÍNDICES EXISTENTES EM audit_logs (garantir que existem se a 0001_init não criou) ==============

CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType","entityId");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "audit_logs_clientId_idx" ON "audit_logs"("clientId");
CREATE INDEX IF NOT EXISTS "audit_logs_credentialId_idx" ON "audit_logs"("credentialId");
CREATE INDEX IF NOT EXISTS "audit_logs_result_idx" ON "audit_logs"("result");

-- FIM migration 0002_cofre_core
