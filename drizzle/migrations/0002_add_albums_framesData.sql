ALTER TABLE "albums" ADD COLUMN IF NOT EXISTS "framesData" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "collecteurData" text;
