import type { InspirationResult } from "@workspace/api-zod";
import type {
  InspirationQueryGarment,
  InspirationSearchOptions,
} from "./inspiration";

export type InspirationCacheKey = {
  selectedGarment: InspirationQueryGarment;
  queries: readonly string[];
  options: InspirationSearchOptions;
};

export type InspirationCacheOptions = {
  ttlMs?: number;
  now?: () => number;
};

type CacheEntry = {
  value: InspirationResult;
  expiresAt: number;
};

const normalizeText = (value: string | null | undefined) =>
  value?.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase() ??
  "";

const normalizeList = (values: readonly string[]) =>
  [...new Set(values.map(normalizeText).filter(Boolean))].sort();

export function createInspirationCacheKey(input: InspirationCacheKey): string {
  return JSON.stringify({
    selectedGarment: {
      category: normalizeText(input.selectedGarment.category),
      subcategory: normalizeText(input.selectedGarment.subcategory),
      primaryColor: normalizeText(input.selectedGarment.primaryColor),
      materialCandidates: normalizeList(
        input.selectedGarment.materialCandidates,
      ),
      styleTags: normalizeList(input.selectedGarment.styleTags),
      formality: normalizeText(input.selectedGarment.formality),
    },
    queries: normalizeList(input.queries),
    options: {
      occasion: normalizeText(input.options.occasion),
      style: normalizeText(input.options.style),
      formality: normalizeText(input.options.formality),
    },
  });
}

export class InspirationCache {
  readonly #entries = new Map<string, CacheEntry>();
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

  get(key: InspirationCacheKey): InspirationResult | undefined {
    const normalizedKey = createInspirationCacheKey(key);
    const entry = this.#entries.get(normalizedKey);
    if (!entry) return undefined;
    if (this.#now() >= entry.expiresAt) {
      this.#entries.delete(normalizedKey);
      return undefined;
    }
    return entry.value;
  }

  set(
    key: InspirationCacheKey,
    value: InspirationResult,
    ttlMs = this.#ttlMs,
  ): void {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0)
      throw new RangeError("Inspiration cache TTL must be greater than zero");
    this.#entries.set(createInspirationCacheKey(key), {
      value,
      expiresAt: this.#now() + ttlMs,
    });
  }

  clear(): void {
    this.#entries.clear();
  }
}
