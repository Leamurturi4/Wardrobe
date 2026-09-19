import { test } from "node:test";
import assert from "node:assert/strict";
import {
  styleDirectionSchema,
  wardrobeItemSchema,
  type WardrobeItem,
} from "@workspace/api-zod";
import {
  directionAffinity,
  mapDirectionsToWardrobe,
  matchDirectionToWardrobe,
  scoreDirectionFit,
} from "../src/services/inspiration-mapping";

const now = "2026-01-01T00:00:00.000Z";
const item = (
  id: string,
  category: WardrobeItem["category"],
  overrides: Record<string, unknown> = {},
): WardrobeItem =>
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

// The inspiration asks for dark straight denim, loafers and a structured
// brown bag. The wardrobe holds none of those exactly.
const direction = styleDirectionSchema.parse({
  name: "Polished dark denim",
  desiredCategories: ["Bottoms", "Shoes", "Bags"],
  desiredTraits: [
    "dark straight denim",
    "loafers",
    "structured brown bag",
    "minimal",
  ],
  colorDirection: ["ivory", "dark indigo", "brown"],
  styleTags: ["minimal", "polished", "smart casual"],
  reasoning: "A soft blouse gains structure from darker, sharper pieces.",
  sourceReferences: [],
});

const jeans = item("dark-selvedge-jeans", "Bottoms", {
  name: "Dark selvedge jeans",
  subcategory: "Jeans",
  primaryColor: "Navy",
  material: "Denim",
  silhouette: "Straight",
  fit: "Regular",
  styleTags: ["Minimalist"],
  structureLevel: "High",
});
const boots = item("black-chelsea-boots", "Shoes", {
  name: "Black Chelsea boots",
  subcategory: "Boots",
  primaryColor: "Black",
  material: "Leather",
  styleTags: ["Classic"],
  structureLevel: "High",
});
const tote = item("chocolate-leather-tote", "Bags", {
  name: "Chocolate leather tote",
  subcategory: "Tote",
  primaryColor: "Brown",
  material: "Leather",
  structureLevel: "High",
  styleTags: ["Minimalist"],
});
const unrelated = item("neon-running-cap", "Accessories", {
  name: "Neon running cap",
  subcategory: "Hat",
  primaryColor: "Yellow",
  material: "Mesh",
  styleTags: ["Sporty"],
  occasions: ["Active"],
});

test("a direction maps onto owned stand-ins rather than exact matches", () => {
  const matched = matchDirectionToWardrobe(direction, [
    jeans,
    boots,
    tote,
    unrelated,
  ]);

  assert.deepEqual(
    matched.map((value) => value.id).sort(),
    [boots.id, jeans.id, tote.id].sort(),
  );
  assert.equal(
    matched.some((value) => value.id === unrelated.id),
    false,
  );
});

test("owned pieces that express more of a direction score higher", () => {
  assert(scoreDirectionFit(direction, jeans) > 0);
  assert(scoreDirectionFit(direction, tote) > 0);
  assert(
    scoreDirectionFit(direction, jeans) >
      scoreDirectionFit(direction, unrelated),
  );
  assert.equal(scoreDirectionFit(direction, unrelated), 0);
  assert.equal(directionAffinity([], jeans), 0);
  assert.equal(
    directionAffinity([direction], jeans),
    scoreDirectionFit(direction, jeans),
  );
});

test("structured metadata drives the match, not just the item name", () => {
  const anonymous = item("piece-42", "Bags", {
    name: "piece-42",
    subcategory: "Tote",
    primaryColor: "Brown",
    material: "Leather",
    structureLevel: "High",
  });
  assert(scoreDirectionFit(direction, anonymous) > 0);
});

test("mapping only ever returns IDs from the supplied candidate pool", () => {
  const pool = [jeans, tote];
  const matches = mapDirectionsToWardrobe([direction], pool);

  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.name, direction.name);
  assert(
    matches[0]?.itemIds.every((id) =>
      pool.some((candidate) => candidate.id === id),
    ),
  );
  assert.equal(matches[0]?.itemIds.includes(boots.id), false);
});

test("directions with no owned stand-in are dropped instead of invented", () => {
  const impossible = styleDirectionSchema.parse({
    name: "Beachside raffia",
    desiredCategories: ["Accessories"],
    desiredTraits: ["raffia basket bag", "woven espadrilles"],
    colorDirection: ["sand"],
    styleTags: ["resort"],
    reasoning: "A vacation reading of the same blouse.",
    sourceReferences: [],
  });

  assert.deepEqual(mapDirectionsToWardrobe([impossible], [jeans]), []);
  assert.deepEqual(matchDirectionToWardrobe(impossible, []), []);
});

test("matching is bounded so one direction cannot flood the pool", () => {
  const many = Array.from({ length: 12 }, (_, index) =>
    item(`denim-${index}`, "Bottoms", {
      name: `Dark denim ${index}`,
      subcategory: "Jeans",
      primaryColor: "Navy",
      material: "Denim",
      silhouette: "Straight",
    }),
  );
  assert.equal(matchDirectionToWardrobe(direction, many).length, 8);
  assert.equal(matchDirectionToWardrobe(direction, many, 3).length, 3);
});
