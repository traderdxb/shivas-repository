ALTER TABLE "User" ADD COLUMN "name" varchar(128);
ALTER TABLE "User" ADD COLUMN "image" text;
ALTER TABLE "User" ADD COLUMN "provider" varchar(32);
ALTER TABLE "User" ADD COLUMN "providerAccountId" varchar(128);
ALTER TABLE "User" ADD COLUMN "mfaEnabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "User" ADD COLUMN "mfaSecretHash" varchar(255);
