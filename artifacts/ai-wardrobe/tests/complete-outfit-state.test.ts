import assert from "node:assert/strict";
import { test } from "node:test";
import { outfitRecommendationSchema } from "@workspace/api-zod";
import {
  buildCompleteOutfitRequest,
  buildGeneratedOutfitSaveBody,
  buildRecommendationPieces,
  parseCompleteOutfitResponse,
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
