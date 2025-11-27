CREATE TABLE IF NOT EXISTS "InstitutionConnection" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"accessToken" text,
	"itemId" text,
	"institutionName" text,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"lastSyncedAt" timestamp,
	"lastAttemptAt" timestamp,
	"cursor" text,
	"errorMessage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "InstitutionConnection_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "InstitutionConnection" ADD CONSTRAINT "InstitutionConnection_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Account" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"connectionId" uuid NOT NULL,
	"providerAccountId" varchar(128) NOT NULL,
	"name" text NOT NULL,
	"officialName" text,
	"mask" varchar(16),
	"type" varchar(64),
	"subtype" varchar(64),
	"currency" varchar(8) DEFAULT 'USD',
	"availableBalance" double precision,
	"currentBalance" double precision,
	"institutionValue" double precision,
	"lastSyncedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Account_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "Account_providerAccount_unique" ON "Account" ("connectionId","providerAccountId");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Account" ADD CONSTRAINT "Account_connectionId_InstitutionConnection_id_fk" FOREIGN KEY ("connectionId") REFERENCES "public"."InstitutionConnection"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "HoldingSnapshot" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"accountId" uuid NOT NULL,
	"capturedAt" timestamp NOT NULL,
	"securityId" text,
	"symbol" varchar(32),
	"name" text,
	"quantity" double precision,
	"price" double precision,
	"value" double precision,
	"costBasis" double precision,
	"metadata" jsonb,
	CONSTRAINT "HoldingSnapshot_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "HoldingSnapshot" ADD CONSTRAINT "HoldingSnapshot_accountId_Account_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Transaction" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"accountId" uuid NOT NULL,
	"providerTransactionId" varchar(128) NOT NULL,
	"description" text NOT NULL,
	"amount" double precision NOT NULL,
	"category" varchar(128),
	"status" varchar(32) DEFAULT 'posted',
	"postedAt" timestamp NOT NULL,
	"pending" boolean DEFAULT false,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Transaction_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_provider_unique" ON "Transaction" ("accountId","providerTransactionId");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_Account_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ManualAsset" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"name" text NOT NULL,
	"category" varchar(64) DEFAULT 'Other' NOT NULL,
	"value" double precision NOT NULL,
	"notes" text,
	"lastValuationAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ManualAsset_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ManualAsset" ADD CONSTRAINT "ManualAsset_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SyncJob" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"connectionId" uuid NOT NULL,
	"status" varchar(32) NOT NULL,
	"startedAt" timestamp NOT NULL,
	"completedAt" timestamp,
	"errorMessage" text,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "SyncJob_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_connectionId_InstitutionConnection_id_fk" FOREIGN KEY ("connectionId") REFERENCES "public"."InstitutionConnection"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Notification" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"type" varchar(32) NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"metadata" jsonb,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Notification_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
