import {
  categories,
  outfitRecommendationSchema,
  styleItemRecommendationsSchema,
  styleItemRequestSchema,
  styleProfileSchema,
  wardrobeItemSchema,
  z,
  type OutfitRecommendation,
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

type OutfitDraft = {
  itemIds: string[];
  title: string;
  explanation: string;
  styleTags: string[];
  occasionFit: string | null;
};
export type OutfitReasoningContext = {
  request: StyleItemRequest;
  selectedItem: WardrobeItem;
  candidatePool: WardrobeItem[];
  styleProfile: StyleProfile;
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
  request: StyleItemRequest,
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
  request: StyleItemRequest,
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

export function buildCandidatePool(
  selected: WardrobeItem,
  items: WardrobeItem[],
  profile: StyleProfile,
  request: StyleItemRequest,
): WardrobeItem[] {
  const eligible = items.filter(
    (item) =>
      item.id !== selected.id &&
      item.status === "active" &&
      item.availability === "available" &&
      item.maintenanceState === "clean" &&
      categoryCompatible(selected, item) &&
      hasSeasonOverlap(selected, item) &&
      requestedFormalityCompatible(item, request),
  );
  const byCategory = new Map<WardrobeItem["category"], WardrobeItem[]>();
  for (const item of eligible.sort(
    (a, b) =>
      candidateScore(selected, b, profile, request) -
        candidateScore(selected, a, profile, request) ||
      a.id.localeCompare(b.id),
  )) {
    const values = byCategory.get(item.category) ?? [];
    if (values.length < 5) {
      values.push(item);
      byCategory.set(item.category, values);
    }
  }
  return categories
    .flatMap((category) => byCategory.get(category) ?? [])
    .slice(0, 28);
}

export function missingCategories(
  selectedCategory: WardrobeItem["category"],
  items: WardrobeItem[],
): WardrobeItem["category"][] {
  const present = new Set(items.map((item) => item.category));
  if (selectedCategory === "Dresses")
    return present.has("Shoes") ? [] : ["Shoes"];
  if (
    selectedCategory === "Shoes" ||
    ["Bags", "Accessories", "Jewelry"].includes(selectedCategory)
  ) {
    if (present.has("Dresses")) return present.has("Shoes") ? [] : ["Shoes"];
    return (["Tops", "Bottoms", "Shoes"] as const).filter(
      (category) => !present.has(category),
    );
  }
  const required =
    selectedCategory === "Outerwear"
      ? (["Tops", "Bottoms", "Shoes"] as const)
      : selectedCategory === "Tops"
        ? (["Bottoms", "Shoes"] as const)
        : (["Tops", "Shoes"] as const);
  return required.filter((category) => !present.has(category));
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
      const allowedIds = [
        context.selectedItem.id,
        ...context.candidatePool.map((item) => item.id),
      ];
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
              },
              required: [
                "itemIds",
                "title",
                "explanation",
                "styleTags",
                "occasionFit",
              ],
            },
          },
        },
        required: ["outfits"],
      };
      const payload = {
        mode: "style-this-item",
        request: context.request,
        selectedItem: compactItem(context.selectedItem),
        candidatePool: context.candidatePool.map(compactItem),
        styleDNA: {
          aestheticTags: context.styleProfile.aestheticTags,
          preferredColors: context.styleProfile.preferredColors,
          preferredFits: context.styleProfile.preferredFits,
          preferredFormality: context.styleProfile.preferredFormality,
          preferredStyleTags: context.styleProfile.preferredStyleTags,
          preferredBrands: context.styleProfile.preferredBrands,
        },
      };
      const prompt = `Build 3-4 distinct outfits around the selected wardrobe item using only IDs from the candidate pool below.
The selectedItem.id must appear in every outfit. Never invent or alter an ID. Prefer complete category structures, but return the best partial look when inventory is insufficient.
Use proportions, color harmony, formality, structure, texture, style direction, and Style DNA. Explanations must name concrete styling logic, not generic praise.
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
  selected: WardrobeItem,
  profile: StyleProfile,
  request: StyleItemRequest,
) {
  const completeness = categories.length - candidate.missingCategories.length;
  const members = items.filter((item) => candidate.itemIds.includes(item.id));
  return (
    completeness * 20 +
    members.reduce(
      (sum, item) => sum + candidateScore(selected, item, profile, request),
      0,
    ) +
    overlap(candidate.styleTags, [
      ...profile.aestheticTags,
      ...profile.preferredStyleTags,
    ]) *
      2
  );
}

export function createStyleItemService(
  wardrobe: WardrobeService,
  reasoner: OutfitReasoner,
) {
  return {
    async recommend(input: unknown): Promise<StyleItemRecommendations> {
      const request = styleItemRequestSchema.parse(input);
      let selected: WardrobeItem;
      try {
        selected = wardrobeItemSchema.parse(
          await wardrobe.getItem(request.wardrobeItemId),
        );
      } catch (error) {
        if (error instanceof DomainError) throw error;
        throw new DomainError(404, "Selected wardrobe item not found");
      }
      if (
        selected.status !== "active" ||
        selected.availability !== "available" ||
        selected.maintenanceState !== "clean"
      ) {
        throw new DomainError(
          422,
          "Selected wardrobe item is not currently available to wear",
        );
      }
      const items = z
        .array(wardrobeItemSchema)
        .parse(await wardrobe.listItems({ status: "active" }));
      const profile = styleProfileSchema.parse(await wardrobe.getProfile());
      const pool = buildCandidatePool(selected, items, profile, request);
      if (!pool.length) {
        return styleItemRecommendationsSchema.parse({
          selectedItemId: selected.id,
          outfits: [
            {
              itemIds: [selected.id],
              title: `Style ${selected.name}`,
              explanation:
                "No other compatible, available wardrobe pieces were found, so this is the best partial look from current inventory.",
              styleTags: selected.styleTags,
              occasionFit: request.occasion ?? null,
              missingCategories: missingCategories(selected.category, [
                selected,
              ]),
            },
          ],
        });
      }
      let drafts: OutfitDraft[];
      try {
        drafts = draftsSchema.parse(
          await reasoner.recommend({
            request,
            selectedItem: selected,
            candidatePool: pool,
            styleProfile: profile,
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
        [selected, ...pool].map((item) => [item.id, item]),
      );
      const recommendations = drafts.map((draft) => {
        if (
          new Set(draft.itemIds).size !== draft.itemIds.length ||
          !draft.itemIds.includes(selected.id) ||
          draft.itemIds.some((id) => !allowed.has(id))
        )
          throw new ClothingAnalysisError(
            502,
            "AI returned an invalid wardrobe item reference. Manual outfit building is still available.",
          );
        const members = draft.itemIds.map((id) => allowed.get(id)!);
        return outfitRecommendationSchema.parse({
          ...draft,
          missingCategories: missingCategories(selected.category, members),
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
                  candidate.itemIds.filter((id) => id !== selected.id),
                  existing.itemIds.filter((id) => id !== selected.id),
                ),
              ),
            );
          return (
            rankingScore(b, items, selected, profile, request) -
            redundancy(b) * 3 -
            (rankingScore(a, items, selected, profile, request) -
              redundancy(a) * 3)
          );
        });
        ranked.push(deduplicated.shift()!);
      }
      return styleItemRecommendationsSchema.parse({
        selectedItemId: selected.id,
        outfits: ranked.slice(0, 4),
      });
    },
  };
}
export type StyleItemService = ReturnType<typeof createStyleItemService>;
