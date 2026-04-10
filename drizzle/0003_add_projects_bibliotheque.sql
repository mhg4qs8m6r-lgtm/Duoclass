CREATE TABLE IF NOT EXISTS "projects" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "localId" varchar(64) NOT NULL,
  "name" varchar(255) NOT NULL,
  "canvasElements" text,
  "canvasData" text,
  "photos" text,
  "canvasFormat" varchar(64),
  "canvasFormatWidth" integer,
  "canvasFormatHeight" integer,
  "thumbnail" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "syncTimestamp" bigint
);

CREATE TABLE IF NOT EXISTS "bibliothequeItems" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "localId" varchar(64) NOT NULL,
  "category" varchar(64) NOT NULL,
  "type" varchar(64),
  "name" varchar(255) NOT NULL,
  "url" text,
  "thumbnail" text,
  "fullImage" text,
  "sourcePhotoId" varchar(64),
  "addedAt" bigint,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "syncTimestamp" bigint
);
