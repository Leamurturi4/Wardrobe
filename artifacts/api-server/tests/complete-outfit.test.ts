import { test } from "node:test";
import assert from "node:assert/strict";
import {
  completeOutfitRequestSchema,
  styleProfileSchema,
  wardrobeItemSchema,
  type WardrobeItem,
} from "@workspace/api-zod";
import {
  ClothingAnalysisError,
} from "../src/services/clothing-analysis";
import {
  createStyleItemService,
  inferOutfitNeeds,
  type OutfitReasoner,
  type OutfitReasoningContext,
} from "../src/services/outfit-recommendation";
import type { InspirationSource } from "../src/services/inspiration";
import { DomainError, type WardrobeService } from "../src/services/wardrobe";

const now = "2026-01-01T00:00:00.000Z";
const item = (
  id: string,
  category: WardrobeItem["category"],
  overrides: Record<string, unknown> = {},
) =>
  wardrobeItemSchema.parse({
    id,
    name: id,
    category,
    primaryColor: "Black",
    originalImage: `/uploads/${id}.jpg`,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
const profile = styleProfileSchema.parse({
  id: "local",
  createdAt: now,
  updatedAt: now,
  aestheticTags: ["Minimalist"],
  preferredColors: ["Navy"],
  preferredStyleTags: ["Classic"],
});
const wardrobe = (items: WardrobeItem[]): WardrobeService =>
  ({
    getItem: async (id: string) => {
      const found = items.find((value) => value.id === id);
      if (!found) throw new DomainError(404, "Record not found");
      return found;
    },
    listItems: async () => items,
    getProfile: async () => profile,
  }) as unknown as WardrobeService;
const draft = (ids: string[]) => ({
  outfits: [
    {
      itemIds: ids,
      title: "Completed anchors",
      explanation: "The shoes ground the two anchors while preserving their clean proportions.",
      styleTags: ["Classic"],
      occasionFit: "Work",
    },
  ],
});

test("complete-outfit request requires two or three unique anchors", () => {
  assert.equal(
    completeOutfitRequestSchema.safeParse({ anchorItemIds: ["one"] }).success,
    false,
  );
  assert.equal(
    completeOutfitRequestSchema.safeParse({ anchorItemIds: ["one", "one"] })
      .success,
    false,
  );
  assert.equal(
    completeOutfitRequestSchema.safeParse({
      anchorItemIds: ["one", "two", "three", "four"],
    }).success,
    false,
  );
  assert.equal(
    completeOutfitRequestSchema.safeParse({
      anchorItemIds: ["one", "two"],
      useInspiration: true,
    }).success,
    true,
  );
});

test("missing-category inference distinguishes required and optional structure", () => {
  assert.deepEqual(
    inferOutfitNeeds([item("top", "Tops"), item("bottom", "Bottoms")]),
    {
      required: ["Shoes"],
      optional: ["Outerwear", "Bags", "Accessories", "Jewelry"],
    },
  );
  assert.deepEqual(
    inferOutfitNeeds([item("dress", "Dresses"), item("shoes", "Shoes")])
      .required,
    [],
  );
  assert.deepEqual(
    inferOutfitNeeds([item("top", "Tops"), item("shoes", "Shoes")])
      .required,
    ["Bottoms"],
  );
});

test("two-anchor completion retains every anchor and uses Style DNA", async () => {
  const top = item("top", "Tops", { primaryColor: "Ivory" });
  const bottom = item("bottom", "Bottoms", { primaryColor: "Navy" });
  const shoes = item("shoes", "Shoes");
  const bag = item("bag", "Bags");
  let context: OutfitReasoningContext | undefined;
  const reasoner: OutfitReasoner = {
    recommend: async (value) => {
      context = value;
      return draft([top.id, bottom.id, shoes.id, bag.id]);
    },
  };
  const result = await createStyleItemService(
    wardrobe([top, bottom, shoes, bag]),
    reasoner,
  ).complete({
    anchorItemIds: [top.id, bottom.id],
    occasion: "Work",
    style: "Classic",
  });
  assert.deepEqual(result.anchorItemIds, [top.id, bottom.id]);
  assert(result.outfits.every((look) =>
    [top.id, bottom.id].every((id) => look.itemIds.includes(id))));
  assert.deepEqual(result.outfits[0]?.missingCategories, []);
  assert.deepEqual(context?.anchorItems?.map((anchor) => anchor.id), [
    top.id,
    bottom.id,
  ]);
  assert.deepEqual(context?.requiredCategories, ["Shoes"]);
  assert.deepEqual(context?.styleProfile.aestheticTags, ["Minimalist"]);
});

test("three-anchor completion retains all anchors", async () => {
  const top = item("top", "Tops");
  const bottom = item("bottom", "Bottoms");
  const shoes = item("shoes", "Shoes");
  const bag = item("bag", "Bags");
  const result = await createStyleItemService(
    wardrobe([top, bottom, shoes, bag]),
    { recommend: async () => draft([top.id, bottom.id, shoes.id, bag.id]) },
  ).complete({ anchorItemIds: [top.id, bottom.id, shoes.id] });
  assert(result.outfits.every((look) =>
    [top.id, bottom.id, shoes.id].every((id) => look.itemIds.includes(id))));
});

test("missing and unavailable anchors are rejected", async () => {
  const top = item("top", "Tops");
  const unavailable = item("unavailable", "Bottoms", {
    availability: "unavailable",
  });
  const service = createStyleItemService(wardrobe([top, unavailable]), {
    recommend: async () => draft([top.id, unavailable.id]),
  });
  await assert.rejects(
    service.complete({ anchorItemIds: [top.id, "missing"] }),
    (error: unknown) => error instanceof DomainError && error.status === 404,
  );
  await assert.rejects(
    service.complete({ anchorItemIds: [top.id, unavailable.id] }),
    (error: unknown) => error instanceof DomainError && error.status === 422,
  );
});

test("insufficient wardrobe returns anchors with explicit missing categories", async () => {
  const top = item("top", "Tops");
  const bottom = item("bottom", "Bottoms");
  let calls = 0;
  const result = await createStyleItemService(wardrobe([top, bottom]), {
    recommend: async () => {
      calls += 1;
      return draft([top.id, bottom.id]);
    },
  }).complete({ anchorItemIds: [top.id, bottom.id] });
  assert.equal(calls, 0);
  assert.deepEqual(result.outfits[0]?.itemIds, [top.id, bottom.id]);
  assert.deepEqual(result.outfits[0]?.missingCategories, ["Shoes"]);
});

test("complete-outfit rejects invented IDs and any result missing an anchor", async () => {
  const top = item("top", "Tops");
  const bottom = item("bottom", "Bottoms");
  const shoes = item("shoes", "Shoes");
  for (const ids of [
    [top.id, bottom.id, "invented"],
    [top.id, shoes.id],
  ]) {
    const service = createStyleItemService(wardrobe([top, bottom, shoes]), {
      recommend: async () => draft(ids),
    });
    await assert.rejects(
      service.complete({ anchorItemIds: [top.id, bottom.id] }),
      (error: unknown) =>
        error instanceof ClothingAnalysisError && error.status === 502,
    );
  }
});

test("complete-outfit inspiration failure falls back to wardrobe-only reasoning", async () => {
  const top = item("top", "Tops");
  const bottom = item("bottom", "Bottoms");
  const shoes = item("shoes", "Shoes");
  let context: OutfitReasoningContext | undefined;
  const source: InspirationSource = {
    search: async () => ({ provider: "unused", directions: [] }),
    searchAnchors: async () => {
      throw new Error("search unavailable");
    },
  };
  const result = await createStyleItemService(
    wardrobe([top, bottom, shoes]),
    {
      recommend: async (value) => {
        context = value;
        return draft([top.id, bottom.id, shoes.id]);
      },
    },
    source,
  ).complete({
    anchorItemIds: [top.id, bottom.id],
    useInspiration: true,
  });
  assert.equal(result.inspirationProvider, null);
  assert.equal(context?.inspiration, undefined);
});

test("missing OpenAI configuration falls back to deterministic owned-wardrobe completions", async () => {
  const top = item("top", "Tops", { name: "Silk blouse" });
  const bottom = item("bottom", "Bottoms", { name: "Dark jeans" });
  const shoes = item("shoes", "Shoes", { name: "Chelsea boots" });
  const bag = item("bag", "Bags", { name: "Leather tote" });
  const result = await createStyleItemService(
    wardrobe([top, bottom, shoes, bag]),
    {
      recommend: async () => {
        throw new ClothingAnalysisError(
          503,
          "AI is not configured. You can continue manually.",
        );
      },
    },
  ).complete({ anchorItemIds: [top.id, bottom.id] });

  assert(result.outfits.length > 0);
  assert(
    result.outfits.every((look) =>
      [top.id, bottom.id].every((id) => look.itemIds.includes(id)),
    ),
  );
  assert(
    result.outfits
      .flatMap((look) => look.itemIds)
      .every((id) => [top.id, bottom.id, shoes.id, bag.id].includes(id)),
  );
  assert(result.outfits.some((look) => look.itemIds.includes(shoes.id)));
  assert.equal(result.outfits[0]?.missingCategories.length, 0);
});

test("Complete My Outfit falls back on OpenAI timeout and 5xx, but not malformed output", async () => {
  const top = item("top", "Tops");
  const bottom = item("bottom", "Bottoms");
  const shoes = item("shoes", "Shoes");
  for (const error of [
    new ClothingAnalysisError(504, "AI timed out.", {
      provider: "openai",
      model: "gpt-5.4-mini",
      errorType: "timeout",
    }),
    new ClothingAnalysisError(502, "AI unavailable.", {
      provider: "openai",
      model: "gpt-5.4-mini",
      status: 503,
      errorType: "server_error",
    }),
  ]) {
    const result = await createStyleItemService(
      wardrobe([top, bottom, shoes]),
      { recommend: async () => { throw error; } },
    ).complete({ anchorItemIds: [top.id, bottom.id] });
    assert(result.outfits.some((look) => look.itemIds.includes(shoes.id)));
  }
  const invalid = new ClothingAnalysisError(502, "AI returned invalid JSON.", {
    provider: "openai",
    model: "gpt-5.4-mini",
    errorType: "malformed_structured_output",
  });
  await assert.rejects(
    () => createStyleItemService(
      wardrobe([top, bottom, shoes]),
      { recommend: async () => { throw invalid; } },
    ).complete({ anchorItemIds: [top.id, bottom.id] }),
    (error: unknown) => error === invalid,
  );
});
