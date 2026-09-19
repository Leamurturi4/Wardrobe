import { sql } from "drizzle-orm";
import { wardrobeInputSchema, outfitInputSchema, styleProfileInputSchema } from "@workspace/api-zod";
import { wardrobeItems, savedOutfits, outfitItems, styleProfiles } from "./schema";
import type { Database } from "./index";
import { demoItems, demoOutfits } from "./demo-data";
export async function seedDemo(db: Database) {
  await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(438201)`);
    const applied = await tx.execute(sql`SELECT version FROM closet_migrations WHERE version = 'demo_v1'`);
    if (applied.rows.length) return;
    for (const { id, ...input } of demoItems) await tx.insert(wardrobeItems).values({ id, data: wardrobeInputSchema.parse(input) }).onConflictDoNothing();
    for (const { id, ...input } of demoOutfits) {
      const { items, ...data } = outfitInputSchema.parse(input);
      const added = await tx.insert(savedOutfits).values({ id, data }).onConflictDoNothing().returning();
      if (added.length) await tx.insert(outfitItems).values(items.map((i, position) => ({ ...i, outfitId: id, position })));
    }
    await tx.insert(styleProfiles).values({ id: "local", data: styleProfileInputSchema.parse({
      aestheticTags: ["Minimalist", "Quiet Luxury", "Parisian Chic"],
      preferredColors: ["#E6E6E4", "#A39E93", "#2C2A29", "#1A1A1A", "#8B7355"],
      preferredBrands: ["The Row", "Khaite", "Lemaire", "Toteme", "Jil Sander"],
      recentInspirations: [{ id: "1", image: "/images/moodboard-parisian.png", source: "Editorial" }, { id: "2", image: "/images/wool-coat.png", source: "Runway" }],
    }) }).onConflictDoNothing();
    await tx.execute(sql`INSERT INTO closet_migrations(version) VALUES ('demo_v1')`);
  });
}
