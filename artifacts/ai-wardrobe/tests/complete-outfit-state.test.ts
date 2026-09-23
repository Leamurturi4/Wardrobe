import assert from "node:assert/strict";
import { test } from "node:test";
import { outfitRecommendationSchema } from "@workspace/api-zod";
import {
  buildCompleteOutfitRequest,
  buildGeneratedOutfitSaveBody,
  buildRecommendationPieces,
  anchorSelectionIssue,
  generationErrorMessage,
  moveRecommendationIndex,
  parseCompleteOutfitResponse,
  recommendationKey,
  toggleAnchorId,
} from "../src/pages/outfits/complete-outfit-state";

test("anchor selection retains distinct IDs, removes them, and caps at three", () => {
  assert.deepEqual(toggleAnchorId(["top"], "jeans"), ["top", "jeans"]);
  assert.deepEqual(toggleAnchorId(["top", "jeans"], "top"), ["jeans"]);
  assert.deepEqual(toggleAnchorId(["top", "jeans", "shoes"], "bag"), [
    "top",
    "jeans",
    "shoes",
  ]);
});

test("network failures use a human-readable retry message", () => {
  assert.equal(
    generationErrorMessage(new TypeError("Failed to fetch"), "fallback"),
    "The AI stylist is temporarily unavailable. Your selected pieces and last outfit are still here.",
  );
});

test("anchor selection prevents structurally incompatible combinations", () => {
  const top = { id: "top", category: "Tops", subcategory: "T-Shirt" } as const;
  const bottom = {
    id: "bottom",
    category: "Bottoms",
    subcategory: "Trousers",
  } as const;
  const dress = {
    id: "dress",
    category: "Dresses",
    subcategory: "Midi Dress",
  } as const;
  const secondBottom = {
    id: "skirt",
    category: "Bottoms",
    subcategory: "Skirt",
  } as const;

  assert.equal(
    anchorSelectionIssue([top, bottom], dress)?.includes("cannot"),
    true,
  );
  assert.equal(
    anchorSelectionIssue([top, bottom], secondBottom),
    "Choose only one bottoms anchor.",
  );
  assert.equal(anchorSelectionIssue([top], bottom), null);
});

test("recommendation navigation wraps and save identity follows exact wardrobe IDs", () => {
  const recommendation = outfitRecommendationSchema.parse({
    itemIds: ["shoes", "top", "bottom"],
    title: "First title",
    explanation: "A complete outfit.",
    styleTags: [],
    occasionFit: null,
    missingCategories: [],
  });
  const sameItems = { ...recommendation, title: "Alternate title" };
  assert.equal(moveRecommendationIndex(0, -1, 3), 2);
  assert.equal(moveRecommendationIndex(2, 1, 3), 0);
  assert.equal(recommendationKey(recommendation), recommendationKey(sameItems));
});

test("recommendation pieces resolve in API order and distinguish anchors from additions", () => {
  const recommendation = outfitRecommendationSchema.parse({
    itemIds: ["top", "jeans", "shoes"],
    title: "Visible completion",
    explanation: "Shoes complete the anchors.",
    styleTags: ["Classic"],
    occasionFit: "Everyday",
    missingCategories: [],
  });
  const view = buildRecommendationPieces(
    recommendation,
    [
      { id: "top", name: "T-shirt", category: "Tops", imageUrl: "/top.png" },
      {
        id: "jeans",
        name: "Jeans",
        category: "Bottoms",
        imageUrl: "/jeans.png",
      },
      {
        id: "shoes",
        name: "Sneakers",
        category: "Shoes",
        imageUrl: "/shoes.png",
      },
    ],
    ["top", "jeans"],
  );

  assert.deepEqual(
    view.pieces.map(({ item, isAnchor }) => [item.id, isAnchor]),
    [
      ["top", true],
      ["jeans", true],
      ["shoes", false],
    ],
  );
  assert.deepEqual(view.unresolvedItemIds, []);
});

test("completion request sends selected anchor IDs and rejects invalid counts", () => {
  assert.deepEqual(
    buildCompleteOutfitRequest(["top", "jeans"], {
      occasion: "Everyday",
      style: "Classic",
      formality: "Casual",
      useInspiration: false,
    }),
    {
      anchorItemIds: ["top", "jeans"],
      occasion: "Everyday",
      style: "Classic",
      formality: "Casual",
      useInspiration: false,
    },
  );
  assert.throws(() =>
    buildCompleteOutfitRequest(["top"], { useInspiration: false }),
  );
  assert.throws(() =>
    buildCompleteOutfitRequest(["top", "top"], { useInspiration: false }),
  );
});

test("completion response exposes recommendations and save uses their real IDs", () => {
  const recommendation = outfitRecommendationSchema.parse({
    itemIds: ["top", "jeans", "shoes"],
    title: "Closet completion",
    explanation: "The shoes finish the two selected anchors.",
    styleTags: ["Classic"],
    occasionFit: "Everyday",
    missingCategories: [],
  });
  const response = parseCompleteOutfitResponse({
    anchorItemIds: ["top", "jeans"],
    outfits: [recommendation],
  });
  assert.equal(response.outfits[0]?.title, "Closet completion");

  const body = buildGeneratedOutfitSaveBody(
    response.outfits[0]!,
    [
      { id: "top", category: "Tops" },
      { id: "jeans", category: "Bottoms" },
      { id: "shoes", category: "Shoes" },
    ],
    "",
  );
  assert.equal(body.source, "ai-assisted");
  assert.deepEqual(
    body.items.map((item) => item.itemId),
    ["top", "jeans", "shoes"],
  );
});
