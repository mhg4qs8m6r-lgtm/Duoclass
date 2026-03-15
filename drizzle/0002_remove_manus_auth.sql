-- Migration: Remove Manus OAuth dependency, switch to standalone email+password auth
-- This migration assumes a clean database (no existing users to migrate)

-- Drop the openId column and its unique constraint
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_openId_unique";
ALTER TABLE "users" DROP COLUMN IF EXISTS "openId";

-- Make email required and unique
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE ("email");

-- Make passwordHash required
ALTER TABLE "users" ALTER COLUMN "passwordHash" SET NOT NULL;
