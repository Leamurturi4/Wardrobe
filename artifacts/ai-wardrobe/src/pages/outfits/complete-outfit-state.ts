import {
  completeOutfitRecommendationsSchema,
  completeOutfitRequestSchema,
  type CompleteOutfitRecommendations,
  type CompleteOutfitRequest,
  type OutfitInput,
  type OutfitRecommendation,
  type WardrobeItem,
} from "@workspace/api-zod";

type CompletionOptions = {
  occasion?: string;
  style?: string;
  formality?: string;
  useInspiration?: boolean;
};

export function toggleAnchorId(current: string[], id: string) {
  if (current.includes(id)) return current.filter((value) => value !== id);
  if (current.length >= 3) return current;
  return [...current, id];
}

export function buildCompleteOutfitRequest(
  anchorItemIds: string[],
  options: CompletionOptions,
): CompleteOutfitRequest {
  return completeOutfitRequestSchema.parse({
    anchorItemIds,
    ...(options.occasion ? { occasion: options.occasion } : {}),
    ...(options.style ? { style: options.style } : {}),
    ...(options.formality ? { formality: options.formality } : {}),
    useInspiration: options.useInspiration,
  });
}

export function parseCompleteOutfitResponse(
  input: unknown,
): CompleteOutfitRecommendations {
  return completeOutfitRecommendationsSchema.parse(input);
}

export function buildGeneratedOutfitSaveBody(
  recommendation: OutfitRecommendation,
  items: readonly Pick<WardrobeItem, "id" | "category">[],
  fallbackOccasion: string,
): OutfitInput {
  return {
    name: recommendation.title,
    source: "ai-assisted",
    favorite: true,
    items: recommendation.itemIds.map((itemId) => ({
      itemId,
      role: items.find((item) => item.id === itemId)?.category.toLowerCase(),
    })),
    styleTags: recommendation.styleTags,
    occasion: recommendation.occasionFit || fallbackOccasion,
    recommendationExplanation: recommendation.explanation,
  };
}
