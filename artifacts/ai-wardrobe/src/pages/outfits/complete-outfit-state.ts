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

type AnchorCandidate = Pick<WardrobeItem, "id" | "category" | "subcategory">;

const exclusiveAnchorCategories = new Set<WardrobeItem["category"]>([
  "Tops",
  "Bottoms",
  "Dresses",
  "Outerwear",
  "Shoes",
  "Bags",
]);

const isOnePiece = (item: AnchorCandidate) =>
  item.category === "Dresses" ||
  item.subcategory.toLowerCase().includes("jumpsuit");

export function anchorSelectionIssue(
  current: readonly AnchorCandidate[],
  candidate: AnchorCandidate,
) {
  if (current.some((item) => item.id === candidate.id)) return null;
  if (current.length >= 3) return "Choose up to three anchor pieces.";
  const candidateIsOnePiece = isOnePiece(candidate);
  const hasOnePiece = current.some(isOnePiece);
  const hasSeparate = current.some((item) =>
    ["Tops", "Bottoms"].includes(item.category),
  );
  if (
    (candidateIsOnePiece && hasSeparate) ||
    (hasOnePiece && ["Tops", "Bottoms", "Dresses"].includes(candidate.category))
  )
    return "A dress or jumpsuit cannot be anchored with another top or bottom.";
  if (
    exclusiveAnchorCategories.has(candidate.category) &&
    current.some((item) => item.category === candidate.category)
  )
    return `Choose only one ${candidate.category.toLowerCase()} anchor.`;
  return null;
}

export function recommendationKey(recommendation: OutfitRecommendation) {
  return [...recommendation.itemIds].sort().join("|");
}

export function moveRecommendationIndex(
  current: number,
  direction: number,
  length: number,
) {
  return length ? (current + direction + length) % length : 0;
}

export function generationErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  if (/failed to fetch|network|load failed/i.test(error.message))
    return "The AI stylist is temporarily unavailable. Your selected pieces and last outfit are still here.";
  return error.message || fallback;
}

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

export function buildRecommendationPieces<T extends Pick<WardrobeItem, "id">>(
  recommendation: OutfitRecommendation,
  items: readonly T[],
  anchorItemIds: readonly string[],
) {
  const anchorIds = new Set(anchorItemIds);
  const itemById = new Map(items.map((item) => [item.id, item]));
  return {
    pieces: recommendation.itemIds.flatMap((id) => {
      const item = itemById.get(id);
      return item ? [{ item, isAnchor: anchorIds.has(id) }] : [];
    }),
    unresolvedItemIds: recommendation.itemIds.filter((id) => !itemById.has(id)),
  };
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
