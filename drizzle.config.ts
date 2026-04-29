import { defineConfig } from "drizzle-kit";
import path from "path";

const dbPath = process.env.SQLITE_PATH ?? path.resolve("./duoclass.db");

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations-sqlite",
  dialect: "sqlite",
  dbCredentials: {
    url: dbPath,
  },
});
