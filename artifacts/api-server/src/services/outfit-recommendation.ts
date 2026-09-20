import {
  categories,
  completeOutfitRecommendationsSchema,
  completeOutfitRequestSchema,
  inspirationResultSchema,
  outfitRecommendationSchema,
  styleItemRecommendationsSchema,
  styleItemRequestSchema,
  styleProfileSchema,
  wardrobeItemSchema,
  z,
  type OutfitRecommendation,
  type CompleteOutfitRecommendations,
  type CompleteOutfitRequest,
  type InspirationResult,
  type StyleDirection,
  type StyleItemRequest,
  type StyleItemRecommendations,
  type StyleProfile,
  type WardrobeItem,
} from "@workspace/api-zod";
import {
  ClothingAnalysisError,
  type GeminiStructuredClient,
} from "./clothing-analysis";
import { DomainError, type WardrobeService } from "./wardrobe";
import { noOpInspirationSource, type InspirationSource } from "./inspiration";
import {
  directionAffinity,
  mapDirectionsToWardrobe,
  matchDirectionToWardrobe,
  type DirectionMatch,
} from "./inspiration-mapping";

type OutfitDraft = {
  itemIds: string[];
  title: string;
  explanation: string;
  styleTags: string[];
  occasionFit: string | null;
  directionName?: string | null | undefined;
};
export type OutfitReasoningContext = {
  request: StyleItemRequest | CompleteOutfitRequest;
  selectedItem: WardrobeItem;
  anchorItems?: WardrobeItem[];
  requiredCategories?: WardrobeItem["category"][];
  optionalCategories?: WardrobeItem["category"][];
  candidatePool: WardrobeItem[];
  styleProfile: StyleProfile;
  inspiration?: InspirationResult;
  directionMatches?: DirectionMatch[];
};
export interface OutfitReasoner {
  recommend(context: OutfitReasoningContext): Promise<unknown>;
}

const draftSchema = z
  .object({
    itemIds: z.array(z.string().trim().min(1)).min(1).max(8),
    title: z.string().trim().min(1).max(200),
    explanation: z.string().trim().min(1).max(800),
    styleTags: z.array(z.string().trim().min(1).max(200)).max(8),
    occasionFit: z.string().trim().min(1).max(200).nullable(),
    directionName: z.string().trim().min(1).max(200).nullish(),
  })
  .strict();
const draftsSchema = z
  .object({ outfits: z.array(draftSchema).min(1).max(5) })
  .strict();
const formalityRank = {
  Lounge: 0,
  Casual: 1,
  "Smart Casual": 2,
  Formal: 3,
} as const;
const neutrals = new Set([
  "black",
  "white",
  "ivory",
  "cream",
  "beige",
  "tan",
  "brown",
  "gray",
  "grey",
  "navy",
]);
const colorPairs = new Set([
  "black:white",
  "blue:brown",
  "blue:orange",
  "burgundy:navy",
  "green:brown",
  "navy:ivory",
  "olive:cream",
  "pink:gray",
  "purple:gray",
  "red:navy",
]);

const lower = (value: string) => value.trim().toLocaleLowerCase();
const overlap = (left: string[], right: string[]) => {
  const rightValues = new Set(right.map(lower));
  return left.filter((value) => rightValues.has(lower(value))).length;
};
const hasSeasonOverlap = (left: WardrobeItem, right: WardrobeItem) =>
  !left.seasons.length ||
  !right.seasons.length ||
  overlap(left.seasons, right.seasons) > 0;
const colorsWork = (left: WardrobeItem, right: WardrobeItem) => {
  const a = lower(left.primaryColor);
  const b = lower(right.primaryColor);
  if (a === b) return 4;
  if (neutrals.has(a) && neutrals.has(b)) return 3;
  if (neutrals.has(a) || neutrals.has(b)) return 2;
  return colorPairs.has([a, b].sort().join(":")) ? 3 : 0;
};
const categoryCompatible = (
  selected: WardrobeItem,
  candidate: WardrobeItem,
) => {
  const blocked: Record<WardrobeItem["category"], WardrobeItem["category"][]> =
    {
      Tops: ["Tops", "Dresses"],
      Bottoms: ["Bottoms", "Dresses"],
      Dresses: ["Tops", "Bottoms", "Dresses"],
      Outerwear: ["Outerwear"],
      Shoes: ["Shoes"],
      Bags: ["Bags"],
      Accessories: [],
      Jewelry: [],
    };
  return !blocked[selected.category].includes(candidate.category);
};
const requestedFormalityCompatible = (
  item: WardrobeItem,
  request: StyleItemRequest | CompleteOutfitRequest,
) => {
  if (!request.formality || !item.formality) return true;
  return (
    Math.abs(
      formalityRank[request.formality] - formalityRank[item.formality],
    ) <= 1
  );
};
const candidateScore = (
  selected: WardrobeItem,
  candidate: WardrobeItem,
  profile: StyleProfile,
  request: StyleItemRequest | CompleteOutfitRequest,
) => {
  let score =
    colorsWork(selected, candidate) +
    overlap(selected.styleTags, candidate.styleTags) * 3 +
    overlap(selected.aestheticTags, candidate.aestheticTags) * 2 +
    (hasSeasonOverlap(selected, candidate) ? 2 : 0);
  if (
    request.style &&
    [...candidate.styleTags, ...candidate.aestheticTags].some(
      (tag) => lower(tag) === lower(request.style!),
    )
  )
    score += 5;
  if (
    request.occasion &&
    candidate.occasions.some(
      (value) => lower(value) === lower(request.occasion!),
    )
  )
    score += 4;
  if (request.formality && candidate.formality === request.formality)
    score += 4;
  score +=
    overlap(
      [...candidate.styleTags, ...candidate.aestheticTags],
      [...profile.aestheticTags, ...profile.preferredStyleTags],
    ) * 2;
  if (
    profile.preferredColors.some(
      (color) => lower(color) === lower(candidate.primaryColor),
    )
  )
    score += 2;
  if (
    profile.preferredBrands.some(
      (brand) => lower(brand) === lower(candidate.brand),
    )
  )
    score += 1;
  if (candidate.favorite) score += 1;
  if (candidate.versatility === "High") score += 1;
  return score;
};

const silhouetteBalance = (anchors: readonly WardrobeItem[], candidate: WardrobeItem) => {
  let score = 0;
  for (const anchor of anchors) {
    if (anchor.silhouette && candidate.silhouette) {
      score += anchor.silhouette === candidate.silhouette ? 1 : 2;
    }
    if (anchor.structureLevel && candidate.structureLevel) {
      score += anchor.structureLevel === candidate.structureLevel ? 2 : 1;
    }
    if (anchor.visualWeight && candidate.visualWeight) {
      score += anchor.visualWeight === candidate.visualWeight ? 1 : 2;
    }
  }
  return score;
};

export type OutfitNeeds = {
  required: WardrobeItem["category"][];
  optional: WardrobeItem["category"][];
};

/** Required structure plus useful finishing categories; optional pieces are never forced. */
export function inferOutfitNeeds(
  anchors: readonly Pick<WardrobeItem, "category">[],
): OutfitNeeds {
  const present = new Set(anchors.map((item) => item.category));
  const required: WardrobeItem["category"][] = [];
  if (present.has("Dresses")) {
    if (!present.has("Shoes")) required.push("Shoes");
  } else {
    if (!present.has("Tops")) required.push("Tops");
    if (!present.has("Bottoms")) required.push("Bottoms");
    if (!present.has("Shoes")) required.push("Shoes");
  }
  const optional = (["Outerwear", "Bags", "Accessories", "Jewelry"] as const)
    .filter((category) => !present.has(category));
  return { required, optional };
}

/**
 * Deterministic candidate filtering. When style directions are supplied, items
 * that express those directions are pulled forward, so an inspired look is
 * still assembled from the same allowlisted, owned candidate pool.
 */
export function buildCandidatePool(
  selected: WardrobeItem,
  items: WardrobeItem[],
  profile: StyleProfile,
  request: StyleItemRequest,
  directions: readonly StyleDirection[] = [],
): WardrobeItem[] {
  return buildMultiAnchorCandidatePool([selected], items, profile, request, directions);
}

export function buildMultiAnchorCandidatePool(
  anchors: readonly WardrobeItem[],
  items: WardrobeItem[],
  profile: StyleProfile,
  request: StyleItemRequest | CompleteOutfitRequest,
  directions: readonly StyleDirection[] = [],
): WardrobeItem[] {
  const anchorIds = new Set(anchors.map((item) => item.id));
  const eligible = items.filter(
    (item) =>
      !anchorIds.has(item.id) &&
      item.status === "active" &&
      item.availability === "available" &&
      item.maintenanceState === "clean" &&
      anchors.every((anchor) => categoryCompatible(anchor, item)) &&
      anchors.every((anchor) => hasSeasonOverlap(anchor, item)) &&
      requestedFormalityCompatible(item, request),
  );
  const anchorScore = (item: WardrobeItem) =>
    anchors.reduce(
      (score, anchor) => score + candidateScore(anchor, item, profile, request),
      0,
    ) + silhouetteBalance(anchors, item);
  const affinity = (item: WardrobeItem) =>
    directions.length ? Math.min(directionAffinity(directions, item), 12) : 0;
  const byCategory = new Map<WardrobeItem["category"], WardrobeItem[]>();
  for (const item of eligible.sort(
    (a, b) =>
      anchorScore(b) +
        affinity(b) -
        (anchorScore(a) + affinity(a)) ||
      a.id.localeCompare(b.id),
  )) {
    const values = byCategory.get(item.category) ?? [];
    if (values.length < 5) {
      values.push(item);
      byCategory.set(item.category, values);
    }
  }
  const needs = inferOutfitNeeds(anchors);
  const categoryOrder = [
    ...needs.required,
    ...needs.optional,
    ...categories.filter(
      (category) => !needs.required.includes(category) && !needs.optional.includes(category),
    ),
  ];
  const pool = categoryOrder
    .flatMap((category) => byCategory.get(category) ?? [])
    .slice(0, 28);
  if (!directions.length) return pool;
  // Guarantee every direction has owned stand-ins to work with, even when a
  // deterministically stronger piece would otherwise have crowded them out.
  const chosen = new Set(pool.map((item) => item.id));
  const extras: WardrobeItem[] = [];
  for (const direction of directions)
    for (const item of matchDirectionToWardrobe(direction, eligible, 3)) {
      if (chosen.has(item.id)) continue;
      chosen.add(item.id);
      extras.push(item);
    }
  if (!extras.length) return pool;
  const order = [...pool, ...extras].slice(0, 32);
  return categories.flatMap((category) =>
    order.filter((item) => item.category === category),
  );
}

export function missingCategories(
  selectedCategory: WardrobeItem["category"],
  items: WardrobeItem[],
): WardrobeItem["category"][] {
  void selectedCategory;
  const present = new Set(items.map((item) => item.category));
  if (present.has("Dresses")) return present.has("Shoes") ? [] : ["Shoes"];
  const required = ["Tops", "Bottoms", "Shoes"] as const;
  return required.filter((category) => !present.has(category));
}

export function missingCategoriesForAnchors(
  anchors: readonly WardrobeItem[],
  items: readonly WardrobeItem[],
): WardrobeItem["category"][] {
  const present = new Set(items.map((item) => item.category));
  return inferOutfitNeeds(anchors).required.filter((category) => !present.has(category));
}

const compactItem = (item: WardrobeItem) => ({
  id: item.id,
  category: item.category,
  subcategory: item.subcategory,
  colors: [item.primaryColor, ...item.secondaryColors],
  pattern: item.pattern || null,
  texture: item.texture,
  fit: item.fit || null,
  silhouette: item.silhouette,
  length: item.length,
  material: item.material || item.materialCandidates,
  styleTags: item.styleTags,
  aestheticTags: item.aestheticTags,
  formality: item.formality,
  seasons: item.seasons,
  occasions: item.occasions,
  visualWeight: item.visualWeight,
  structureLevel: item.structureLevel,
  layeringRole: item.layeringRole,
  versatility: item.versatility,
  dominantStyleDirection: item.dominantStyleDirection,
  favorite: item.favorite,
});

export function createGeminiOutfitReasoner(
  client: GeminiStructuredClient,
): OutfitReasoner {
  return {
    async recommend(context) {
      const anchors = context.anchorItems ?? [context.selectedItem];
      const stylingRequest = {
        occasion: context.request.occasion ?? null,
        style: context.request.style ?? null,
        formality: context.request.formality ?? null,
      };
      const allowedIds = [
        ...anchors.map((item) => item.id),
        ...context.candidatePool.map((item) => item.id),
      ];
      const directionNames =
        context.inspiration?.directions.map((direction) => direction.name) ??
        [];
      const responseSchema = {
        type: "object",
        additionalProperties: false,
        properties: {
          outfits: {
            type: "array",
            minItems: 1,
            maxItems: 4,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                itemIds: {
                  type: "array",
                  minItems: 1,
                  maxItems: 8,
                  items: { type: "string", enum: allowedIds },
                },
                title: { type: "string" },
                explanation: { type: "string" },
                styleTags: {
                  type: "array",
                  maxItems: 8,
                  items: { type: "string" },
                },
                occasionFit: { type: ["string", "null"] },
                ...(directionNames.length
                  ? {
                      directionName: {
                        type: ["string", "null"],
                        enum: [...directionNames, null],
                      },
                    }
                  : {}),
              },
              required: [
                "itemIds",
                "title",
                "explanation",
                "styleTags",
                "occasionFit",
                ...(directionNames.length ? ["directionName"] : []),
              ],
            },
          },
        },
        required: ["outfits"],
      };
      const payload = {
        mode: anchors.length === 1 ? "style-this-item" : "complete-my-outfit",
        request: stylingRequest,
        anchorItems: anchors.map(compactItem),
        missingCategories: context.requiredCategories ??
          inferOutfitNeeds(anchors).required,
        optionalCategories: context.optionalCategories ??
          inferOutfitNeeds(anchors).optional,
        candidatePool: context.candidatePool.map(compactItem),
        styleDNA: {
          aestheticTags: context.styleProfile.aestheticTags,
          preferredColors: context.styleProfile.preferredColors,
          preferredFits: context.styleProfile.preferredFits,
          preferredFormality: context.styleProfile.preferredFormality,
          preferredStyleTags: context.styleProfile.preferredStyleTags,
          preferredBrands: context.styleProfile.preferredBrands,
        },
        ...(context.inspiration
          ? {
              inspiration: {
                // Strongest recurring direction first; sources stay server-side.
                directions: context.inspiration.directions.map((direction) => ({
                  name: direction.name,
                  desiredCategories: direction.desiredCategories,
                  desiredTraits: direction.desiredTraits,
                  colorDirection: direction.colorDirection,
                  styleTags: direction.styleTags,
                  reasoning: direction.reasoning,
                })),
              },
              ownedMatches: context.directionMatches ?? [],
            }
          : {}),
      };
      const prompt = `Build 3-4 distinct outfits around every anchor item using only IDs from the anchors and candidate pool below.
  Every anchorItems.id must appear in every outfit. Never invent or alter an ID. Fill required missing categories first. Optional categories can improve a look but must not be forced. Return the best partial look when inventory is insufficient.
  Use proportions, color harmony, silhouette balance, formality, structure, texture, occasion, season, style direction, and Style DNA. Explanations must name concrete styling logic, not generic praise.${context.inspiration ? "\nUse the provided inspiration only as creative direction; it cannot supply wardrobe items or IDs. inspiration.directions are ordered strongest-first, and ownedMatches lists the candidate IDs that already express each direction: adapt the idea to what is owned instead of demanding an exact match, and set directionName to the direction an outfit follows (null when it follows none)." : ""}
Do not recommend products, shopping, weather, trends, or online inspiration.\n\n${JSON.stringify(payload)}`;
      return client.generateJson({
        prompt,
        responseSchema,
        maxOutputTokens: 2200,
      });
    },
  };
}

function rankingScore(
  candidate: OutfitRecommendation,
  items: WardrobeItem[],
  anchors: readonly WardrobeItem[],
  profile: StyleProfile,
  request: StyleItemRequest | CompleteOutfitRequest,
  directions: readonly StyleDirection[] = [],
) {
  const members = items.filter((item) => candidate.itemIds.includes(item.id));
  const needs = inferOutfitNeeds(anchors);
  const present = new Set(members.map((item) => item.category));
  const completeness = needs.required.filter((category) => present.has(category)).length;
  const optionalCoverage = needs.optional.filter((category) => present.has(category)).length;
  return (
    completeness * 25 +
    optionalCoverage * 3 +
    members.reduce(
      (sum, item) =>
        sum +
        anchors.reduce(
          (anchorScore, anchor) =>
            anchorScore + candidateScore(anchor, item, profile, request),
          0,
        ) +
        silhouetteBalance(anchors, item) +
        Math.min(directionAffinity(directions, item), 8),
      0,
    ) +
    overlap(candidate.styleTags, [
      ...profile.aestheticTags,
      ...profile.preferredStyleTags,
    ]) *
      2
  );
}

function coherentOutfit(
  members: readonly WardrobeItem[],
  anchorIds: ReadonlySet<string>,
): boolean {
  for (const category of ["Bottoms", "Dresses", "Shoes", "Bags", "Outerwear"] as const) {
    const inCategory = members.filter((item) => item.category === category);
    if (inCategory.length > 1 && inCategory.some((item) => !anchorIds.has(item.id)))
      return false;
  }
  const hasDress = members.some((item) => item.category === "Dresses");
  if (hasDress) {
    const conflicting = members.filter((item) =>
      item.category === "Tops" || item.category === "Bottoms");
    if (conflicting.some((item) => !anchorIds.has(item.id))) return false;
  }
  return true;
}

export function createStyleItemService(
  wardrobe: WardrobeService,
  reasoner: OutfitReasoner,
  inspirationSource: InspirationSource = noOpInspirationSource,
) {
  async function recommendForAnchors(
    request: StyleItemRequest | CompleteOutfitRequest,
    anchorIds: string[],
    mode: "style-item" | "complete-outfit",
  ): Promise<StyleItemRecommendations | CompleteOutfitRecommendations> {
    const anchors: WardrobeItem[] = [];
    for (const id of anchorIds) {
      let anchor: WardrobeItem;
      try {
        anchor = wardrobeItemSchema.parse(await wardrobe.getItem(id));
      } catch (error) {
        if (error instanceof DomainError) throw error;
        throw new DomainError(404, "Anchor wardrobe item not found");
      }
      if (
        anchor.status !== "active" ||
        anchor.availability !== "available" ||
        anchor.maintenanceState !== "clean"
      ) {
        throw new DomainError(
          422,
          "Every anchor item must be active, available, and ready to wear",
        );
      }
      anchors.push(anchor);
    }
    const items = z
      .array(wardrobeItemSchema)
      .parse(await wardrobe.listItems({ status: "active" }));
    const profile = styleProfileSchema.parse(await wardrobe.getProfile());
    const needs = inferOutfitNeeds(anchors);
    let pool = buildMultiAnchorCandidatePool(
      anchors,
      items,
      profile,
      request,
    );
    const partialResult = () => ({
      itemIds: anchors.map((item) => item.id),
      title:
        mode === "style-item"
          ? `Style ${anchors[0]!.name}`
          : `Complete ${anchors.map((item) => item.name).join(" + ")}`,
      explanation:
        "No other compatible, available wardrobe pieces were found, so this is the best partial look from current inventory.",
      styleTags: [...new Set(anchors.flatMap((item) => item.styleTags))],
      occasionFit: request.occasion ?? null,
      missingCategories: missingCategoriesForAnchors(anchors, anchors),
    });
    if (!pool.length) {
      if (mode === "style-item") {
        return styleItemRecommendationsSchema.parse({
          selectedItemId: anchors[0]!.id,
          outfits: [partialResult()],
        });
      }
      return completeOutfitRecommendationsSchema.parse({
        anchorItemIds: anchorIds,
        outfits: [partialResult()],
      });
    }
    let inspiration: InspirationResult | undefined;
    if (request.useInspiration === true) {
      let providerOutput: unknown;
      let providerSucceeded = false;
      try {
        providerOutput =
          anchors.length > 1 && inspirationSource.searchAnchors
            ? await inspirationSource.searchAnchors(anchors, request)
            : await inspirationSource.search(anchors[0]!, request);
        providerSucceeded = true;
      } catch {
        // External inspiration is optional; provider outages fall back to wardrobe-only styling.
      }
      if (providerSucceeded) {
        const result = inspirationResultSchema.safeParse(providerOutput);
        if (result.success && result.data.directions.length)
          inspiration = result.data;
        else if (!result.success && mode === "style-item")
          throw new ClothingAnalysisError(
            502,
            "Inspiration source returned invalid data. Wardrobe-only styling is still available.",
          );
      }
    }
    let directionMatches: DirectionMatch[] = [];
    if (inspiration) {
      pool = buildMultiAnchorCandidatePool(
        anchors,
        items,
        profile,
        request,
        inspiration.directions,
      );
      directionMatches = mapDirectionsToWardrobe(
        inspiration.directions,
        pool,
      );
    }
    let drafts: OutfitDraft[];
    try {
      drafts = draftsSchema.parse(
        await reasoner.recommend({
          request,
          selectedItem: anchors[0]!,
          anchorItems: anchors,
          requiredCategories: needs.required,
          optionalCategories: needs.optional,
          candidatePool: pool,
          styleProfile: profile,
          ...(inspiration ? { inspiration, directionMatches } : {}),
        }),
      ).outfits;
    } catch (error) {
      if (error instanceof ClothingAnalysisError) throw error;
      throw new ClothingAnalysisError(
        502,
        "AI returned invalid outfit recommendations. Manual outfit building is still available.",
      );
    }
    const allowed = new Map(
      [...anchors, ...pool].map((item) => [item.id, item]),
    );
    const anchorIdSet = new Set(anchorIds);
    const directionsByName = new Map(
      (inspiration?.directions ?? []).map((direction) => [
        direction.name,
        direction,
      ]),
    );
    const recommendations = drafts.map((draft) => {
      if (
        new Set(draft.itemIds).size !== draft.itemIds.length ||
        anchorIds.some((id) => !draft.itemIds.includes(id)) ||
        draft.itemIds.some((id) => !allowed.has(id))
      )
        throw new ClothingAnalysisError(
          502,
          "AI returned an invalid wardrobe item reference. Manual outfit building is still available.",
        );
      const members = draft.itemIds.map((id) => allowed.get(id)!);
      if (!coherentOutfit(members, anchorIdSet))
        throw new ClothingAnalysisError(
          502,
          "AI returned an incoherent outfit structure. Manual outfit building is still available.",
        );
      const { directionName, ...outfit } = draft;
      const direction = directionName
        ? directionsByName.get(directionName)
        : undefined;
      return outfitRecommendationSchema.parse({
        ...outfit,
        missingCategories: missingCategoriesForAnchors(anchors, members),
        inspiration: direction
          ? {
              directionName: direction.name,
              summary: direction.reasoning,
              sources: direction.sourceReferences.slice(0, 6),
            }
          : null,
      });
    });
    const deduplicated = [
      ...new Map(
        recommendations.map((candidate) => [
          [...candidate.itemIds].sort().join("|"),
          candidate,
        ]),
      ).values(),
    ];
    const ranked: OutfitRecommendation[] = [];
    while (deduplicated.length) {
      deduplicated.sort((a, b) => {
        const redundancy = (candidate: OutfitRecommendation) =>
          Math.max(
            0,
            ...ranked.map((existing) =>
              overlap(
                candidate.itemIds.filter((id) => !anchorIdSet.has(id)),
                existing.itemIds.filter((id) => !anchorIdSet.has(id)),
              ),
            ),
          );
        return (
          rankingScore(
            b,
            items,
            anchors,
            profile,
            request,
            inspiration?.directions,
          ) -
          redundancy(b) * 3 -
          (rankingScore(
            a,
            items,
            anchors,
            profile,
            request,
            inspiration?.directions,
          ) -
            redundancy(a) * 3)
        );
      });
      ranked.push(deduplicated.shift()!);
    }
    const result = {
      outfits: ranked.slice(0, 4),
      inspirationProvider: inspiration?.provider ?? null,
    };
    return mode === "style-item"
      ? styleItemRecommendationsSchema.parse({
          ...result,
          selectedItemId: anchors[0]!.id,
        })
      : completeOutfitRecommendationsSchema.parse({
          ...result,
          anchorItemIds: anchorIds,
        });
  }
  return {
    async recommend(input: unknown): Promise<StyleItemRecommendations> {
      const request = styleItemRequestSchema.parse(input);
      return (await recommendForAnchors(
        request,
        [request.wardrobeItemId],
        "style-item",
      )) as StyleItemRecommendations;
    },
    async complete(input: unknown): Promise<CompleteOutfitRecommendations> {
      const request = completeOutfitRequestSchema.parse(input);
      return (await recommendForAnchors(
        request,
        request.anchorItemIds,
        "complete-outfit",
      )) as CompleteOutfitRecommendations;
    },
  };
}
export type StyleItemService = ReturnType<typeof createStyleItemService>;
