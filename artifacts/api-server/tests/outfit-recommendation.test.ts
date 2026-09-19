import { test } from "node:test";
import assert from "node:assert/strict";
import {
  styleProfileSchema,
  wardrobeItemSchema,
  type WardrobeItem,
} from "@workspace/api-zod";
import {
  ClothingAnalysisError,
  type GeminiStructuredClient,
} from "../src/services/clothing-analysis";
import {
  buildCandidatePool,
  createGeminiOutfitReasoner,
  createStyleItemService,
  missingCategories,
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
  preferredBrands: ["Atelier"],
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

test("style-item keeps the selected item, uses only real IDs, ranks complete looks, and includes Style DNA", async () => {
  const selected = item("selected", "Tops", {
    primaryColor: "Ivory",
    styleTags: ["Classic"],
  });
  const bottom = item("bottom", "Bottoms", {
    primaryColor: "Navy",
    styleTags: ["Classic"],
  });
  const shoes = item("shoes", "Shoes", { favorite: true });
  const bag = item("bag", "Bags");
  let context: OutfitReasoningContext | undefined;
  const reasoner: OutfitReasoner = {
    recommend: async (value) => {
      context = value;
      return {
        outfits: [
          {
            itemIds: [selected.id, bottom.id],
            title: "Partial",
            explanation: "The dark bottom anchors the light top.",
            styleTags: ["Classic"],
            occasionFit: null,
          },
          {
            itemIds: [selected.id, bottom.id, shoes.id, bag.id],
            title: "Complete",
            explanation:
              "Navy creates tonal contrast while structured shoes finish the proportions.",
            styleTags: ["Classic"],
            occasionFit: "Work",
          },
        ],
      };
    },
  };
  const result = await createStyleItemService(
    wardrobe([selected, bottom, shoes, bag]),
    reasoner,
  ).recommend({ wardrobeItemId: selected.id });
  assert(
    result.outfits.every((outfit) => outfit.itemIds.includes(selected.id)),
  );
  assert(
    result.outfits
      .flatMap((outfit) => outfit.itemIds)
      .every((id) => [selected.id, bottom.id, shoes.id, bag.id].includes(id)),
  );
  assert.equal(result.outfits[0]?.title, "Complete");
  assert.deepEqual(result.outfits[0]?.missingCategories, []);
  assert.deepEqual(context?.styleProfile.aestheticTags, ["Minimalist"]);
  assert.equal(
    context?.candidatePool.some((candidate) => candidate.id === selected.id),
    false,
  );
  assert.equal(context?.inspiration, undefined);
});

test("Gemini reasoning prompt contains compact metadata, allowed IDs, and Style DNA but no images", async () => {
  const selected = item("selected", "Tops", { styleTags: ["Classic"] });
  const bottom = item("bottom", "Bottoms");
  let prompt = "";
  let responseSchema: unknown;
  const client: GeminiStructuredClient = {
    generateJson: async (input) => {
      prompt = input.prompt;
      responseSchema = input.responseSchema;
      return { outfits: [] };
    },
  };
  await createGeminiOutfitReasoner(client).recommend({
    request: { wardrobeItemId: selected.id },
    selectedItem: selected,
    candidatePool: [bottom],
    styleProfile: profile,
  });
  assert.match(prompt, /"styleDNA"/);
  assert.match(prompt, /"Minimalist"/);
  assert.match(prompt, /"selected"/);
  assert.match(prompt, /"bottom"/);
  assert.doesNotMatch(prompt, /originalImage|\/uploads\//);
  assert(JSON.stringify(responseSchema).includes(selected.id));
  assert(JSON.stringify(responseSchema).includes(bottom.id));

  const wardrobeOnlyPrompt = prompt;
  await createGeminiOutfitReasoner(client).recommend({
    request: { wardrobeItemId: selected.id, useInspiration: false },
    selectedItem: selected,
    candidatePool: [bottom],
    styleProfile: profile,
  });
  assert.equal(prompt, wardrobeOnlyPrompt);

  await createGeminiOutfitReasoner(client).recommend({
    request: { wardrobeItemId: selected.id, useInspiration: true },
    selectedItem: selected,
    candidatePool: [bottom],
    styleProfile: profile,
    inspiration: {
      provider: "test-provider",
      directions: [
        {
          name: "Tonal",
          desiredCategories: ["Bottoms"],
          desiredTraits: ["structured"],
          colorDirection: ["tonal"],
          styleTags: ["Minimalist"],
          reasoning: "Keep the silhouette clean.",
          sourceReferences: [],
        },
      ],
    },
  });
  assert.match(prompt, /provided inspiration only as creative direction/);
  assert.match(prompt, /"inspiration"/);
});

test("inspiration is optional, opt-in, normalized, and passed to the reasoner", async () => {
  const selected = item("selected", "Tops");
  const bottom = item("bottom", "Bottoms");
  let searches = 0;
  let context: OutfitReasoningContext | undefined;
  const source: InspirationSource = {
    search: async (garment, options) => {
      searches += 1;
      assert.equal(garment.id, selected.id);
      assert.equal(options.occasion, "Dinner");
      return {
        provider: "test-provider",
        directions: [
          {
            name: "Tonal evening",
            desiredCategories: ["Bottoms", "Shoes"],
            desiredTraits: ["structured"],
            colorDirection: ["monochrome"],
            styleTags: ["Minimalist"],
            reasoning: "Use a clean tonal column with a structured contrast.",
            sourceReferences: [
              {
                provider: "test-provider",
                title: "Reference look",
                url: "https://example.com/look",
              },
            ],
          },
        ],
      };
    },
  };
  const reasoner: OutfitReasoner = {
    recommend: async (value) => {
      context = value;
      return {
        outfits: [
          {
            itemIds: [selected.id, bottom.id],
            title: "Wardrobe look",
            explanation: "The existing bottom completes the look.",
            styleTags: ["Minimalist"],
            occasionFit: "Dinner",
          },
        ],
      };
    },
  };
  const service = createStyleItemService(
    wardrobe([selected, bottom]),
    reasoner,
    source,
  );

  await service.recommend({ wardrobeItemId: selected.id });
  assert.equal(searches, 0);
  assert.equal(context?.inspiration, undefined);

  await service.recommend({
    wardrobeItemId: selected.id,
    occasion: "Dinner",
    useInspiration: true,
  });
  assert.equal(searches, 1);
  assert.equal(context?.inspiration?.provider, "test-provider");
  assert.equal(context?.inspiration?.directions[0]?.name, "Tonal evening");
});

test("useInspiration false preserves output and never calls the provider", async () => {
  const selected = item("selected", "Tops");
  const bottom = item("bottom", "Bottoms");
  let searches = 0;
  const source: InspirationSource = {
    search: async () => {
      searches += 1;
      return { provider: "unused", directions: [] };
    },
  };
  const reasoner: OutfitReasoner = {
    recommend: async () => ({
      outfits: [
        {
          itemIds: [selected.id, bottom.id],
          title: "Unchanged",
          explanation: "The wardrobe pieces work together.",
          styleTags: [],
          occasionFit: null,
        },
      ],
    }),
  };
  const service = createStyleItemService(
    wardrobe([selected, bottom]),
    reasoner,
    source,
  );
  const omitted = await service.recommend({ wardrobeItemId: selected.id });
  const disabled = await service.recommend({
    wardrobeItemId: selected.id,
    useInspiration: false,
  });

  assert.deepEqual(disabled, omitted);
  assert.equal(searches, 0);
});

test("invalid inspiration provider data is rejected before reasoning", async () => {
  const selected = item("selected", "Tops");
  const bottom = item("bottom", "Bottoms");
  let reasoningCalls = 0;
  const invalidSource = {
    search: async () => ({
      provider: "broken",
      directions: [{ name: "Incomplete direction" }],
    }),
  } as unknown as InspirationSource;
  const reasoner: OutfitReasoner = {
    recommend: async () => {
      reasoningCalls += 1;
      return { outfits: [] };
    },
  };

  await assert.rejects(
    () =>
      createStyleItemService(
        wardrobe([selected, bottom]),
        reasoner,
        invalidSource,
      ).recommend({ wardrobeItemId: selected.id, useInspiration: true }),
    (error: unknown) =>
      error instanceof ClothingAnalysisError &&
      error.status === 502 &&
      error.message.includes("Inspiration source returned invalid data"),
  );
  assert.equal(reasoningCalls, 0);
});

test("inspiration provider failures fall back to wardrobe-only recommendations", async () => {
  const selected = item("selected", "Tops");
  const bottom = item("bottom", "Bottoms");
  let searches = 0;
  let context: OutfitReasoningContext | undefined;
  const failingSource: InspirationSource = {
    search: async () => {
      searches += 1;
      throw new Error("provider unavailable");
    },
  };
  const reasoner: OutfitReasoner = {
    recommend: async (value) => {
      context = value;
      return {
        outfits: [
          {
            itemIds: [selected.id, bottom.id],
            title: "Wardrobe fallback",
            explanation: "The existing wardrobe pieces complete the look.",
            styleTags: [],
            occasionFit: null,
          },
        ],
      };
    },
  };
  const service = createStyleItemService(
    wardrobe([selected, bottom]),
    reasoner,
    failingSource,
  );
  const wardrobeOnly = await service.recommend({
    wardrobeItemId: selected.id,
  });
  const fallback = await service.recommend({
    wardrobeItemId: selected.id,
    useInspiration: true,
  });

  assert.equal(searches, 1);
  assert.deepEqual(fallback, wardrobeOnly);
  assert.equal(context?.inspiration, undefined);
});

test("candidate filtering removes unavailable, archived, redundant, season-incompatible, and formality-incompatible pieces", () => {
  const selected = item("selected", "Tops", { seasons: ["Summer"] });
  const valid = item("valid", "Bottoms", {
    seasons: ["Summer"],
    formality: "Smart Casual",
  });
  const candidates = [
    selected,
    valid,
    item("same-category", "Tops"),
    item("archived", "Shoes", { status: "archived" }),
    item("unavailable", "Shoes", { availability: "unavailable" }),
    item("winter", "Shoes", { seasons: ["Winter"] }),
    item("lounge", "Shoes", { formality: "Lounge" }),
  ];
  const pool = buildCandidatePool(selected, candidates, profile, {
    wardrobeItemId: selected.id,
    formality: "Formal",
  });
  assert.deepEqual(
    pool.map((value) => value.id),
    [valid.id],
  );
});

test("category completeness follows top, dress, shoe, and accessory templates", () => {
  assert.deepEqual(missingCategories("Tops", [item("top", "Tops")]), [
    "Bottoms",
    "Shoes",
  ]);
  assert.deepEqual(
    missingCategories("Dresses", [
      item("dress", "Dresses"),
      item("shoe", "Shoes"),
    ]),
    [],
  );
  assert.deepEqual(
    missingCategories("Shoes", [
      item("shoe", "Shoes"),
      item("dress", "Dresses"),
    ]),
    [],
  );
  assert.deepEqual(
    missingCategories("Bags", [
      item("bag", "Bags"),
      item("top", "Tops"),
      item("bottom", "Bottoms"),
    ]),
    ["Shoes"],
  );
});

test("hallucinated IDs and outfits that omit the selected item are rejected", async () => {
  const selected = item("selected", "Tops");
  const bottom = item("bottom", "Bottoms");
  const source: InspirationSource = {
    search: async () => ({
      provider: "test-provider",
      directions: [
        {
          name: "Grounded direction",
          desiredCategories: ["Bottoms"],
          desiredTraits: [],
          colorDirection: [],
          styleTags: [],
          reasoning: "Use only matching pieces from the wardrobe.",
          sourceReferences: [],
        },
      ],
    }),
  };
  for (const itemIds of [[selected.id, "invented"], [bottom.id]]) {
    const reasoner: OutfitReasoner = {
      recommend: async () => ({
        outfits: [
          {
            itemIds,
            title: "Bad",
            explanation: "Invalid IDs.",
            styleTags: [],
            occasionFit: null,
          },
        ],
      }),
    };
    await assert.rejects(
      () =>
        createStyleItemService(
          wardrobe([selected, bottom]),
          reasoner,
          source,
        ).recommend({ wardrobeItemId: selected.id, useInspiration: true }),
      (error: unknown) =>
        error instanceof ClothingAnalysisError && error.status === 502,
    );
  }
});

test("empty and insufficient wardrobes return safe errors or an explicit partial look", async () => {
  const reasoner: OutfitReasoner = {
    recommend: async () => {
      throw new Error("should not run");
    },
  };
  await assert.rejects(
    () =>
      createStyleItemService(wardrobe([]), reasoner).recommend({
        wardrobeItemId: "missing",
      }),
    (error: unknown) => error instanceof DomainError && error.status === 404,
  );
  const selected = item("only", "Tops");
  const result = await createStyleItemService(
    wardrobe([selected]),
    reasoner,
  ).recommend({ wardrobeItemId: selected.id });
  assert.deepEqual(result.outfits[0]?.itemIds, [selected.id]);
  assert.deepEqual(result.outfits[0]?.missingCategories, ["Bottoms", "Shoes"]);
});

test("unavailable selections, Gemini failures, and malformed Gemini responses fail safely", async () => {
  const unavailable = item("selected", "Tops", { availability: "unavailable" });
  const never: OutfitReasoner = { recommend: async () => ({}) };
  await assert.rejects(
    () =>
      createStyleItemService(wardrobe([unavailable]), never).recommend({
        wardrobeItemId: unavailable.id,
      }),
    (error: unknown) => error instanceof DomainError && error.status === 422,
  );
  const selected = item("wearable", "Tops");
  const bottom = item("bottom", "Bottoms");
  const failed: OutfitReasoner = {
    recommend: async () => {
      throw new ClothingAnalysisError(502, "Gemini failed");
    },
  };
  await assert.rejects(
    () =>
      createStyleItemService(wardrobe([selected, bottom]), failed).recommend({
        wardrobeItemId: selected.id,
      }),
    ClothingAnalysisError,
  );
  await assert.rejects(
    () =>
      createStyleItemService(wardrobe([selected, bottom]), never).recommend({
        wardrobeItemId: selected.id,
      }),
    (error: unknown) =>
      error instanceof ClothingAnalysisError &&
      error.message.includes("invalid outfit"),
  );
});
