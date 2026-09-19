import { readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import type { Database } from "./index";
export async function migrate(db: Database, migrationFile: string) {
  const migration = await readFile(migrationFile, "utf8");
  await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(438201)`);
    await tx.execute(sql`CREATE TABLE IF NOT EXISTS closet_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
    const applied = await tx.execute(sql`SELECT version FROM closet_migrations WHERE version = '0001_wardrobe'`);
    if (applied.rows.length) return;
    for (const statement of migration.split(";").map(s => s.trim()).filter(Boolean)) await tx.execute(sql.raw(statement));
    await tx.execute(sql`INSERT INTO closet_migrations(version) VALUES ('0001_wardrobe')`);
  });
}
