import type { InspirationResult } from "@workspace/api-zod";
import type {
  InspirationQueryGarment,
  InspirationSearchOptions,
} from "./inspiration";

export type InspirationCacheKey = {
  selectedGarment?: InspirationQueryGarment;
  selectedGarments?: readonly InspirationQueryGarment[];
  queries: readonly string[];
  options: InspirationSearchOptions;
};

export type InspirationCacheOptions = {
  ttlMs?: number;
  now?: () => number;
};

type CacheEntry<Value> = {
  value: Value;
  expiresAt: number;
};

const normalizeText = (value: string | null | undefined) =>
  value?.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase() ??
  "";

const normalizeList = (values: readonly string[]) =>
  [...new Set(values.map(normalizeText).filter(Boolean))].sort();

export function createInspirationCacheKey(input: InspirationCacheKey): string {
  const garments = input.selectedGarments ?? (input.selectedGarment ? [input.selectedGarment] : []);
  return JSON.stringify({
    selectedGarments: garments.map((garment) => ({
      category: normalizeText(garment.category),
      subcategory: normalizeText(garment.subcategory),
      primaryColor: normalizeText(garment.primaryColor),
      materialCandidates: normalizeList(
        garment.materialCandidates,
      ),
      styleTags: normalizeList(garment.styleTags),
      formality: normalizeText(garment.formality),
    })),
    queries: normalizeList(input.queries),
    options: {
      occasion: normalizeText(input.options.occasion),
      style: normalizeText(input.options.style),
      formality: normalizeText(input.options.formality),
    },
  });
}

/** Cache key for the raw, normalized search hits of a single provider query. */
export function createSearchHitsCacheKey(
  provider: string,
  query: string,
): string {
  return JSON.stringify([normalizeText(provider), normalizeText(query)]);
}

/** Minimal in-memory TTL store shared by the inspiration caches. */
export class TtlCache<Value> {
  readonly #entries = new Map<string, CacheEntry<Value>>();
  readonly #ttlMs: number;
  readonly #now: () => number;

  constructor({
    ttlMs = 5 * 60_000,
    now = Date.now,
  }: InspirationCacheOptions = {}) {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0)
      throw new RangeError("Inspiration cache TTL must be greater than zero");
    this.#ttlMs = ttlMs;
    this.#now = now;
  }

  get(key: string): Value | undefined {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;
    if (this.#now() >= entry.expiresAt) {
      this.#entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: Value, ttlMs = this.#ttlMs): void {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0)
      throw new RangeError("Inspiration cache TTL must be greater than zero");
    this.#entries.set(key, { value, expiresAt: this.#now() + ttlMs });
  }

  clear(): void {
    this.#entries.clear();
  }
}

export class InspirationCache {
  readonly #entries: TtlCache<InspirationResult>;

  constructor(options: InspirationCacheOptions = {}) {
    this.#entries = new TtlCache<InspirationResult>(options);
  }

  get(key: InspirationCacheKey): InspirationResult | undefined {
    return this.#entries.get(createInspirationCacheKey(key));
  }

  set(
    key: InspirationCacheKey,
    value: InspirationResult,
    ttlMs?: number,
  ): void {
    this.#entries.set(createInspirationCacheKey(key), value, ttlMs);
  }

  clear(): void {
    this.#entries.clear();
  }
}
