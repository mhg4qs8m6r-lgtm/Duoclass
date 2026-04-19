CREATE TABLE IF NOT EXISTS "projectVersions" (
  "id" serial PRIMARY KEY,
  "projectId" integer NOT NULL,
  "userId" integer NOT NULL,
  "localId" varchar(64) NOT NULL,
  "name" varchar(255),
  "canvasElements" text,
  "canvasData" text,
  "photos" text,
  "canvasFormat" varchar(64),
  "canvasFormatWidth" integer,
  "canvasFormatHeight" integer,
  "thumbnail" text,
  "projectType" varchar(64),
  "projectCategory" varchar(32),
  "collecteurData" text,
  "savedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX idx_project_versions_lookup ON "projectVersions" ("userId", "localId");
CREATE INDEX idx_project_versions_project ON "projectVersions" ("projectId");
