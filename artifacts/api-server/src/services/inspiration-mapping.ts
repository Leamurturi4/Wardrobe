import type { StyleDirection, WardrobeItem } from "@workspace/api-zod";

/**
 * Maps abstract style directions onto clothes the user actually owns.
 *
 * Directions describe an idea ("dark straight-leg denim", "structured neutral
 * bag"); wardrobes rarely hold the exact garment. Matching therefore scores
 * structured wardrobe metadata against direction traits rather than demanding
 * literal matches, so chocolate leather tote can stand in for structured brown
 * bag and Chelsea boots can stand in for loafers.
 */
export type DirectionMatch = {
  name: string;
  itemIds: string[];
};

const tokenize = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/[\s-]+/)
    .filter(Boolean);

// Wardrobe-side expansions: turn coded metadata into words a styling direction
// would actually use.
const levelWords = (
  level: string | null,
  high: readonly string[],
  low: readonly string[],
) => (level === "High" ? high : level === "Low" ? low : []);

// Direction-side expansions: a trait word also matches its close wardrobe
// equivalents, so a direction never fails for want of the exact vocabulary.
const traitSynonyms: Record<string, readonly string[]> = {
  bag: ["tote", "shoulder", "crossbody", "clutch", "backpack", "bags"],
  ballet: ["flats"],
  barrel: ["relaxed", "wide"],
  boot: ["boots", "chelsea", "ankle"],
  chunky: ["boots", "sneakers", "knit"],
  clean: ["minimalist", "smooth", "solid"],
  cool: ["blue", "navy", "gray", "grey", "silver"],
  crisp: ["structured", "tailored", "smooth"],
  dark: ["black", "navy", "indigo", "burgundy", "brown", "olive", "charcoal"],
  delicate: ["light", "sheer", "lace", "silver", "gold"],
  denim: ["jeans", "jean"],
  drapey: ["fluid", "relaxed", "silk", "satin"],
  earthy: ["brown", "tan", "olive", "beige", "camel"],
  elevated: ["tailored", "quiet", "luxury", "formal"],
  flat: ["flats", "loafers", "sandals"],
  fluid: ["relaxed", "silk", "satin", "drapey"],
  heel: ["heels"],
  jacket: ["blazer", "coat", "outerwear"],
  leather: ["suede", "leather"],
  light: ["ivory", "cream", "white", "beige", "pastel"],
  loafer: ["loafers", "flats", "boots", "mule"],
  loafers: ["flats", "boots", "mule"],
  minimal: ["minimalist", "clean", "solid", "smooth"],
  muted: ["neutral", "beige", "gray", "grey", "olive", "tan"],
  neutral: [
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
  ],
  polished: ["tailored", "structured", "formal", "smart"],
  relaxed: ["oversized", "boxy", "wide"],
  rich: ["burgundy", "brown", "navy", "olive", "chocolate"],
  sleek: ["smooth", "slim", "fitted", "minimalist"],
  soft: ["knit", "fuzzy", "cashmere", "fluid", "relaxed"],
  straight: ["column", "regular", "tapered"],
  structured: ["tailored", "boxy", "column", "blazer"],
  tailored: ["structured", "fitted", "blazer"],
  tonal: ["monochrome", "neutral"],
  trouser: ["pants", "trousers", "bottoms"],
  warm: ["brown", "tan", "camel", "gold", "burgundy", "orange"],
};

const stopWords = new Set([
  "a",
  "and",
  "in",
  "of",
  "or",
  "the",
  "with",
  "look",
  "style",
  "styled",
  "styling",
  "outfit",
  "piece",
  "pieces",
  "wear",
]);

/** The searchable vocabulary of one owned garment. */
export function wardrobeItemTokens(item: WardrobeItem): Set<string> {
  const tokens = new Set(
    [
      item.name,
      item.category,
      item.subcategory,
      item.primaryColor,
      ...item.secondaryColors,
      item.pattern,
      item.texture ?? "",
      item.fit,
      item.silhouette ?? "",
      item.length ?? "",
      item.neckline ?? "",
      item.sleeveLength ?? "",
      item.rise ? `${item.rise} rise` : "",
      item.layeringRole ?? "",
      item.material,
      ...item.materialCandidates,
      ...item.styleTags,
      ...item.aestheticTags,
      item.formality ?? "",
      ...item.seasons,
      ...item.occasions,
      item.dominantStyleDirection ?? "",
    ].flatMap(tokenize),
  );
  const expansions = [
    ...levelWords(
      item.structureLevel,
      ["structured", "tailored", "crisp", "polished"],
      ["fluid", "soft", "drapey", "relaxed"],
    ),
    ...levelWords(
      item.visualWeight,
      ["statement", "bold", "heavy"],
      ["light", "delicate", "subtle", "minimal"],
    ),
    ...levelWords(
      item.statementLevel,
      ["statement", "standout"],
      ["quiet", "understated", "minimal"],
    ),
    ...levelWords(item.versatility, ["versatile", "everyday", "essential"], []),
  ];
  for (const token of expansions) tokens.add(token);
  return tokens;
}

const matchesToken = (token: string, itemTokens: ReadonlySet<string>) => {
  if (itemTokens.has(token)) return true;
  for (const synonym of traitSynonyms[token] ?? [])
    if (itemTokens.has(synonym)) return true;
  // Tolerate simple plurals/inflections ("loafers" vs "loafer").
  if (token.length > 4) {
    for (const candidate of itemTokens)
      if (candidate.startsWith(token.slice(0, -1))) return true;
  }
  return false;
};

/** How well an owned garment expresses a styling direction. Never negative. */
export function scoreDirectionFit(
  direction: StyleDirection,
  item: WardrobeItem,
): number {
  const tokens = wardrobeItemTokens(item);
  const traitScore = direction.desiredTraits.reduce((score, trait) => {
    const words = tokenize(trait).filter((word) => !stopWords.has(word));
    if (!words.length) return score;
    const matched = words.filter((word) => matchesToken(word, tokens)).length;
    // A fully matched multi-word trait is worth more than a lucky single word.
    return score + matched * 2 + (matched === words.length ? 2 : 0);
  }, 0);
  const colorScore = direction.colorDirection.reduce(
    (score, color) =>
      score +
      (tokenize(color).some((word) => matchesToken(word, tokens)) ? 3 : 0),
    0,
  );
  const styleScore = direction.styleTags.reduce(
    (score, tag) =>
      score +
      (tokenize(tag).some((word) => matchesToken(word, tokens)) ? 2 : 0),
    0,
  );
  const categoryScore = direction.desiredCategories.includes(item.category)
    ? 6
    : 0;
  return traitScore + colorScore + styleScore + categoryScore;
}

/** Owned items that express a direction, strongest first. */
export function matchDirectionToWardrobe(
  direction: StyleDirection,
  items: readonly WardrobeItem[],
  limit = 8,
): WardrobeItem[] {
  return items
    .map((item) => ({ item, score: scoreDirectionFit(direction, item) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .slice(0, limit)
    .map((entry) => entry.item);
}

/** The best owned stand-in for each direction, restricted to a candidate pool. */
export function mapDirectionsToWardrobe(
  directions: readonly StyleDirection[],
  pool: readonly WardrobeItem[],
  limit = 8,
): DirectionMatch[] {
  return directions
    .map((direction) => ({
      name: direction.name,
      itemIds: matchDirectionToWardrobe(direction, pool, limit).map(
        (item) => item.id,
      ),
    }))
    .filter((match) => match.itemIds.length > 0);
}

/** Highest direction affinity across all directions, used to bias ranking. */
export function directionAffinity(
  directions: readonly StyleDirection[],
  item: WardrobeItem,
): number {
  return directions.reduce(
    (best, direction) => Math.max(best, scoreDirectionFit(direction, item)),
    0,
  );
}
