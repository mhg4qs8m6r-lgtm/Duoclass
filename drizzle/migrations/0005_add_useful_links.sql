CREATE TABLE IF NOT EXISTS "usefulLinks" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "url" text NOT NULL,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "ordre" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
