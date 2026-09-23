import { test } from "node:test";
import assert from "node:assert/strict";
import {
  styleDirectionSchema,
  wardrobeItemSchema,
  type StyleDirection,
  type WardrobeItem,
} from "@workspace/api-zod";
import type { OpenAIStructuredClient } from "../src/services/openai-client";
import { InspirationCache, TtlCache } from "../src/services/inspiration-cache";
import type { StyleDirectionExtractor } from "../src/services/inspiration-directions";
import {
  createConfiguredInspirationSource,
  createOnlineInspirationSource,
} from "../src/services/inspiration-source";
import {
  InspirationSearchError,
  type InspirationHit,
  type InspirationSearchProvider,
} from "../src/services/inspiration-search";

const now = "2026-01-01T00:00:00.000Z";
const blouse: WardrobeItem = wardrobeItemSchema.parse({
  id: "blouse",
  name: "Ivory satin blouse",
  category: "Tops",
  subcategory: "Blouse",
  primaryColor: "Ivory",
  materialCandidates: ["Satin"],
  styleTags: ["Minimalist"],
  formality: "Smart Casual",
  originalImage: "/uploads/blouse.jpg",
  createdAt: now,
  updatedAt: now,
});

// Distinct titles per query, so hit deduplication does not collapse fixtures.
const hit = (url: string, query: string): InspirationHit => ({
  title: `Reference for ${query}`,
  source: "example.com",
  sourceUrl: url,
  imageUrl: null,
  snippet: "Dark denim and loafers.",
  query,
});

const direction: StyleDirection = styleDirectionSchema.parse({
  name: "Polished dark denim",
  desiredCategories: ["Bottoms"],
  desiredTraits: ["dark denim"],
  colorDirection: ["indigo"],
  styleTags: ["polished"],
  reasoning: "Dark denim sharpens a fluid blouse.",
  sourceReferences: [
    {
      provider: "example.com",
      title: "Styling notes",
      url: "https://example.com/looks/1",
    },
  ],
});

const stubProvider = (
  search: (query: string) => Promise<InspirationHit[]>,
  configured = true,
): InspirationSearchProvider => ({
  name: "stub-search",
  configured,
  search,
});

const stubExtractor = (
  directions: StyleDirection[] = [direction],
): { extractor: StyleDirectionExtractor; calls: number[] } => {
  const state = { calls: [] as number[] };
  return {
    extractor: {
      extract: async (input) => {
        state.calls.push(input.hits.length);
        return directions;
      },
    },
    calls: state.calls,
  };
};

test("the online pipeline searches, normalizes, and returns extracted directions", async () => {
  const queries: string[] = [];
  const { extractor, calls } = stubExtractor();
  const source = createOnlineInspirationSource({
    provider: stubProvider(async (query) => {
      queries.push(query);
      return [hit(`https://example.com/${queries.length}`, query)];
    }),
    extractor,
  });

  const result = await source.search(blouse, { occasion: "Work" });

  assert.equal(result.provider, "stub-search");
  assert.deepEqual(result.directions, [direction]);
  assert.equal(queries.length, 3);
  assert.equal(queries[0], "ivory satin blouse outfit");
  assert.equal(calls[0], 3);
});

test("the online pipeline searches from the combined anchor set", async () => {
  const jeans = wardrobeItemSchema.parse({
    id: "jeans",
    name: "Dark denim jeans",
    category: "Bottoms",
    subcategory: "Jeans",
    primaryColor: "Navy",
    materialCandidates: ["Denim"],
    originalImage: "/uploads/jeans.jpg",
    createdAt: now,
    updatedAt: now,
  });
  const queries: string[] = [];
  let extractedAnchors = 0;
  const source = createOnlineInspirationSource({
    provider: stubProvider(async (query) => {
      queries.push(query);
      return [hit(`https://example.com/combined-${queries.length}`, query)];
    }),
    extractor: {
      extract: async (input) => {
        extractedAnchors = input.garments?.length ?? 1;
        return [direction];
      },
    },
  });
  const result = await source.searchAnchors?.([blouse, jeans], {
    occasion: "Work",
  });
  assert.equal(result?.provider, "stub-search");
  assert.match(queries[0] ?? "", /ivory satin blouse navy denim jeans outfit/);
  assert.equal(extractedAnchors, 2);
});

test("search queries describe the garment only and leak no personal data", async () => {
  const queries: string[] = [];
  const { extractor } = stubExtractor();
  const personal = wardrobeItemSchema.parse({
    ...blouse,
    name: "Jane Doe's blouse from Tirana",
    description: "Gift from mum, kept at home in Tirana",
    brand: "jane.doe@example.com",
  });
  await createOnlineInspirationSource({
    provider: stubProvider(async (query) => {
      queries.push(query);
      return [hit("https://example.com/1", query)];
    }),
    extractor,
  }).search(personal, { occasion: "Work" });

  const combined = queries.join(" ");
  assert(queries.length > 0);
  assert.doesNotMatch(combined, /jane|doe|tirana|mum|example\.com|@/i);
});

test("cached results are reused and the provider is not called again", async () => {
  let searches = 0;
  const { extractor, calls } = stubExtractor();
  const source = createOnlineInspirationSource({
    provider: stubProvider(async (query) => {
      searches += 1;
      return [hit(`https://example.com/${searches}`, query)];
    }),
    extractor,
  });

  const first = await source.search(blouse, { occasion: "Work" });
  const second = await source.search(blouse, { occasion: "Work" });

  assert.equal(second, first);
  assert.equal(searches, 3);
  assert.equal(calls.length, 1);
});

test("hit caching prevents repeat searches for a query shared by another request", async () => {
  let searches = 0;
  const { extractor } = stubExtractor();
  const hitCache = new TtlCache<InspirationHit[]>({ ttlMs: 60_000 });
  const source = createOnlineInspirationSource({
    provider: stubProvider(async (query) => {
      searches += 1;
      return [hit(`https://example.com/${searches}`, query)];
    }),
    extractor,
    hitCache,
  });

  await source.search(blouse, { occasion: "Work" });
  // A different styling option misses the direction cache but not the hits.
  await source.search(blouse, { occasion: "Evening" });

  assert.equal(searches, 3);
});

test("expired direction cache entries trigger a fresh search", async () => {
  let clock = 0;
  let searches = 0;
  const { extractor } = stubExtractor();
  const source = createOnlineInspirationSource({
    provider: stubProvider(async (query) => {
      searches += 1;
      return [hit(`https://example.com/${searches}`, query)];
    }),
    extractor,
    cache: new InspirationCache({ ttlMs: 1_000, now: () => clock }),
    hitCache: new TtlCache<InspirationHit[]>({
      ttlMs: 1_000,
      now: () => clock,
    }),
  });

  await source.search(blouse, {});
  clock = 5_000;
  await source.search(blouse, {});

  assert.equal(searches, 6);
});

test("missing credentials return no directions without touching the provider", async () => {
  let searches = 0;
  const { extractor, calls } = stubExtractor();
  const result = await createOnlineInspirationSource({
    provider: stubProvider(async () => {
      searches += 1;
      return [];
    }, false),
    extractor,
  }).search(blouse, {});

  assert.deepEqual(result, { provider: "stub-search", directions: [] });
  assert.equal(searches, 0);
  assert.equal(calls.length, 0);
});

test("provider failures, timeouts, empty results and extraction failures all degrade quietly", async () => {
  const errors: unknown[] = [];
  const { extractor } = stubExtractor();
  const cases: InspirationSearchProvider["search"][] = [
    async () => {
      throw new InspirationSearchError(502, "provider unavailable");
    },
    async () => {
      throw new InspirationSearchError(504, "provider timed out");
    },
    async () => [],
  ];
  for (const search of cases) {
    const result = await createOnlineInspirationSource({
      provider: stubProvider(search),
      extractor,
      onError: (error) => errors.push(error),
    }).search(blouse, {});
    assert.deepEqual(result, { provider: "stub-search", directions: [] });
  }

  const failingExtractor: StyleDirectionExtractor = {
    extract: async () => {
      throw new Error("OpenAI failed");
    },
  };
  assert.deepEqual(
    await createOnlineInspirationSource({
      provider: stubProvider(async (query) => [
        hit("https://example.com/1", query),
      ]),
      extractor: failingExtractor,
      onError: (error) => errors.push(error),
    }).search(blouse, {}),
    { provider: "stub-search", directions: [] },
  );

  const emptyExtractor: StyleDirectionExtractor = { extract: async () => [] };
  assert.deepEqual(
    await createOnlineInspirationSource({
      provider: stubProvider(async (query) => [
        hit("https://example.com/1", query),
      ]),
      extractor: emptyExtractor,
    }).search(blouse, {}),
    { provider: "stub-search", directions: [] },
  );
  assert(errors.length >= 3);
});

test("one failing query still yields directions from the queries that succeeded", async () => {
  let searches = 0;
  const { extractor, calls } = stubExtractor();
  const result = await createOnlineInspirationSource({
    provider: stubProvider(async (query) => {
      searches += 1;
      if (searches === 1)
        throw new InspirationSearchError(502, "provider unavailable");
      return [hit(`https://example.com/${searches}`, query)];
    }),
    extractor,
  }).search(blouse, {});

  assert.deepEqual(result.directions, [direction]);
  assert.equal(calls[0], 2);
});

test("the configured source is null without credentials and real with them", () => {
  const client: OpenAIStructuredClient = {
    generateJson: async () => ({ directions: [] }),
  };
  assert.equal(createConfiguredInspirationSource({}, client), null);
  assert.equal(
    createConfiguredInspirationSource(
      { INSPIRATION_SEARCH_API_KEY: "   " },
      client,
    ),
    null,
  );
  assert(
    createConfiguredInspirationSource(
      { INSPIRATION_SEARCH_API_KEY: "token" },
      client,
    ),
  );
});
