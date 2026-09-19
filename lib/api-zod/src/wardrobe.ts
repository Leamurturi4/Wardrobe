import { z } from "zod/v4";
export const categories = ["Tops", "Bottoms", "Outerwear", "Dresses", "Shoes", "Bags", "Accessories", "Jewelry"] as const;
export const seasons = ["Spring", "Summer", "Autumn", "Winter"] as const;
const text = z.string().trim().max(200);
const tags = z.array(text.min(1)).max(50);
const timestamp = z.iso.datetime();
const image = z.string().max(500).refine(v => /^\/(?!\/)/.test(v) || /^https?:\/\//.test(v), "Use a local image path or HTTP(S) URL");
const formality = z.enum(["Casual", "Smart Casual", "Formal", "Lounge"]);
// PATCH must not apply creation defaults to omitted fields.
function patchSchema<S extends Record<string, z.ZodType>>(schema: z.ZodObject<S>) {
  type Shape = { [K in keyof S]: z.ZodOptional<S[K] extends z.ZodDefault<infer Inner> ? Inner : S[K]> };
  const shape = Object.fromEntries(Object.entries(schema.shape).map(([key, value]) =>
    [key, z.optional(value instanceof z.ZodDefault ? value.removeDefault() : value)]));
  return z.object(shape as Shape).strict();
}
export const wardrobeInputSchema = z.object({
  name: text.min(1), description: z.string().max(5000).default(""), brand: text.default(""),
  category: z.enum(categories), subcategory: text.default(""), primaryColor: text.min(1), secondaryColors: tags.default([]),
  pattern: text.default(""), material: text.default(""), fit: text.default(""), size: text.default(""), styleTags: tags.default([]),
  formality: formality.nullable().default(null), seasons: z.array(z.enum(seasons)).default([]), occasions: tags.default([]),
  weatherSuitability: z.array(z.enum(["hot", "warm", "cool", "cold", "rain", "snow", "wind"])).default([]),
  originalImage: image, processedImage: image.nullable().default(null), thumbnail: image.nullable().default(null),
  favorite: z.boolean().default(false), status: z.enum(["active", "archived"]).default("active"),
  availability: z.enum(["available", "unavailable"]).default("available"), maintenanceState: z.enum(["clean", "laundry", "repair"]).default("clean"),
  wearCount: z.number().int().min(0).default(0), lastWornAt: timestamp.nullable().default(null),
  aiGeneratedTags: tags.default([]), aiConfidence: z.number().min(0).max(1).nullable().default(null),
  aiAnalysisVersion: text.nullable().default(null), userCorrectedFields: tags.default([]),
}).strict();
export const wardrobePatchSchema = patchSchema(wardrobeInputSchema);
export const wardrobeItemSchema = wardrobeInputSchema.extend({ id: text.min(1), createdAt: timestamp, updatedAt: timestamp });
export type WardrobeInput = z.input<typeof wardrobeInputSchema>;
export type WardrobeData = z.output<typeof wardrobeInputSchema>;
export type WardrobeItem = z.output<typeof wardrobeItemSchema>;
export const outfitInputSchema = z.object({
  name: text.min(1), description: z.string().max(5000).default(""),
  items: z.array(z.object({ itemId: text.min(1), role: text.optional() }).strict()).min(1).max(30)
    .refine(items => new Set(items.map(i => i.itemId)).size === items.length, "Duplicate wardrobe items"),
  season: z.enum(seasons).nullable().default(null), occasion: text.default(""), styleTags: tags.default([]),
  favorite: z.boolean().default(false), source: z.enum(["manual", "ai-assisted", "ai-generated"]).default("manual"),
  imageUrl: image.nullable().default(null), lastWornAt: timestamp.nullable().default(null),
  stylingScore: z.number().min(0).max(100).nullable().default(null), recommendationExplanation: z.string().max(5000).nullable().default(null),
  weatherContext: z.object({ temperatureC: z.number().optional(), conditions: text.optional() }).strict().nullable().default(null),
  eventContext: z.object({ name: text, date: timestamp.optional() }).strict().nullable().default(null),
}).strict();
export const outfitPatchSchema = patchSchema(outfitInputSchema);
export const outfitSchema = outfitInputSchema.extend({ id: text.min(1), createdAt: timestamp, updatedAt: timestamp });
export type OutfitInput = z.input<typeof outfitInputSchema>;
export type OutfitData = z.output<typeof outfitInputSchema>;
export type SavedOutfit = z.output<typeof outfitSchema>;
export const styleProfileInputSchema = z.object({
  aestheticTags: tags.default([]), preferredColors: tags.default([]), avoidedColors: tags.default([]), preferredBrands: tags.default([]),
  preferredFits: tags.default([]), preferredFormality: z.array(formality).default([]), preferredStyleTags: tags.default([]),
  confidence: z.number().min(0).max(1).nullable().default(null),
  learning: z.object({ status: z.enum(["not-started", "learning", "reviewed"]).default("not-started"), version: text.nullable().default(null),
    observations: z.number().int().min(0).default(0) }).default({ status: "not-started", version: null, observations: 0 }),
  recentInspirations: z.array(z.object({ id: text, image, source: text }).strict()).max(100).default([]),
}).strict();
export const styleProfilePatchSchema = patchSchema(styleProfileInputSchema);
export const styleProfileSchema = styleProfileInputSchema.extend({ id: text, createdAt: timestamp, updatedAt: timestamp });
export type StyleProfileData = z.output<typeof styleProfileInputSchema>;
export type StyleProfile = z.output<typeof styleProfileSchema>;
export const clothingAnalysisResultSchema = wardrobeInputSchema.pick({ category: true, subcategory: true, primaryColor: true,
  secondaryColors: true, material: true, pattern: true, fit: true, seasons: true, occasions: true, styleTags: true, formality: true })
  .extend({ suggestedName: text.min(1), confidence: z.number().min(0).max(1) });
export type ClothingAnalysisResult = z.output<typeof clothingAnalysisResultSchema>;
export function analysisToWardrobeInput(analysis: ClothingAnalysisResult, originalImage: string): WardrobeInput {
  const { suggestedName, confidence, ...attributes } = clothingAnalysisResultSchema.parse(analysis);
  return { ...attributes, name: suggestedName, originalImage, aiConfidence: confidence, aiGeneratedTags: attributes.styleTags };
}
const queryBoolean = z.enum(["true", "false"]).transform(v => v === "true");
export const wardrobeFilterSchema = z.object({ category: z.enum(categories).optional(), favorite: queryBoolean.optional(),
  color: text.optional(), season: z.enum(seasons).optional(), style: text.optional(), search: text.optional(),
  status: z.enum(["active", "archived", "all"]).default("active") }).strict();
export const outfitFilterSchema = z.object({ favorite: queryBoolean.optional(), season: z.enum(seasons).optional(), search: text.optional() }).strict();
export { z };
