import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateCombinedInspirationQueries,
  generateInspirationQueries,
  type InspirationQueryGarment,
} from "../src/services/inspiration";

const garment: InspirationQueryGarment = {
  category: "Tops",
  subcategory: "Blouse",
  primaryColor: "Ivory",
  materialCandidates: ["Satin", "Silk"],
  styleTags: ["Minimalist", "Classic"],
  formality: "Smart Casual",
};

test("generates three to five concise queries from structured garment metadata", () => {
  const queries = generateInspirationQueries(garment);

  assert(queries.length >= 3 && queries.length <= 5);
  assert.equal(queries[0], "ivory satin blouse outfit");
  assert(queries.includes("ivory blouse smart casual outfit"));
  assert(queries.includes("satin blouse minimalist styling"));
  assert(queries.every((value) => value.length <= 80));
});

test("deduplicates similar queries and returns safe fallbacks for sparse metadata", () => {
  const queries = generateInspirationQueries({
    category: "Tops",
    subcategory: "Other",
    primaryColor: "",
    materialCandidates: [],
    styleTags: [],
    formality: null,
  });

  assert(queries.length >= 3 && queries.length <= 5);
  assert.equal(new Set(queries).size, queries.length);
  assert.deepEqual(queries.slice(0, 3), [
    "top outfit",
    "top styling",
    "top color combinations",
  ]);
});

test("uses only bounded clothing fields and excludes obvious personal data", () => {
  const metadataWithUnrelatedData = {
    ...garment,
    primaryColor: "person@example.com",
    materialCandidates: ["https://example.com/private", "Satin"],
    styleTags: ["+1 (555) 123-4567", "Minimalist"],
    name: "Jane Doe",
    location: "Tirana",
    notes: "private free-form wardrobe notes",
  };
  const queries = generateInspirationQueries(metadataWithUnrelatedData);
  const combined = queries.join(" ");

  assert(queries.length >= 3 && queries.length <= 5);
  assert.doesNotMatch(
    combined,
    /jane|doe|tirana|private|example\.com|555|123|4567/i,
  );
  assert(queries.every((value) => value.length <= 80));
});

test("generates combined-anchor inspiration queries without IDs or images", () => {
  const queries = generateCombinedInspirationQueries([
    garment,
    {
      category: "Bottoms",
      subcategory: "Jeans",
      primaryColor: "Navy",
      materialCandidates: ["Denim"],
      styleTags: ["Classic"],
      formality: "Casual",
    },
  ]);
  assert.match(queries[0] ?? "", /ivory satin blouse navy denim jeans outfit/);
  assert.doesNotMatch(queries.join(" "), /uploads|wardrobeItemId|\.jpg/i);
});
