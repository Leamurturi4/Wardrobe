import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { wardrobeItems, savedOutfits, outfitItems, styleProfiles, type Database } from "@workspace/db";
import { wardrobeInputSchema, wardrobePatchSchema, wardrobeFilterSchema, outfitInputSchema, outfitPatchSchema,
  outfitFilterSchema, styleProfileInputSchema, styleProfilePatchSchema, type SavedOutfit } from "@workspace/api-zod";

export class DomainError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const required = <T>(value: T | undefined): T => {
  if (!value) throw new DomainError(404, "Record not found");
  return value;
};
const record = <T>(row: { id: string; data: T; createdAt: string; updatedAt: string }) => ({
  ...row.data, id: row.id, createdAt: new Date(row.createdAt).toISOString(), updatedAt: new Date(row.updatedAt).toISOString(),
});
const lower = (v: string) => v.toLocaleLowerCase();
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export function createWardrobeService(db: Database) {
  async function outfitRecord(row: typeof savedOutfits.$inferSelect, connection: Database | Transaction = db): Promise<SavedOutfit> {
    const members = await connection.select().from(outfitItems).where(eq(outfitItems.outfitId, row.id)).orderBy(asc(outfitItems.position));
    return { ...record(row), items: members.map(m => ({ itemId: m.itemId, ...(m.role ? { role: m.role } : {}) })) };
  }
  async function validateMembers(tx: Transaction, items: { itemId: string }[]) {
    // Lock in stable order so an archive cannot race a save, and concurrent saves cannot deadlock.
    for (const { itemId } of [...items].sort((a, b) => a.itemId.localeCompare(b.itemId))) {
      const [row] = await tx.select().from(wardrobeItems).where(eq(wardrobeItems.id, itemId)).for("update");
      if (!row || row.data.status === "archived") throw new DomainError(422, `Wardrobe item ${itemId} is missing or archived`);
    }
  }
  return {
    async listItems(query: unknown = {}) {
      const f = wardrobeFilterSchema.parse(query);
      const rows = await db.select().from(wardrobeItems).orderBy(asc(wardrobeItems.createdAt), asc(wardrobeItems.id));
      return rows.map(record).filter(i => (f.status === "all" || i.status === f.status)
        && (!f.category || i.category === f.category) && (f.favorite === undefined || i.favorite === f.favorite)
        && (!f.color || [i.primaryColor, ...i.secondaryColors].some(c => lower(c) === lower(f.color!)))
        && (!f.season || i.seasons.includes(f.season)) && (!f.style || i.styleTags.some(t => lower(t) === lower(f.style!)))
        && (!f.search || lower([i.name, i.description, i.brand, i.primaryColor, i.material, i.subcategory, ...i.styleTags].join(" ")).includes(lower(f.search))));
    },
    async getItem(id: string) {
      return record(required((await db.select().from(wardrobeItems).where(eq(wardrobeItems.id, id)))[0]));
    },
    async createItem(input: unknown) {
      const data = wardrobeInputSchema.parse(input);
      return record(required((await db.insert(wardrobeItems).values({ id: randomUUID(), data }).returning())[0]));
    },
    async updateItem(id: string, input: unknown) {
      const patch = wardrobePatchSchema.parse(input);
      return db.transaction(async tx => {
        const row = required((await tx.select().from(wardrobeItems).where(eq(wardrobeItems.id, id)).for("update"))[0]);
        const data = wardrobeInputSchema.parse({ ...row.data, ...patch });
        return record(required((await tx.update(wardrobeItems).set({ data, updatedAt: new Date().toISOString() }).where(eq(wardrobeItems.id, id)).returning())[0]));
      });
    },
    async archiveItem(id: string) { return this.updateItem(id, { status: "archived" }); },
    async toggleItemFavorite(id: string) {
      return db.transaction(async tx => {
        const row = required((await tx.select().from(wardrobeItems).where(eq(wardrobeItems.id, id)).for("update"))[0]);
        return record(required((await tx.update(wardrobeItems).set({ data: { ...row.data, favorite: !row.data.favorite }, updatedAt: new Date().toISOString() }).where(eq(wardrobeItems.id, id)).returning())[0]));
      });
    },
    async listOutfits(query: unknown = {}) {
      const f = outfitFilterSchema.parse(query);
      const rows = await db.select().from(savedOutfits).orderBy(asc(savedOutfits.createdAt), asc(savedOutfits.id));
      return Promise.all(rows.filter(r => (f.favorite === undefined || r.data.favorite === f.favorite)
        && (!f.season || r.data.season === f.season) && (!f.search || lower(`${r.data.name} ${r.data.occasion}`).includes(lower(f.search)))).map(r => outfitRecord(r)));
    },
    async getOutfit(id: string) { return outfitRecord(required((await db.select().from(savedOutfits).where(eq(savedOutfits.id, id)))[0])); },
    async createOutfit(input: unknown) {
      const { items, ...data } = outfitInputSchema.parse(input);
      return db.transaction(async tx => {
        await validateMembers(tx, items);
        const row = required((await tx.insert(savedOutfits).values({ id: randomUUID(), data }).returning())[0]);
        await tx.insert(outfitItems).values(items.map((i, position) => ({ ...i, outfitId: row.id, position })));
        return outfitRecord(row, tx);
      });
    },
    async updateOutfit(id: string, input: unknown) {
      const patch = outfitPatchSchema.parse(input);
      return db.transaction(async tx => {
        const row = required((await tx.select().from(savedOutfits).where(eq(savedOutfits.id, id)).for("update"))[0]);
        const existing = await outfitRecord(row, tx);
        const { items, ...data } = outfitInputSchema.parse({ ...row.data, items: existing.items, ...patch });
        if (patch.items) {
          await validateMembers(tx, items);
          await tx.delete(outfitItems).where(eq(outfitItems.outfitId, id));
          await tx.insert(outfitItems).values(items.map((i, position) => ({ ...i, outfitId: id, position })));
        }
        const updated = required((await tx.update(savedOutfits).set({ data, updatedAt: new Date().toISOString() }).where(eq(savedOutfits.id, id)).returning())[0]);
        return outfitRecord(updated, tx);
      });
    },
    async deleteOutfit(id: string) { required((await db.delete(savedOutfits).where(eq(savedOutfits.id, id)).returning())[0]); },
    async toggleOutfitFavorite(id: string) {
      return db.transaction(async tx => {
        const row = required((await tx.select().from(savedOutfits).where(eq(savedOutfits.id, id)).for("update"))[0]);
        const updated = required((await tx.update(savedOutfits).set({ data: { ...row.data, favorite: !row.data.favorite }, updatedAt: new Date().toISOString() }).where(eq(savedOutfits.id, id)).returning())[0]);
        return outfitRecord(updated, tx);
      });
    },
    async getProfile() {
      await db.insert(styleProfiles).values({ id: "local", data: styleProfileInputSchema.parse({}) }).onConflictDoNothing();
      return record(required((await db.select().from(styleProfiles).where(eq(styleProfiles.id, "local")))[0]));
    },
    async updateProfile(input: unknown) {
      const patch = styleProfilePatchSchema.parse(input);
      await this.getProfile();
      return db.transaction(async tx => {
        const row = required((await tx.select().from(styleProfiles).where(eq(styleProfiles.id, "local")).for("update"))[0]);
        const data = styleProfileInputSchema.parse({ ...row.data, ...patch });
        return record(required((await tx.update(styleProfiles).set({ data, updatedAt: new Date().toISOString() }).where(eq(styleProfiles.id, "local")).returning())[0]));
      });
    },
  };
}
export type WardrobeService = ReturnType<typeof createWardrobeService>;
