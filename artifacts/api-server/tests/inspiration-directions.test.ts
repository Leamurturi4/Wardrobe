import { test } from "node:test";
import assert from "node:assert/strict";
import { styleDirectionSchema, type StyleDirection } from "@workspace/api-zod";
import type { OpenAIStructuredClient } from "../src/services/openai-client";
import {
  createOpenAIStyleDirectionExtractor,
  normalizeStyleDirections,
  reconcileStyleDirections,
} from "../src/services/inspiration-directions";
import type { InspirationHit } from "../src/services/inspiration-search";

const hits: InspirationHit[] = [
  {
    title: "How to style a satin blouse",
    source: "vogue.com",
    sourceUrl: "https://vogue.com/looks/1",
    imageUrl: null,
    snippet: "Dark denim keeps a fluid blouse grounded.",
    query: "ivory satin blouse outfit",
  },
  {
    title: "The loafer edit",
    source: "elle.com",
    sourceUrl: "https://elle.com/looks/2",
    imageUrl: null,
    snippet: "Loafers sharpen a soft top.",
    query: "satin blouse minimalist styling",
  },
];

const garment = {
  category: "Tops" as const,
  subcategory: "Blouse",
  primaryColor: "Ivory",
  materialCandidates: ["Satin"],
  styleTags: ["Minimalist"],
  formality: "Smart Casual" as const,
};

const direction = (overrides: Partial<StyleDirection> = {}): StyleDirection =>
  styleDirectionSchema.parse({
    name: "Polished dark denim",
    desiredCategories: ["Bottoms", "Shoes"],
    desiredTraits: ["dark denim", "straight-leg", "loafers"],
    colorDirection: ["ivory", "dark indigo"],
    styleTags: ["minimal", "polished"],
    reasoning: "A soft blouse gains structure from darker, sharper pieces.",
    sourceReferences: [
      {
        provider: "vogue.com",
        title: "How to style a satin blouse",
        url: "https://vogue.com/looks/1",
      },
    ],
    ...overrides,
  });

test("directions are normalized and cite only the references that were supplied", () => {
  const directions = normalizeStyleDirections(
    {
      directions: [
        {
          name: "Polished dark denim",
          desiredCategories: ["bottoms", "Footwear", "not-a-category"],
          desiredTraits: ["  Dark Denim  ", "straight-leg", "dark denim"],
          colorDirection: ["Ivory", "Dark Indigo"],
          styleTags: ["Minimal"],
          reasoning: "Structured dark pieces ground a fluid blouse.",
          // 7 is out of range and must be ignored; the model never sends URLs.
          sourceIndexes: [1, 0, 7, 1],
          url: "https://attacker.example.com/injected",
        },
        {
          name: "",
          desiredCategories: ["Bottoms"],
          desiredTraits: [],
          colorDirection: [],
          styleTags: [],
          reasoning: "Missing a name, so unusable.",
          sourceIndexes: [0],
        },
      ],
    },
    hits,
    "brave-search",
  );

  assert.equal(directions.length, 1);
  const [only] = directions;
  assert.deepEqual(only?.desiredCategories, ["Bottoms", "Shoes"]);
  assert.deepEqual(only?.desiredTraits, ["dark denim", "straight-leg"]);
  assert.deepEqual(
    only?.sourceReferences.map((source) => source.url),
    ["https://elle.com/looks/2", "https://vogue.com/looks/1"],
  );
  assert.equal(
    JSON.stringify(directions).includes("attacker.example.com"),
    false,
  );
});

test("malformed direction payloads yield no directions instead of throwing", () => {
  for (const malformed of [
    null,
    "nonsense",
    { directions: "unexpected" },
    { directions: [{ name: "Only a name" }] },
    {},
  ])
    assert.deepEqual(normalizeStyleDirections(malformed, hits, "brave"), []);
});

test("recurring combinations outrank one-off looks and duplicates collapse", () => {
  const reconciled = reconcileStyleDirections([
    direction(),
    direction({
      name: "Dark denim and loafers",
      desiredTraits: ["dark denim", "loafers", "structured bag"],
      sourceReferences: [
        {
          provider: "elle.com",
          title: "The loafer edit",
          url: "https://elle.com/looks/2",
        },
      ],
    }),
    direction({
      name: "Poolside resort",
      desiredCategories: ["Accessories"],
      desiredTraits: ["raffia hat", "woven sandals"],
      colorDirection: ["sand"],
      styleTags: ["resort"],
      reasoning: "A one-off vacation interpretation.",
      sourceReferences: [],
    }),
  ]);

  assert.equal(reconciled.length, 2);
  assert.equal(reconciled[0]?.name, "Polished dark denim");
  // The merged direction keeps the traits several sources agreed on, first.
  assert.equal(reconciled[0]?.desiredTraits[0], "dark denim");
  assert.deepEqual(reconciled[0]?.sourceReferences.map((s) => s.url).sort(), [
    "https://elle.com/looks/2",
    "https://vogue.com/looks/1",
  ]);
  assert.equal(reconciled[1]?.name, "Poolside resort");
});

test("reconciliation keeps a small, deduplicated set", () => {
  const concepts = [
    { category: "Bottoms", trait: "wide leg trousers", tag: "tailored" },
    { category: "Shoes", trait: "woven sandals", tag: "resort" },
    { category: "Bags", trait: "structured tote", tag: "workwear" },
    { category: "Outerwear", trait: "cropped moto jacket", tag: "edgy" },
    { category: "Jewelry", trait: "layered gold chains", tag: "glamorous" },
    { category: "Accessories", trait: "silk scarf", tag: "vintage" },
    { category: "Dresses", trait: "slip dress", tag: "romantic" },
    { category: "Tops", trait: "ribbed tank", tag: "sporty" },
    { category: "Shoes", trait: "chunky sneakers", tag: "streetwear" },
  ] as const;
  const many = concepts.map((concept, index) =>
    direction({
      name: `Direction ${index}`,
      desiredCategories: [concept.category],
      desiredTraits: [concept.trait],
      styleTags: [concept.tag],
    }),
  );
  assert.equal(reconcileStyleDirections(many).length, 4);
  assert.equal(reconcileStyleDirections(many, 2).length, 2);
  assert.deepEqual(reconcileStyleDirections([]), []);
});

test("OpenAI extraction sends compact references and returns reconciled directions", async () => {
  let prompt = "";
  let responseSchema: unknown;
  const client: OpenAIStructuredClient = {
    generateJson: async (input) => {
      prompt = input.prompt;
      responseSchema = input.responseSchema;
      return {
        directions: [
          {
            name: "Polished dark denim",
            desiredCategories: ["Bottoms"],
            desiredTraits: ["dark denim"],
            colorDirection: ["indigo"],
            styleTags: ["polished"],
            reasoning: "Dark denim sharpens a fluid blouse.",
            sourceIndexes: [0],
          },
        ],
      };
    },
  };
  const directions = await createOpenAIStyleDirectionExtractor(
    client,
    "brave-search",
  ).extract({ garment, hits, options: { occasion: "Work" } });

  assert.equal(directions.length, 1);
  assert.equal(directions[0]?.sourceReferences[0]?.url, hits[0]?.sourceUrl);
  assert.match(prompt, /How to style a satin blouse/);
  assert.match(prompt, /"index":0/);
  // Outlet names travel for attribution, but never URLs or image payloads.
  assert.match(prompt, /vogue\.com/);
  assert.doesNotMatch(prompt, /https?:\/\/|inline_data|base64/);
  assert(JSON.stringify(responseSchema).includes("sourceIndexes"));
});

test("extraction is skipped when no references were found", async () => {
  let calls = 0;
  const client: OpenAIStructuredClient = {
    generateJson: async () => {
      calls += 1;
      return { directions: [] };
    },
  };
  const directions = await createOpenAIStyleDirectionExtractor(
    client,
    "brave-search",
  ).extract({ garment, hits: [], options: {} });

  assert.deepEqual(directions, []);
  assert.equal(calls, 0);
});
