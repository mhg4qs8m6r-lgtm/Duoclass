CREATE TABLE IF NOT EXISTS "sharedModeles" (
  "id" serial PRIMARY KEY NOT NULL,
  "category" varchar(64) NOT NULL,
  "filename" varchar(255) NOT NULL,
  "imageData" text NOT NULL,
  "uploadedBy" integer NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
