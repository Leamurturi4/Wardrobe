import {
  categories,
  getSourceHostname,
  styleDirectionSchema,
  z,
  type SourceReference,
  type StyleDirection,
} from "@workspace/api-zod";
import type { GeminiStructuredClient } from "./clothing-analysis";
import type { InspirationHit } from "./inspiration-search";
import type { InspirationQueryGarment } from "./inspiration";
import type { InspirationSearchOptions } from "./inspiration";

export const MAX_STYLE_DIRECTIONS = 4;

export const STYLE_DIRECTION_PROMPT = `You read fashion styling references and distill the recurring styling patterns behind them.
Return 2-4 distinct style directions that describe HOW the selected garment is styled, never specific products, brands, retailers, or prices.
A direction names the companion categories to look for and the traits that matter (silhouette, fabric, structure, color, finish), e.g. "dark straight-leg denim", "structured neutral bag".
Prefer combinations supported by SEVERAL references over one-off, unusual looks; merge references that describe the same pattern into one direction.
Use only the categories provided. Keep desiredTraits short, generic, and wardrobe-shaped so they can be matched against clothes someone already owns.
reasoning explains the styling logic in one or two sentences in your own words; never quote or reproduce source text.
sourceIndexes lists the zero-based indexes of the provided references that actually support the direction. Never cite a reference that does not.`;

export type StyleDirectionExtractionInput = {
  garment: InspirationQueryGarment;
  hits: readonly InspirationHit[];
  options: InspirationSearchOptions;
};

export interface StyleDirectionExtractor {
  extract(input: StyleDirectionExtractionInput): Promise<StyleDirection[]>;
}

const rawDirectionsSchema = z
  .object({
    directions: z.array(
      z
        .object({
          name: z.string(),
          desiredCategories: z.array(z.string()),
          desiredTraits: z.array(z.string()),
          colorDirection: z.array(z.string()),
          styleTags: z.array(z.string()),
          reasoning: z.string(),
          sourceIndexes: z.array(z.number()),
        })
        .passthrough(),
    ),
  })
  .passthrough();

const key = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const categoryAliases: Record<string, (typeof categories)[number]> = {
  top: "Tops",
  shirt: "Tops",
  blouse: "Tops",
  knitwear: "Tops",
  bottom: "Bottoms",
  trouser: "Bottoms",
  trousers: "Bottoms",
  pants: "Bottoms",
  denim: "Bottoms",
  jeans: "Bottoms",
  skirt: "Bottoms",
  dress: "Dresses",
  outerwear: "Outerwear",
  coat: "Outerwear",
  jacket: "Outerwear",
  blazer: "Outerwear",
  shoe: "Shoes",
  footwear: "Shoes",
  bag: "Bags",
  handbag: "Bags",
  purse: "Bags",
  accessory: "Accessories",
  accessories: "Accessories",
  belt: "Accessories",
  jewellery: "Jewelry",
  jewelry: "Jewelry",
};

const toCategory = (value: string): (typeof categories)[number] | null => {
  const normalized = key(value);
  return (
    categories.find((candidate) => key(candidate) === normalized) ??
    categoryAliases[normalized] ??
    null
  );
};

const phrase = (value: string, maxLength = 60) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
    .trim();

const uniquePhrases = (values: readonly string[], max: number) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = phrase(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
    if (result.length === max) break;
  }
  return result;
};

/**
 * Turns the model's index-based citations into real source references. The
 * model never emits URLs, so an invented or unsafe link cannot reach the UI.
 */
function resolveSources(
  indexes: readonly number[],
  hits: readonly InspirationHit[],
  provider: string,
): SourceReference[] {
  const seen = new Set<string>();
  const sources: SourceReference[] = [];
  for (const index of indexes) {
    if (!Number.isInteger(index)) continue;
    const hit = hits[index];
    if (!hit || seen.has(hit.sourceUrl)) continue;
    seen.add(hit.sourceUrl);
    sources.push({
      provider:
        (getSourceHostname(hit.sourceUrl) || hit.source || provider).slice(
          0,
          200,
        ) || provider,
      title: hit.title.slice(0, 200),
      url: hit.sourceUrl,
    });
    if (sources.length === 20) break;
  }
  return sources;
}

/** Validates raw model output into StyleDirections, dropping unusable entries. */
export function normalizeStyleDirections(
  raw: unknown,
  hits: readonly InspirationHit[],
  provider: string,
): StyleDirection[] {
  const parsed = rawDirectionsSchema.safeParse(raw);
  if (!parsed.success) return [];
  const directions: StyleDirection[] = [];
  for (const direction of parsed.data.directions) {
    const name = direction.name.trim().slice(0, 200);
    const reasoning = direction.reasoning.trim().slice(0, 800);
    if (!name || !reasoning) continue;
    const desiredCategories = [
      ...new Set(
        direction.desiredCategories
          .map(toCategory)
          .filter((value): value is (typeof categories)[number] =>
            Boolean(value),
          ),
      ),
    ];
    const candidate = styleDirectionSchema.safeParse({
      name,
      desiredCategories,
      desiredTraits: uniquePhrases(direction.desiredTraits, 20),
      colorDirection: uniquePhrases(direction.colorDirection, 10),
      styleTags: uniquePhrases(direction.styleTags, 10),
      reasoning,
      sourceReferences: resolveSources(direction.sourceIndexes, hits, provider),
    });
    if (candidate.success) directions.push(candidate.data);
  }
  return directions;
}

const signature = (direction: StyleDirection) =>
  new Set([
    ...direction.desiredCategories.map((value) => value.toLocaleLowerCase()),
    ...direction.desiredTraits.flatMap((value) => value.split(/[\s-]+/)),
    ...direction.styleTags.flatMap((value) => value.split(/[\s-]+/)),
  ]);

const similarity = (left: Set<string>, right: Set<string>) => {
  const union = new Set([...left, ...right]);
  if (!union.size) return 0;
  return [...left].filter((token) => right.has(token)).length / union.size;
};

function merge(cluster: readonly StyleDirection[]): StyleDirection {
  // The member backed by the most references names the merged direction.
  const lead = [...cluster].sort(
    (a, b) =>
      b.sourceReferences.length - a.sourceReferences.length ||
      b.desiredCategories.length - a.desiredCategories.length,
  )[0]!;
  const traitCounts = new Map<string, number>();
  for (const direction of cluster)
    for (const trait of direction.desiredTraits)
      traitCounts.set(trait, (traitCounts.get(trait) ?? 0) + 1);
  const byRecurrence = [...traitCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([trait]) => trait);
  const sources = new Map<string, SourceReference>();
  for (const direction of cluster)
    for (const source of direction.sourceReferences)
      if (!sources.has(source.url)) sources.set(source.url, source);
  return styleDirectionSchema.parse({
    name: lead.name,
    desiredCategories: [
      ...new Set(cluster.flatMap((direction) => direction.desiredCategories)),
    ],
    desiredTraits: byRecurrence.slice(0, 20),
    colorDirection: [
      ...new Set(cluster.flatMap((direction) => direction.colorDirection)),
    ].slice(0, 10),
    styleTags: [
      ...new Set(cluster.flatMap((direction) => direction.styleTags)),
    ].slice(0, 10),
    reasoning: lead.reasoning,
    sourceReferences: [...sources.values()].slice(0, 20),
  });
}

/**
 * Collapses near-duplicate directions and orders what remains by how much
 * evidence supports it: directions several references agree on outrank one-offs.
 */
export function reconcileStyleDirections(
  directions: readonly StyleDirection[],
  maxDirections = MAX_STYLE_DIRECTIONS,
): StyleDirection[] {
  const clusters: { signature: Set<string>; members: StyleDirection[] }[] = [];
  for (const direction of directions) {
    const fingerprint = signature(direction);
    const existing = clusters.find(
      (cluster) => similarity(cluster.signature, fingerprint) >= 0.5,
    );
    if (existing) {
      existing.members.push(direction);
      for (const token of fingerprint) existing.signature.add(token);
    } else {
      clusters.push({ signature: fingerprint, members: [direction] });
    }
  }
  return clusters
    .map((cluster) => ({
      direction: merge(cluster.members),
      support: cluster.members.length,
    }))
    .sort(
      (a, b) =>
        b.support - a.support ||
        b.direction.sourceReferences.length -
          a.direction.sourceReferences.length ||
        a.direction.name.localeCompare(b.direction.name),
    )
    .slice(0, maxDirections)
    .map((entry) => entry.direction);
}

/** Compact reference payload sent to Gemini: no images, no full article text. */
export function buildDirectionExtractionPayload(
  input: StyleDirectionExtractionInput,
) {
  return {
    selectedGarment: {
      category: input.garment.category,
      subcategory: input.garment.subcategory || null,
      primaryColor: input.garment.primaryColor,
      materialCandidates: input.garment.materialCandidates,
      styleTags: input.garment.styleTags,
      formality: input.garment.formality,
    },
    request: {
      occasion: input.options.occasion ?? null,
      style: input.options.style ?? null,
      formality: input.options.formality ?? null,
    },
    availableCategories: categories,
    references: input.hits.map((hit, index) => ({
      index,
      title: hit.title,
      source: hit.source,
      snippet: hit.snippet,
      query: hit.query,
    })),
  };
}

export function createGeminiStyleDirectionExtractor(
  client: GeminiStructuredClient,
  provider: string,
): StyleDirectionExtractor {
  return {
    async extract(input) {
      if (!input.hits.length) return [];
      const responseSchema = {
        type: "object",
        additionalProperties: false,
        properties: {
          directions: {
            type: "array",
            minItems: 1,
            maxItems: 6,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                desiredCategories: {
                  type: "array",
                  maxItems: categories.length,
                  items: { type: "string", enum: categories },
                },
                desiredTraits: {
                  type: "array",
                  maxItems: 8,
                  items: { type: "string" },
                },
                colorDirection: {
                  type: "array",
                  maxItems: 6,
                  items: { type: "string" },
                },
                styleTags: {
                  type: "array",
                  maxItems: 6,
                  items: { type: "string" },
                },
                reasoning: { type: "string" },
                sourceIndexes: {
                  type: "array",
                  maxItems: input.hits.length,
                  items: {
                    type: "integer",
                    minimum: 0,
                    maximum: Math.max(0, input.hits.length - 1),
                  },
                },
              },
              required: [
                "name",
                "desiredCategories",
                "desiredTraits",
                "colorDirection",
                "styleTags",
                "reasoning",
                "sourceIndexes",
              ],
            },
          },
        },
        required: ["directions"],
      };
      const raw = await client.generateJson({
        prompt: `${STYLE_DIRECTION_PROMPT}\n\n${JSON.stringify(
          buildDirectionExtractionPayload(input),
        )}`,
        responseSchema,
        maxOutputTokens: 1800,
      });
      return reconcileStyleDirections(
        normalizeStyleDirections(raw, input.hits, provider),
      );
    },
  };
}
