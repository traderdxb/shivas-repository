CREATE TYPE "asset_type" AS ENUM ('equity', 'etf', 'cash', 'savings');
CREATE TYPE "trade_type" AS ENUM ('buy', 'sell', 'dividend', 'interest', 'transfer', 'fee');
CREATE TYPE "sync_status" AS ENUM ('pending', 'running', 'success', 'failed');
CREATE TYPE "notification_channel" AS ENUM ('email', 'sms', 'push', 'in_app');
CREATE TYPE "performance_window" AS ENUM ('1d', '1w', '1m', '3m', '6m', '1y', '3y', '5y', '10y', 'since_inception');
CREATE TYPE "connection_status" AS ENUM ('pending', 'linked', 'revoked', 'error');

ALTER TABLE "User" ADD COLUMN "displayName" varchar(128);
ALTER TABLE "User" ADD COLUMN "mfaEnabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "User" ADD COLUMN "mfaSecretHash" varchar(255);
ALTER TABLE "User" ADD COLUMN "lastLoginAt" timestamptz;

CREATE TABLE "InstitutionConnection" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id") ON DELETE cascade,
  "provider" varchar(64) NOT NULL,
  "scope" jsonb,
  "accessToken" text,
  "refreshToken" text,
  "status" "connection_status" DEFAULT 'pending' NOT NULL,
  "lastSyncedAt" timestamptz,
  "metadata" jsonb,
  "createdAt" timestamptz DEFAULT now() NOT NULL,
  "updatedAt" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "FinancialAccount" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id") ON DELETE cascade,
  "connectionId" uuid REFERENCES "InstitutionConnection"("id") ON DELETE set null,
  "name" varchar(128) NOT NULL,
  "institutionName" varchar(128),
  "accountNumberMask" varchar(8),
  "type" "asset_type" NOT NULL,
  "currency" varchar(3) DEFAULT 'USD' NOT NULL,
  "balance" numeric(24, 4) DEFAULT 0,
  "createdAt" timestamptz DEFAULT now() NOT NULL,
  "updatedAt" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "HoldingSnapshot" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id") ON DELETE cascade,
  "accountId" uuid NOT NULL REFERENCES "FinancialAccount"("id") ON DELETE cascade,
  "assetId" varchar(128) NOT NULL,
  "assetType" "asset_type" NOT NULL,
  "units" numeric(30, 8) NOT NULL,
  "costBasis" numeric(30, 6),
  "marketValue" numeric(30, 6),
  "currency" varchar(3) DEFAULT 'USD' NOT NULL,
  "asOfDate" timestamptz NOT NULL,
  "metadata" jsonb,
  "createdAt" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "HoldingSnapshot_userId_asOfDate_idx"
  ON "HoldingSnapshot" ("userId", "asOfDate", "assetId");
CREATE UNIQUE INDEX "HoldingSnapshot_account_asset_idx"
  ON "HoldingSnapshot" ("accountId", "assetId", "asOfDate");

CREATE TABLE "Transaction" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "accountId" uuid NOT NULL REFERENCES "FinancialAccount"("id") ON DELETE cascade,
  "assetId" varchar(128),
  "assetType" "asset_type" NOT NULL,
  "tradeType" "trade_type" NOT NULL,
  "quantity" numeric(30, 8) NOT NULL,
  "amount" numeric(30, 6) NOT NULL,
  "currency" varchar(3) DEFAULT 'USD' NOT NULL,
  "executedAt" timestamptz NOT NULL,
  "metadata" jsonb,
  "createdAt" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "ManualAsset" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id") ON DELETE cascade,
  "name" varchar(128) NOT NULL,
  "category" varchar(64),
  "valuation" numeric(30, 6) NOT NULL,
  "currency" varchar(3) DEFAULT 'USD' NOT NULL,
  "metadata" jsonb,
  "notes" text,
  "valuedAt" timestamptz DEFAULT now() NOT NULL,
  "createdAt" timestamptz DEFAULT now() NOT NULL,
  "updatedAt" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "PerformanceMetric" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id") ON DELETE cascade,
  "accountId" uuid REFERENCES "FinancialAccount"("id") ON DELETE set null,
  "window" "performance_window" NOT NULL,
  "periodStart" timestamptz NOT NULL,
  "periodEnd" timestamptz NOT NULL,
  "absoluteReturn" numeric(30, 6) NOT NULL,
  "relativeReturnPct" numeric(10, 6) NOT NULL,
  "volatility" numeric(10, 6),
  "sharpe" numeric(10, 6),
  "createdAt" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "PerformanceMetric_user_window_idx"
  ON "PerformanceMetric" ("userId", "window");
CREATE INDEX "PerformanceMetric_account_window_idx"
  ON "PerformanceMetric" ("accountId", "window");

CREATE TABLE "SyncJob" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "connectionId" uuid NOT NULL REFERENCES "InstitutionConnection"("id") ON DELETE cascade,
  "status" "sync_status" DEFAULT 'pending' NOT NULL,
  "error" text,
  "metadata" jsonb,
  "startedAt" timestamptz DEFAULT now() NOT NULL,
  "endedAt" timestamptz
);
CREATE INDEX "SyncJob_connection_idx" ON "SyncJob" ("connectionId");
CREATE INDEX "SyncJob_status_pending_idx" ON "SyncJob" ("status") WHERE "status" = 'pending';
CREATE INDEX "SyncJob_status_running_idx" ON "SyncJob" ("status") WHERE "status" = 'running';

CREATE TABLE "Notification" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id") ON DELETE cascade,
  "channel" "notification_channel" NOT NULL,
  "payload" jsonb NOT NULL,
  "readAt" timestamptz,
  "createdAt" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "Notification_user_channel_idx"
  ON "Notification" ("userId", "channel");
