import { z } from "zod/v4";
export const categories = [
  "Tops",
  "Bottoms",
  "Outerwear",
  "Dresses",
  "Shoes",
  "Bags",
  "Accessories",
  "Jewelry",
] as const;
export const seasons = ["Spring", "Summer", "Autumn", "Winter"] as const;
export const subcategories = [
  "T-Shirt",
  "Blouse",
  "Shirt",
  "Tank Top",
  "Sweater",
  "Cardigan",
  "Hoodie",
  "Pants",
  "Jeans",
  "Shorts",
  "Skirt",
  "Leggings",
  "Blazer",
  "Jacket",
  "Coat",
  "Vest",
  "Jumpsuit",
  "Mini Dress",
  "Midi Dress",
  "Maxi Dress",
  "Sneakers",
  "Boots",
  "Sandals",
  "Flats",
  "Heels",
  "Loafers",
  "Tote",
  "Shoulder Bag",
  "Crossbody Bag",
  "Clutch",
  "Backpack",
  "Hat",
  "Scarf",
  "Belt",
  "Sunglasses",
  "Watch",
  "Necklace",
  "Earrings",
  "Bracelet",
  "Ring",
  "Other",
] as const;
export const categorySubcategories: Record<
  (typeof categories)[number],
  readonly (typeof subcategories)[number][]
> = {
  Tops: [
    "T-Shirt",
    "Blouse",
    "Shirt",
    "Tank Top",
    "Sweater",
    "Cardigan",
    "Hoodie",
    "Other",
  ],
  Bottoms: ["Pants", "Jeans", "Shorts", "Skirt", "Leggings", "Other"],
  Outerwear: ["Blazer", "Jacket", "Coat", "Vest", "Cardigan", "Other"],
  Dresses: ["Jumpsuit", "Mini Dress", "Midi Dress", "Maxi Dress", "Other"],
  Shoes: ["Sneakers", "Boots", "Sandals", "Flats", "Heels", "Loafers", "Other"],
  Bags: [
    "Tote",
    "Shoulder Bag",
    "Crossbody Bag",
    "Clutch",
    "Backpack",
    "Other",
  ],
  Accessories: ["Hat", "Scarf", "Belt", "Sunglasses", "Watch", "Other"],
  Jewelry: ["Necklace", "Earrings", "Bracelet", "Ring", "Other"],
};
export const canonicalColors = [
  "Black",
  "White",
  "Ivory",
  "Cream",
  "Beige",
  "Tan",
  "Brown",
  "Gray",
  "Red",
  "Burgundy",
  "Orange",
  "Yellow",
  "Green",
  "Olive",
  "Blue",
  "Navy",
  "Teal",
  "Purple",
  "Pink",
  "Gold",
  "Silver",
  "Multicolor",
] as const;
export const patterns = [
  "Solid",
  "Striped",
  "Plaid",
  "Checked",
  "Floral",
  "Polka Dot",
  "Animal Print",
  "Geometric",
  "Graphic",
  "Abstract",
  "Color Block",
  "Other",
] as const;
export const textures = [
  "Smooth",
  "Ribbed",
  "Knit",
  "Fuzzy",
  "Quilted",
  "Pleated",
  "Sheer",
  "Lace",
  "Distressed",
  "Textured",
  "Other",
] as const;
export const fits = [
  "Fitted",
  "Slim",
  "Regular",
  "Relaxed",
  "Oversized",
  "Tailored",
] as const;
export const silhouettes = [
  "Straight",
  "A-Line",
  "Bodycon",
  "Flared",
  "Wide-Leg",
  "Tapered",
  "Cropped",
  "Boxy",
  "Wrap",
  "Column",
  "Structured",
  "Fluid",
] as const;
export const garmentLengths = [
  "Cropped",
  "Waist",
  "Hip",
  "Mini",
  "Knee",
  "Midi",
  "Maxi",
  "Ankle",
  "Full-Length",
] as const;
export const necklines = [
  "Crew",
  "V-Neck",
  "Scoop",
  "Square",
  "Boat",
  "Collared",
  "Turtleneck",
  "Halter",
  "Strapless",
  "Sweetheart",
  "One-Shoulder",
  "Other",
] as const;
export const sleeveLengths = [
  "Sleeveless",
  "Cap",
  "Short",
  "Elbow",
  "Three-Quarter",
  "Long",
  "Other",
] as const;
export const rises = ["Low", "Mid", "High"] as const;
export const layeringRoles = [
  "Base",
  "Mid",
  "Outer",
  "Standalone",
  "Accessory",
] as const;
export const styleDirections = [
  "Minimalist",
  "Classic",
  "Casual",
  "Sporty",
  "Romantic",
  "Bohemian",
  "Edgy",
  "Preppy",
  "Streetwear",
  "Workwear",
  "Glamorous",
  "Vintage",
  "Resort",
  "Utility",
  "Quiet Luxury",
  "Y2K",
] as const;
export const occasionValues = [
  "Everyday",
  "Work",
  "Evening",
  "Party",
  "Formal Event",
  "Date",
  "Travel",
  "Vacation",
  "Active",
  "Lounge",
] as const;
export const weatherValues = [
  "hot",
  "warm",
  "cool",
  "cold",
  "rain",
  "snow",
  "wind",
] as const;
export const signalLevels = ["Low", "Medium", "High"] as const;
const text = z.string().trim().max(200);
const tags = z.array(text.min(1)).max(50);
const timestamp = z.iso.datetime();
const image = z
  .string()
  .max(500)
  .refine(
    (v) => /^\/(?!\/)/.test(v) || /^https?:\/\//.test(v),
    "Use a local image path or HTTP(S) URL",
  );
export const formalities = [
  "Casual",
  "Smart Casual",
  "Formal",
  "Lounge",
] as const;
const formality = z.enum(formalities);
// PATCH must not apply creation defaults to omitted fields.
function patchSchema<S extends Record<string, z.ZodType>>(
  schema: z.ZodObject<S>,
) {
  type Shape = {
    [K in keyof S]: z.ZodOptional<
      S[K] extends z.ZodDefault<infer Inner> ? Inner : S[K]
    >;
  };
  const shape = Object.fromEntries(
    Object.entries(schema.shape).map(([key, value]) => [
      key,
      z.optional(value instanceof z.ZodDefault ? value.removeDefault() : value),
    ]),
  );
  return z.object(shape as Shape).strict();
}
export const wardrobeInputSchema = z
  .object({
    name: text.min(1),
    description: z.string().max(5000).default(""),
    brand: text.default(""),
    category: z.enum(categories),
    subcategory: text.default(""),
    primaryColor: text.min(1),
    secondaryColors: tags.default([]),
    pattern: text.default(""),
    material: text.default(""),
    fit: text.default(""),
    size: text.default(""),
    styleTags: tags.default([]),
    formality: formality.nullable().default(null),
    seasons: z.array(z.enum(seasons)).default([]),
    occasions: tags.default([]),
    weatherSuitability: z.array(z.enum(weatherValues)).default([]),
    texture: z.enum(textures).nullable().default(null),
    silhouette: z.enum(silhouettes).nullable().default(null),
    length: z.enum(garmentLengths).nullable().default(null),
    neckline: z.enum(necklines).nullable().default(null),
    sleeveLength: z.enum(sleeveLengths).nullable().default(null),
    rise: z.enum(rises).nullable().default(null),
    layeringRole: z.enum(layeringRoles).nullable().default(null),
    materialCandidates: tags.default([]),
    aestheticTags: tags.default([]),
    statementLevel: z.enum(signalLevels).nullable().default(null),
    visualWeight: z.enum(signalLevels).nullable().default(null),
    structureLevel: z.enum(signalLevels).nullable().default(null),
    versatility: z.enum(signalLevels).nullable().default(null),
    dominantStyleDirection: z.enum(styleDirections).nullable().default(null),
    originalImage: image,
    processedImage: image.nullable().default(null),
    thumbnail: image.nullable().default(null),
    favorite: z.boolean().default(false),
    status: z.enum(["active", "archived"]).default("active"),
    availability: z.enum(["available", "unavailable"]).default("available"),
    maintenanceState: z.enum(["clean", "laundry", "repair"]).default("clean"),
    wearCount: z.number().int().min(0).default(0),
    lastWornAt: timestamp.nullable().default(null),
    aiGeneratedTags: tags.default([]),
    aiConfidence: z.number().min(0).max(1).nullable().default(null),
    aiAnalysisVersion: text.nullable().default(null),
    userCorrectedFields: tags.default([]),
  })
  .strict();
export const wardrobePatchSchema = patchSchema(wardrobeInputSchema);
export const wardrobeItemSchema = wardrobeInputSchema.extend({
  id: text.min(1),
  createdAt: timestamp,
  updatedAt: timestamp,
});
export type WardrobeInput = z.input<typeof wardrobeInputSchema>;
export type WardrobeData = z.output<typeof wardrobeInputSchema>;
export type WardrobeItem = z.output<typeof wardrobeItemSchema>;
export const outfitInputSchema = z
  .object({
    name: text.min(1),
    description: z.string().max(5000).default(""),
    items: z
      .array(z.object({ itemId: text.min(1), role: text.optional() }).strict())
      .min(1)
      .max(30)
      .refine(
        (items) => new Set(items.map((i) => i.itemId)).size === items.length,
        "Duplicate wardrobe items",
      ),
    season: z.enum(seasons).nullable().default(null),
    occasion: text.default(""),
    styleTags: tags.default([]),
    favorite: z.boolean().default(false),
    source: z.enum(["manual", "ai-assisted", "ai-generated"]).default("manual"),
    imageUrl: image.nullable().default(null),
    lastWornAt: timestamp.nullable().default(null),
    stylingScore: z.number().min(0).max(100).nullable().default(null),
    recommendationExplanation: z.string().max(5000).nullable().default(null),
    weatherContext: z
      .object({
        temperatureC: z.number().optional(),
        conditions: text.optional(),
      })
      .strict()
      .nullable()
      .default(null),
    eventContext: z
      .object({ name: text, date: timestamp.optional() })
      .strict()
      .nullable()
      .default(null),
  })
  .strict();
export const outfitPatchSchema = patchSchema(outfitInputSchema);
export const outfitSchema = outfitInputSchema.extend({
  id: text.min(1),
  createdAt: timestamp,
  updatedAt: timestamp,
});
export type OutfitInput = z.input<typeof outfitInputSchema>;
export type OutfitData = z.output<typeof outfitInputSchema>;
export type SavedOutfit = z.output<typeof outfitSchema>;
export const styleProfileInputSchema = z
  .object({
    aestheticTags: tags.default([]),
    preferredColors: tags.default([]),
    avoidedColors: tags.default([]),
    preferredBrands: tags.default([]),
    preferredFits: tags.default([]),
    preferredFormality: z.array(formality).default([]),
    preferredStyleTags: tags.default([]),
    confidence: z.number().min(0).max(1).nullable().default(null),
    learning: z
      .object({
        status: z
          .enum(["not-started", "learning", "reviewed"])
          .default("not-started"),
        version: text.nullable().default(null),
        observations: z.number().int().min(0).default(0),
      })
      .default({ status: "not-started", version: null, observations: 0 }),
    recentInspirations: z
      .array(z.object({ id: text, image, source: text }).strict())
      .max(100)
      .default([]),
  })
  .strict();
export const styleProfilePatchSchema = patchSchema(styleProfileInputSchema);
export const styleProfileSchema = styleProfileInputSchema.extend({
  id: text,
  createdAt: timestamp,
  updatedAt: timestamp,
});
export type StyleProfileData = z.output<typeof styleProfileInputSchema>;
export type StyleProfile = z.output<typeof styleProfileSchema>;
export const clothingAnalysisResultSchema = z
  .object({
    suggestedName: text.min(1),
    category: z.enum(categories),
    subcategory: z.enum(subcategories),
    primaryColor: z.enum(canonicalColors),
    secondaryColors: z.array(z.enum(canonicalColors)).max(4),
    pattern: z.enum(patterns).nullable(),
    texture: z.enum(textures).nullable(),
    fit: z.enum(fits).nullable(),
    silhouette: z.enum(silhouettes).nullable(),
    length: z.enum(garmentLengths).nullable(),
    neckline: z.enum(necklines).nullable(),
    sleeveLength: z.enum(sleeveLengths).nullable(),
    rise: z.enum(rises).nullable(),
    layeringRole: z.enum(layeringRoles).nullable(),
    materialCandidates: z.array(text.min(1)).max(4),
    styleTags: z.array(z.enum(styleDirections)).max(8),
    aestheticTags: z.array(z.enum(styleDirections)).max(8),
    formality: formality.nullable(),
    seasons: z.array(z.enum(seasons)).max(4),
    occasions: z.array(z.enum(occasionValues)).max(10),
    weatherSuitability: z.array(z.enum(weatherValues)).max(7),
    statementLevel: z.enum(signalLevels).nullable(),
    visualWeight: z.enum(signalLevels).nullable(),
    structureLevel: z.enum(signalLevels).nullable(),
    versatility: z.enum(signalLevels).nullable(),
    dominantStyleDirection: z.enum(styleDirections).nullable(),
    confidence: z.number().min(0).max(1),
  })
  .strict()
  .superRefine((value, context) => {
    if (!categorySubcategories[value.category].includes(value.subcategory)) {
      context.addIssue({
        code: "custom",
        path: ["subcategory"],
        message: `${value.subcategory} is not valid for ${value.category}`,
      });
    }
  });
export type ClothingAnalysisResult = z.output<
  typeof clothingAnalysisResultSchema
>;
export const clothingAnalysisRequestSchema = z
  .object({
    imageUrl: z
      .string()
      .regex(
        /^\/uploads\/[0-9a-f-]+\.(?:png|jpg|webp)$/i,
        "Use a stored wardrobe image",
      ),
  })
  .strict();
export const AI_ANALYSIS_VERSION = "gemini-clothing-v1";
export function analysisToWardrobeInput(
  analysis: ClothingAnalysisResult,
  originalImage: string,
): WardrobeInput {
  const {
    suggestedName,
    confidence,
    materialCandidates,
    pattern,
    fit,
    ...attributes
  } = clothingAnalysisResultSchema.parse(analysis);
  return {
    ...attributes,
    pattern: pattern || "",
    fit: fit || "",
    materialCandidates,
    material: materialCandidates[0] || "",
    name: suggestedName,
    originalImage,
    aiConfidence: confidence,
    aiAnalysisVersion: AI_ANALYSIS_VERSION,
    aiGeneratedTags: attributes.styleTags,
  };
}
export const AI_CORRECTABLE_FIELDS = [
  "name",
  "category",
  "subcategory",
  "primaryColor",
  "secondaryColors",
  "pattern",
  "texture",
  "fit",
  "silhouette",
  "length",
  "neckline",
  "sleeveLength",
  "rise",
  "layeringRole",
  "material",
  "materialCandidates",
  "styleTags",
  "aestheticTags",
  "formality",
  "seasons",
  "occasions",
  "weatherSuitability",
  "statementLevel",
  "visualWeight",
  "structureLevel",
  "versatility",
  "dominantStyleDirection",
] as const;
const comparable = (value: unknown) =>
  Array.isArray(value)
    ? JSON.stringify(
        [...value]
          .map((item) => String(item).trim().toLocaleLowerCase())
          .sort(),
      )
    : JSON.stringify(
        typeof value === "string" ? value.trim().toLocaleLowerCase() : value,
      );
export function findUserCorrectedFields(
  analysis: ClothingAnalysisResult,
  reviewed: Record<string, unknown>,
): string[] {
  const baseline = wardrobeInputSchema.parse(
    analysisToWardrobeInput(analysis, "/uploads/analysis.jpg"),
  ) as Record<string, unknown>;
  return AI_CORRECTABLE_FIELDS.filter(
    (field) => comparable(baseline[field]) !== comparable(reviewed[field]),
  );
}
export const sourceReferenceSchema = z
  .object({
    provider: text.min(1),
    title: text.min(1),
    url: z.string().trim().url().max(2_000),
  })
  .strict();
export const styleDirectionSchema = z
  .object({
    name: text.min(1),
    desiredCategories: z.array(z.enum(categories)).max(categories.length),
    desiredTraits: tags.max(20),
    colorDirection: tags.max(10),
    styleTags: tags.max(10),
    reasoning: z.string().trim().min(1).max(800),
    sourceReferences: z.array(sourceReferenceSchema).max(20),
  })
  .strict();
export const inspirationResultSchema = z
  .object({
    provider: text.min(1),
    directions: z.array(styleDirectionSchema).max(10),
  })
  .strict();
export type SourceReference = z.output<typeof sourceReferenceSchema>;
export type StyleDirection = z.output<typeof styleDirectionSchema>;
export type InspirationResult = z.output<typeof inspirationResultSchema>;
export const styleItemRequestSchema = z
  .object({
    wardrobeItemId: text.min(1),
    occasion: text.min(1).optional(),
    style: text.min(1).optional(),
    formality: formality.optional(),
    useInspiration: z.boolean().optional(),
  })
  .strict();
export type StyleItemRequest = z.output<typeof styleItemRequestSchema>;
export const outfitRecommendationSchema = z
  .object({
    itemIds: z.array(text.min(1)).min(1).max(8),
    title: text.min(1),
    explanation: z.string().trim().min(1).max(800),
    styleTags: tags.max(8),
    occasionFit: text.nullable(),
    missingCategories: z.array(z.enum(categories)).max(categories.length),
  })
  .strict();
export const styleItemRecommendationsSchema = z
  .object({
    selectedItemId: text.min(1),
    outfits: z.array(outfitRecommendationSchema).min(1).max(5),
  })
  .strict();
export type OutfitRecommendation = z.output<typeof outfitRecommendationSchema>;
export type StyleItemRecommendations = z.output<
  typeof styleItemRecommendationsSchema
>;
const queryBoolean = z.enum(["true", "false"]).transform((v) => v === "true");
export const wardrobeFilterSchema = z
  .object({
    category: z.enum(categories).optional(),
    favorite: queryBoolean.optional(),
    color: text.optional(),
    season: z.enum(seasons).optional(),
    style: text.optional(),
    search: text.optional(),
    status: z.enum(["active", "archived", "all"]).default("active"),
  })
  .strict();
export const outfitFilterSchema = z
  .object({
    favorite: queryBoolean.optional(),
    season: z.enum(seasons).optional(),
    search: text.optional(),
  })
  .strict();
export { z };
