import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  canonicalColors,
  categories,
  categorySubcategories,
  clothingAnalysisResultSchema,
  fits,
  formalities,
  garmentLengths,
  layeringRoles,
  necklines,
  occasionValues,
  patterns,
  rises,
  seasons,
  signalLevels,
  silhouettes,
  sleeveLengths,
  styleDirections,
  subcategories,
  textures,
  weatherValues,
  z,
  type ClothingAnalysisResult,
} from "@workspace/api-zod";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
export const CLOTHING_ANALYSIS_PROMPT = `Analyze the single garment in this image for a digital wardrobe.
Focus on the garment and ignore the person, background, props, labels, and environment whenever possible.
Classify only what is reasonably visible: garment category and subtype, dominant and secondary colors, pattern,
texture, fit, silhouette, relevant length/neckline/sleeve/rise, layering role, visually plausible material candidates,
style and aesthetic direction, formality, seasons, occasions, weather suitability, and styling-useful visual signals.
Do not recommend an outfit. Do not identify or invent brand, exact fabric composition, size, price, product name,
designer, provenance, or hidden construction details. Use null or an empty list where a detail is not visible.
Use broader values and lower confidence when uncertain. suggestedName must be a short generic visible description without a brand.`;

const rawAnalysisSchema = z
  .object({
    suggestedName: z.string(),
    category: z.string(),
    subcategory: z.string(),
    primaryColor: z.string(),
    secondaryColors: z.array(z.string()),
    pattern: z.string().nullable(),
    texture: z.string().nullable(),
    fit: z.string().nullable(),
    silhouette: z.string().nullable(),
    length: z.string().nullable(),
    neckline: z.string().nullable(),
    sleeveLength: z.string().nullable(),
    rise: z.string().nullable(),
    layeringRole: z.string().nullable(),
    materialCandidates: z.array(z.string()),
    styleTags: z.array(z.string()),
    aestheticTags: z.array(z.string()),
    formality: z.string().nullable(),
    seasons: z.array(z.string()),
    occasions: z.array(z.string()),
    weatherSuitability: z.array(z.string()),
    statementLevel: z.string().nullable(),
    visualWeight: z.string().nullable(),
    structureLevel: z.string().nullable(),
    versatility: z.string().nullable(),
    dominantStyleDirection: z.string().nullable(),
    confidence: z.number(),
  })
  .strict();

const key = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "");
const aliases: Record<string, Record<string, string>> = {
  category: {
    top: "Tops",
    shirt: "Tops",
    bottom: "Bottoms",
    trouser: "Bottoms",
    trousers: "Bottoms",
    dress: "Dresses",
    shoe: "Shoes",
    footwear: "Shoes",
    bag: "Bags",
    accessory: "Accessories",
    jewellery: "Jewelry",
  },
  subcategory: {
    tee: "T-Shirt",
    tshirt: "T-Shirt",
    tshirts: "T-Shirt",
    tank: "Tank Top",
    trousers: "Pants",
    trouser: "Pants",
    denim: "Jeans",
    sneaker: "Sneakers",
    trainer: "Sneakers",
    trainers: "Sneakers",
    boot: "Boots",
    sandal: "Sandals",
    pump: "Heels",
    pumps: "Heels",
  },
  color: {
    grey: "Gray",
    offwhite: "Ivory",
    offwhitecolor: "Ivory",
    camel: "Tan",
    maroon: "Burgundy",
    multicolored: "Multicolor",
    multicoloured: "Multicolor",
  },
  pattern: {
    stripe: "Striped",
    stripes: "Striped",
    check: "Checked",
    checks: "Checked",
    polkadots: "Polka Dot",
    animal: "Animal Print",
    colorblock: "Color Block",
    colourblock: "Color Block",
  },
  fit: { loose: "Relaxed", oversize: "Oversized", standard: "Regular" },
  formality: { smartcasual: "Smart Casual", semiformal: "Smart Casual" },
  season: { fall: "Autumn" },
  weather: { rainy: "rain", snowy: "snow", windy: "wind" },
  level: { moderate: "Medium", mediumhigh: "High", mediumlow: "Low" },
  style: {
    boho: "Bohemian",
    glam: "Glamorous",
    quietluxury: "Quiet Luxury",
    y2k: "Y2K",
  },
};

function canonical<const T extends readonly string[]>(
  value: string,
  values: T,
  field: keyof typeof aliases,
): T[number] {
  const normalized = key(value);
  const direct = values.find((candidate) => key(candidate) === normalized);
  const alias = aliases[field]?.[normalized];
  const matched = direct ?? values.find((candidate) => candidate === alias);
  if (!matched)
    throw new ClothingAnalysisError(
      502,
      `AI returned an unsupported ${field} value`,
    );
  return matched as T[number];
}
function optional<const T extends readonly string[]>(
  value: string | null,
  values: T,
  field: keyof typeof aliases,
): T[number] | null {
  return value === null || value.trim() === "" || key(value) === "unknown"
    ? null
    : canonical(value, values, field);
}
function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
function canonicalList<const T extends readonly string[]>(
  values: string[],
  allowed: T,
  field: keyof typeof aliases,
): T[number][] {
  return unique(
    values
      .filter((value) => value.trim() && key(value) !== "unknown")
      .map((value) => canonical(value, allowed, field)),
  );
}

export function normalizeClothingAnalysis(
  input: unknown,
): ClothingAnalysisResult {
  const raw = rawAnalysisSchema.parse(input);
  const category = canonical(raw.category, categories, "category");
  const subcategory = canonical(raw.subcategory, subcategories, "subcategory");
  if (!categorySubcategories[category].includes(subcategory)) {
    throw new ClothingAnalysisError(
      502,
      "AI returned a subcategory that does not match the category",
    );
  }
  return clothingAnalysisResultSchema.parse({
    suggestedName: raw.suggestedName,
    category,
    subcategory,
    primaryColor: canonical(raw.primaryColor, canonicalColors, "color"),
    secondaryColors: canonicalList(
      raw.secondaryColors,
      canonicalColors,
      "color",
    ),
    pattern: optional(raw.pattern, patterns, "pattern"),
    texture: optional(raw.texture, textures, "texture"),
    fit: optional(raw.fit, fits, "fit"),
    silhouette: optional(raw.silhouette, silhouettes, "silhouette"),
    length: optional(raw.length, garmentLengths, "length"),
    neckline: optional(raw.neckline, necklines, "neckline"),
    sleeveLength: optional(raw.sleeveLength, sleeveLengths, "sleeveLength"),
    rise: optional(raw.rise, rises, "rise"),
    layeringRole: optional(raw.layeringRole, layeringRoles, "layeringRole"),
    materialCandidates: unique(
      raw.materialCandidates.map((value) => value.trim()).filter(Boolean),
    ).slice(0, 4),
    styleTags: canonicalList(raw.styleTags, styleDirections, "style"),
    aestheticTags: canonicalList(raw.aestheticTags, styleDirections, "style"),
    formality: optional(raw.formality, formalities, "formality"),
    seasons: canonicalList(raw.seasons, seasons, "season"),
    occasions: canonicalList(raw.occasions, occasionValues, "occasion"),
    weatherSuitability: canonicalList(
      raw.weatherSuitability,
      weatherValues,
      "weather",
    ),
    statementLevel: optional(raw.statementLevel, signalLevels, "level"),
    visualWeight: optional(raw.visualWeight, signalLevels, "level"),
    structureLevel: optional(raw.structureLevel, signalLevels, "level"),
    versatility: optional(raw.versatility, signalLevels, "level"),
    dominantStyleDirection: optional(
      raw.dominantStyleDirection,
      styleDirections,
      "style",
    ),
    confidence: raw.confidence,
  });
}

export class ClothingAnalysisError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export interface ClothingImage {
  bytes: Buffer;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
}
export interface ClothingAnalyzer {
  analyze(image: ClothingImage): Promise<ClothingAnalysisResult>;
}
export interface GeminiOptions {
  apiKey?: string;
  model?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}
export interface GeminiStructuredClient {
  generateJson(input: {
    prompt: string;
    responseSchema: unknown;
    image?: ClothingImage;
    maxOutputTokens?: number;
  }): Promise<unknown>;
}

const nullableEnum = (values: readonly string[]) => ({
  type: ["string", "null"],
  enum: [...values, null],
});
const arrayEnum = (values: readonly string[], maxItems: number) => ({
  type: "array",
  items: { type: "string", enum: values },
  maxItems,
});
const geminiResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    suggestedName: {
      type: "string",
      description: "Short generic garment name without a brand",
    },
    category: { type: "string", enum: categories },
    subcategory: { type: "string", enum: subcategories },
    primaryColor: { type: "string", enum: canonicalColors },
    secondaryColors: arrayEnum(canonicalColors, 4),
    pattern: nullableEnum(patterns),
    texture: nullableEnum(textures),
    fit: nullableEnum(fits),
    silhouette: nullableEnum(silhouettes),
    length: nullableEnum(garmentLengths),
    neckline: nullableEnum(necklines),
    sleeveLength: nullableEnum(sleeveLengths),
    rise: nullableEnum(rises),
    layeringRole: nullableEnum(layeringRoles),
    materialCandidates: {
      type: "array",
      items: {
        type: "string",
        description:
          "Broad visually plausible material, never an exact composition",
      },
      maxItems: 4,
    },
    styleTags: arrayEnum(styleDirections, 8),
    aestheticTags: arrayEnum(styleDirections, 8),
    formality: nullableEnum(formalities),
    seasons: arrayEnum(seasons, 4),
    occasions: arrayEnum(occasionValues, 10),
    weatherSuitability: arrayEnum(weatherValues, 7),
    statementLevel: nullableEnum(signalLevels),
    visualWeight: nullableEnum(signalLevels),
    structureLevel: nullableEnum(signalLevels),
    versatility: nullableEnum(signalLevels),
    dominantStyleDirection: nullableEnum(styleDirections),
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: [
    "suggestedName",
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
    "confidence",
  ],
};

export function createGeminiStructuredClient(
  options: GeminiOptions,
): GeminiStructuredClient {
  const apiKey = options.apiKey?.trim();
  const model = options.model?.trim() || DEFAULT_GEMINI_MODEL;
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? 20_000;
  return {
    async generateJson(input) {
      if (!apiKey)
        throw new ClothingAnalysisError(
          503,
          "AI is not configured. You can continue manually.",
        );
      let response: Response;
      try {
        response = await fetchFn(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            signal: AbortSignal.timeout(timeoutMs),
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    { text: input.prompt },
                    ...(input.image
                      ? [
                          {
                            inline_data: {
                              mime_type: input.image.mimeType,
                              data: input.image.bytes.toString("base64"),
                            },
                          },
                        ]
                      : []),
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: input.maxOutputTokens ?? 2048,
                responseMimeType: "application/json",
                responseJsonSchema: input.responseSchema,
              },
            }),
          },
        );
      } catch (error) {
        const timedOut =
          error instanceof Error &&
          (error.name === "TimeoutError" || error.name === "AbortError");
        throw new ClothingAnalysisError(
          timedOut ? 504 : 502,
          timedOut
            ? "AI timed out. You can continue manually."
            : "AI is temporarily unavailable. You can continue manually.",
        );
      }
      if (!response.ok)
        throw new ClothingAnalysisError(
          502,
          "AI is temporarily unavailable. You can continue manually.",
        );
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new ClothingAnalysisError(
          502,
          "AI returned an unreadable result. You can continue manually.",
        );
      }
      const result = z
        .object({
          candidates: z
            .array(
              z
                .object({
                  content: z
                    .object({
                      parts: z.array(
                        z.object({ text: z.string().optional() }).passthrough(),
                      ),
                    })
                    .passthrough(),
                })
                .passthrough(),
            )
            .min(1),
        })
        .passthrough()
        .safeParse(payload);
      const output = result.success
        ? result.data.candidates[0]?.content.parts
            .map((part) => part.text || "")
            .join("")
        : "";
      if (!output)
        throw new ClothingAnalysisError(
          502,
          "AI returned no structured result. You can continue manually.",
        );
      try {
        return JSON.parse(output) as unknown;
      } catch {
        throw new ClothingAnalysisError(
          502,
          "AI returned invalid JSON. You can continue manually.",
        );
      }
    },
  };
}

export function createGeminiClothingAnalyzer(
  options: GeminiOptions,
): ClothingAnalyzer {
  const client = createGeminiStructuredClient(options);
  return {
    async analyze(image) {
      const parsed = await client.generateJson({
        prompt: CLOTHING_ANALYSIS_PROMPT,
        responseSchema: geminiResponseSchema,
        image,
      });
      try {
        return normalizeClothingAnalysis(parsed);
      } catch (error) {
        if (error instanceof ClothingAnalysisError) throw error;
        throw new ClothingAnalysisError(
          502,
          "AI returned invalid clothing data. You can continue with manual entry.",
        );
      }
    },
  };
}

export function detectImageMime(
  bytes: Buffer,
): ClothingImage["mimeType"] | null {
  const pngEnd = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
  const png =
    bytes.length >= 33 &&
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    bytes.toString("ascii", 12, 16) === "IHDR" &&
    bytes.readUInt32BE(16) > 0 &&
    bytes.readUInt32BE(20) > 0 &&
    bytes.subarray(-12).equals(pngEnd);
  if (png) return "image/png";
  const jpeg =
    bytes.length >= 4 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes.at(-2) === 0xff &&
    bytes.at(-1) === 0xd9;
  if (jpeg) return "image/jpeg";
  const webpChunk = bytes.toString("ascii", 12, 16);
  const webp =
    bytes.length >= 20 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP" &&
    ["VP8 ", "VP8L", "VP8X"].includes(webpChunk) &&
    bytes.readUInt32LE(4) + 8 <= bytes.length;
  return webp ? "image/webp" : null;
}

export async function analyzeStoredImage(
  imageUrl: string,
  uploadDir: string,
  analyzer: ClothingAnalyzer,
): Promise<ClothingAnalysisResult> {
  const filename = imageUrl.slice("/uploads/".length);
  if (!/^[0-9a-f-]+\.(?:png|jpg|webp)$/i.test(filename))
    throw new ClothingAnalysisError(400, "Use a stored wardrobe image");
  const root = path.resolve(uploadDir);
  const imagePath = path.resolve(root, filename);
  if (path.dirname(imagePath) !== root)
    throw new ClothingAnalysisError(400, "Use a stored wardrobe image");
  let bytes: Buffer;
  try {
    bytes = await readFile(imagePath);
  } catch {
    throw new ClothingAnalysisError(404, "Stored image not found");
  }
  if (bytes.length > 5 * 1024 * 1024)
    throw new ClothingAnalysisError(413, "Image must be under 5 MB");
  const mimeType = detectImageMime(bytes);
  if (!mimeType)
    throw new ClothingAnalysisError(
      415,
      "Stored image is corrupt or unsupported",
    );
  return analyzer.analyze({ bytes, mimeType });
}
