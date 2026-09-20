import {
  inspirationResultSchema,
  type InspirationResult,
  type WardrobeItem,
} from "@workspace/api-zod";
import type { GeminiStructuredClient } from "./clothing-analysis";
import {
  generateCombinedInspirationQueries,
  generateInspirationQueries,
  type InspirationSource,
} from "./inspiration";
import {
  createSearchHitsCacheKey,
  InspirationCache,
  TtlCache,
} from "./inspiration-cache";
import {
  createGeminiStyleDirectionExtractor,
  type StyleDirectionExtractor,
} from "./inspiration-directions";
import {
  createBraveInspirationSearchProvider,
  deduplicateInspirationHits,
  type InspirationHit,
  type InspirationSearchProvider,
} from "./inspiration-search";

export const DEFAULT_INSPIRATION_QUERIES = 3;
export const DEFAULT_INSPIRATION_HITS = 12;
export const DEFAULT_INSPIRATION_CACHE_TTL_MS = 15 * 60_000;

export type OnlineInspirationOptions = {
  provider: InspirationSearchProvider;
  extractor: StyleDirectionExtractor;
  cache?: InspirationCache;
  hitCache?: TtlCache<InspirationHit[]>;
  maxQueries?: number;
  maxHits?: number;
  onError?: (error: unknown) => void;
};

/**
 * The real online inspiration pipeline:
 * garment -> queries -> external search -> normalized hits -> StyleDirections.
 *
 * It never throws: every failure mode (missing credentials, network error,
 * timeout, malformed payload, no usable results, direction-extraction failure)
 * resolves to an empty direction list, which the Style This Item engine treats
 * as wardrobe-only styling.
 */
export function createOnlineInspirationSource({
  provider,
  extractor,
  cache = new InspirationCache({ ttlMs: DEFAULT_INSPIRATION_CACHE_TTL_MS }),
  hitCache = new TtlCache<InspirationHit[]>({
    ttlMs: DEFAULT_INSPIRATION_CACHE_TTL_MS,
  }),
  maxQueries = DEFAULT_INSPIRATION_QUERIES,
  maxHits = DEFAULT_INSPIRATION_HITS,
  onError,
}: OnlineInspirationOptions): InspirationSource {
  const empty: InspirationResult = { provider: provider.name, directions: [] };
  const report = (error: unknown) => {
    onError?.(error);
  };
  const search = async (
    selectedGarments: readonly WardrobeItem[],
    options: Parameters<InspirationSource["search"]>[1],
  ) => {
      if (!provider.configured) return empty;
      try {
        const queries = (selectedGarments.length === 1
          ? generateInspirationQueries(selectedGarments[0]!)
          : generateCombinedInspirationQueries(selectedGarments)
        ).slice(
          0,
          maxQueries,
        );
        if (!queries.length) return empty;
        const cacheKey = { selectedGarments, queries, options };
        const cached = cache.get(cacheKey);
        if (cached) return cached;

        const searches = await Promise.allSettled(
          queries.map(async (query) => {
            const hitKey = createSearchHitsCacheKey(provider.name, query);
            const cachedHits = hitCache.get(hitKey);
            if (cachedHits) return cachedHits;
            const hits = await provider.search(query);
            hitCache.set(hitKey, hits);
            return hits;
          }),
        );
        for (const settled of searches)
          if (settled.status === "rejected") report(settled.reason);
        const hits = deduplicateInspirationHits(
          searches.flatMap((settled) =>
            settled.status === "fulfilled" ? settled.value : [],
          ),
        ).slice(0, maxHits);
        if (!hits.length) return empty;

        const directions = await extractor.extract({
          garment: selectedGarments[0]!,
          garments: selectedGarments,
          hits,
          options,
        });
        if (!directions.length) return empty;
        const result = inspirationResultSchema.parse({
          provider: provider.name,
          directions,
        });
        cache.set(cacheKey, result);
        return result;
      } catch (error) {
        report(error);
        return empty;
      }
  };
  return {
    search(selectedGarment, options) {
      return search([selectedGarment], options);
    },
    searchAnchors(selectedGarments, options) {
      return search(selectedGarments, options);
    },
  };
}

export type InspirationEnvironment = {
  INSPIRATION_SEARCH_API_KEY?: string | undefined;
  INSPIRATION_SEARCH_ENDPOINT?: string | undefined;
  INSPIRATION_SEARCH_TIMEOUT_MS?: string | undefined;
  INSPIRATION_CACHE_TTL_MS?: string | undefined;
};

const positiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Builds the configured inspiration source, or `null` when credentials are
 * missing so the caller can keep the wardrobe-only source in place.
 */
export function createConfiguredInspirationSource(
  env: InspirationEnvironment,
  client: GeminiStructuredClient,
  onError?: (error: unknown) => void,
): InspirationSource | null {
  const provider = createBraveInspirationSearchProvider({
    apiKey: env.INSPIRATION_SEARCH_API_KEY,
    endpoint: env.INSPIRATION_SEARCH_ENDPOINT,
    timeoutMs: positiveNumber(env.INSPIRATION_SEARCH_TIMEOUT_MS, 6_000),
  });
  if (!provider.configured) return null;
  const ttlMs = positiveNumber(
    env.INSPIRATION_CACHE_TTL_MS,
    DEFAULT_INSPIRATION_CACHE_TTL_MS,
  );
  return createOnlineInspirationSource({
    provider,
    extractor: createGeminiStyleDirectionExtractor(client, provider.name),
    cache: new InspirationCache({ ttlMs }),
    hitCache: new TtlCache<InspirationHit[]>({ ttlMs }),
    ...(onError ? { onError } : {}),
  });
}
