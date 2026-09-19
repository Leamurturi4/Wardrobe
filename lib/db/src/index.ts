import { drizzle as postgresDrizzle } from "drizzle-orm/node-postgres";
import { drizzle as embeddedDrizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import * as schema from "./schema";
export function createDatabase(connectionString?: string, dataDir?: string) {
  if (connectionString) {
    const pool = new pg.Pool({ connectionString });
    return { db: postgresDrizzle(pool, { schema }), close: () => pool.end() };
  }
  if (!dataDir) throw new Error("Set DATABASE_URL or explicitly set PGLITE_DATA_DIR for local development.");
  const client = new PGlite(dataDir);
  return { db: embeddedDrizzle(client, { schema }), close: () => client.close() };
}
export type Database = ReturnType<typeof createDatabase>["db"];
export * from "./schema";
export { migrate } from "./migrate";
export { seedDemo } from "./seed";
