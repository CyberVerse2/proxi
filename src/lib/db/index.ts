import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

let _db: PostgresJsDatabase<typeof schema> | null = null;

export function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const sql = postgres(url, {
      prepare: false, // Required for serverless / worker environments (Trigger.dev, etc.)
      max: 5,
      idle_timeout: 20,
    });
    _db = drizzle(sql, { schema });
  }
  return _db;
}

// Keep a convenience export that lazily initializes
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
