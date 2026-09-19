import { test } from "node:test";
import assert from "node:assert/strict";
import type { InspirationResult } from "@workspace/api-zod";
import {
  InspirationCache,
  type InspirationCacheKey,
} from "../src/services/inspiration-cache";

const baseKey: InspirationCacheKey = {
  selectedGarment: {
    category: "Tops",
    subcategory: "Blouse",
    primaryColor: "Ivory",
    materialCandidates: ["Satin", "Silk"],
    styleTags: ["Minimalist", "Classic"],
    formality: "Smart Casual",
  },
  queries: ["ivory satin blouse outfit", "satin blouse minimalist styling"],
  options: { occasion: "Dinner", style: "Minimalist" },
};

const result: InspirationResult = {
  provider: "test-provider",
  directions: [],
};

test("cache misses before set, hits normalized equivalent keys, and clears", () => {
  const cache = new InspirationCache();
  assert.equal(cache.get(baseKey), undefined);

  cache.set(baseKey, result);
  const equivalentKey: InspirationCacheKey = {
    selectedGarment: {
      ...baseKey.selectedGarment,
      primaryColor: "  IVORY ",
      materialCandidates: ["silk", " satin "],
      styleTags: ["classic", "MINIMALIST"],
    },
    queries: [" SATIN blouse minimalist styling ", "IVORY SATIN BLOUSE OUTFIT"],
    options: { occasion: " dinner ", style: "MINIMALIST" },
  };
  assert.equal(cache.get(equivalentKey), result);

  cache.clear();
  assert.equal(cache.get(baseKey), undefined);
});

test("cache entries expire according to their TTL", () => {
  let now = 1_000;
  const cache = new InspirationCache({ ttlMs: 500, now: () => now });
  cache.set(baseKey, result);

  now = 1_499;
  assert.equal(cache.get(baseKey), result);
  now = 1_500;
  assert.equal(cache.get(baseKey), undefined);
});

test("cache supports per-entry TTL overrides", () => {
  let now = 0;
  const cache = new InspirationCache({ ttlMs: 1_000, now: () => now });
  cache.set(baseKey, result, 100);

  now = 100;
  assert.equal(cache.get(baseKey), undefined);
});

test("distinct garments, queries, and options use distinct cache keys", () => {
  const cache = new InspirationCache();
  cache.set(baseKey, result);

  assert.equal(
    cache.get({
      ...baseKey,
      selectedGarment: {
        ...baseKey.selectedGarment,
        primaryColor: "Navy",
      },
    }),
    undefined,
  );
  assert.equal(
    cache.get({ ...baseKey, queries: ["navy blouse outfit"] }),
    undefined,
  );
  assert.equal(
    cache.get({ ...baseKey, options: { occasion: "Work" } }),
    undefined,
  );
});
