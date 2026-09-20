import type {
  InspirationResult,
  StyleItemRequest,
  WardrobeItem,
} from "@workspace/api-zod";

export type InspirationQueryGarment = Pick<
  WardrobeItem,
  | "category"
  | "subcategory"
  | "primaryColor"
  | "materialCandidates"
  | "styleTags"
  | "formality"
>;

const categoryFallback: Record<WardrobeItem["category"], string> = {
  Tops: "top",
  Bottoms: "bottom",
  Outerwear: "outerwear",
  Dresses: "dress",
  Shoes: "shoes",
  Bags: "bag",
  Accessories: "accessory",
  Jewelry: "jewelry",
};

const looksLikePersonalData = (value: string) =>
  /\S+@\S+\.\S+/.test(value) ||
  /(?:https?:\/\/|www\.)/i.test(value) ||
  /\+?\d[\d\s().-]{6,}\d/.test(value);

const descriptor = (value: string | null | undefined) => {
  if (!value || looksLikePersonalData(value)) return "";
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((part) => part.slice(0, 24))
    .join(" ")
    .slice(0, 48)
    .trim();
};

const query = (...parts: Array<string | undefined>) =>
  [...new Set(parts.filter(Boolean))].join(" ").slice(0, 80).trim();

const queryTokens = (value: string) => new Set(value.split(" "));
const isSimilar = (left: string, right: string) => {
  const leftTokens = queryTokens(left);
  const rightTokens = queryTokens(right);
  const shared = [...leftTokens].filter((token) =>
    rightTokens.has(token),
  ).length;
  const total = new Set([...leftTokens, ...rightTokens]).size;
  return total > 0 && shared / total >= 0.6;
};

export function generateInspirationQueries(
  garment: InspirationQueryGarment,
): string[] {
  const category = categoryFallback[garment.category];
  const subcategory = descriptor(garment.subcategory);
  const item = subcategory && subcategory !== "other" ? subcategory : category;
  const color = descriptor(garment.primaryColor);
  const material = garment.materialCandidates.map(descriptor).find(Boolean);
  const style = garment.styleTags.map(descriptor).find(Boolean);
  const formality = descriptor(garment.formality);
  const candidates = [
    query(color, material, item, "outfit"),
    query(color, item, formality, "outfit"),
    query(material, item, style, "styling"),
    query(color, item, style, "styling"),
    query(item, formality, style, "outfit"),
    query(item, "outfit ideas"),
    query(item, "styling ideas"),
    query(item, "color combinations"),
    query(item, "layering ideas"),
  ];
  const results: string[] = [];
  for (const candidate of candidates) {
    if (
      candidate &&
      !results.some((existing) => isSimilar(existing, candidate))
    )
      results.push(candidate);
    if (results.length === 5) break;
  }
  return results;
}

/** Queries that describe the combined outfit anchors without sending IDs or notes. */
export function generateCombinedInspirationQueries(
  garments: readonly InspirationQueryGarment[],
): string[] {
  if (garments.length === 1) return generateInspirationQueries(garments[0]!);
  const itemPhrases = garments.map((garment) => {
    const category = categoryFallback[garment.category];
    const subcategory = descriptor(garment.subcategory);
    const item = subcategory && subcategory !== "other" ? subcategory : category;
    return query(
      descriptor(garment.primaryColor),
      garment.materialCandidates.map(descriptor).find(Boolean),
      item,
    );
  });
  const sharedStyle = garments.flatMap((garment) => garment.styleTags)
    .map(descriptor)
    .find(Boolean);
  const sharedFormality = garments.map((garment) => descriptor(garment.formality))
    .find(Boolean);
  const base = query(...itemPhrases);
  const candidates = [
    query(base, "outfit"),
    query(base, sharedFormality, "outfit"),
    query(base, sharedStyle, "styling"),
    query(base, "layering ideas"),
    query(base, "accessories"),
  ];
  const results: string[] = [];
  for (const candidate of candidates) {
    if (candidate && !results.some((existing) => isSimilar(existing, candidate)))
      results.push(candidate);
    if (results.length === 5) break;
  }
  return results;
}

export type InspirationSearchOptions = Pick<
  StyleItemRequest,
  "occasion" | "style" | "formality"
>;

export interface InspirationSource {
  search(
    selectedGarment: WardrobeItem,
    options: InspirationSearchOptions,
  ): Promise<InspirationResult>;
  searchAnchors?(
    selectedGarments: readonly WardrobeItem[],
    options: InspirationSearchOptions,
  ): Promise<InspirationResult>;
}

export const noOpInspirationSource: InspirationSource = {
  async search() {
    return { provider: "none", directions: [] };
  },
};
