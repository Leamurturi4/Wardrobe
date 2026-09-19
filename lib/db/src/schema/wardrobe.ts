import { pgTable, text, jsonb, timestamp, integer, primaryKey } from "drizzle-orm/pg-core";
import type { WardrobeData, OutfitData, StyleProfileData } from "@workspace/api-zod";
const timestamps = () => ({ createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow() });
export const wardrobeItems = pgTable("wardrobe_items", { id: text("id").primaryKey(), data: jsonb("data").$type<WardrobeData>().notNull(), ...timestamps() });
export const savedOutfits = pgTable("saved_outfits", { id: text("id").primaryKey(), data: jsonb("data").$type<Omit<OutfitData, "items">>().notNull(), ...timestamps() });
export const outfitItems = pgTable("outfit_items", {
  outfitId: text("outfit_id").notNull().references(() => savedOutfits.id, { onDelete: "cascade" }),
  itemId: text("item_id").notNull().references(() => wardrobeItems.id, { onDelete: "restrict" }),
  role: text("role"), position: integer("position").notNull(),
}, t => [primaryKey({ columns: [t.outfitId, t.itemId] })]);
export const styleProfiles = pgTable("style_profiles", { id: text("id").primaryKey(), data: jsonb("data").$type<StyleProfileData>().notNull(), ...timestamps() });
