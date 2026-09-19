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
        ).recommend({ wardrobeItemId: selected.id }),
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
