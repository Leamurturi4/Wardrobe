import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ClothingAnalysisError,
  createGeminiClothingAnalyzer,
  normalizeClothingAnalysis,
  type ClothingImage,
} from "../src/services/clothing-analysis";
import {
  AI_ANALYSIS_VERSION,
  analysisToWardrobeInput,
  findUserCorrectedFields,
} from "@workspace/api-zod";

const image: ClothingImage = {
  bytes: Buffer.from("test image"),
  mimeType: "image/jpeg",
};
const raw = {
  suggestedName: "Ivory blouse",
  category: "Tops",
  subcategory: "Blouse",
  primaryColor: "Ivory",
  secondaryColors: ["Beige"],
  pattern: "Solid",
  texture: "Smooth",
  fit: "Fitted",
  silhouette: "Fluid",
  length: "Hip",
  neckline: "V-Neck",
  sleeveLength: "Long",
  rise: null,
  layeringRole: "Standalone",
  materialCandidates: ["satin-like fabric"],
  styleTags: ["Romantic", "Classic"],
  aestheticTags: ["Romantic"],
  formality: "Smart Casual",
  seasons: ["Spring", "Autumn"],
  occasions: ["Work", "Date"],
  weatherSuitability: ["warm", "cool"],
  statementLevel: "Medium",
  visualWeight: "Low",
  structureLevel: "Low",
  versatility: "High",
  dominantStyleDirection: "Romantic",
  confidence: 0.88,
};
const geminiResponse = (value: unknown) =>
  new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [
              {
                text: typeof value === "string" ? value : JSON.stringify(value),
              },
            ],
          },
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );

test("Gemini provider sends inline image server-side and validates structured output", async () => {
  let request: { url: string; init?: RequestInit } | undefined;
  const analyzer = createGeminiClothingAnalyzer({
    apiKey: "test-secret",
    model: "test-model",
    fetchFn: async (url, init) => {
      request = { url: String(url), init };
      return geminiResponse(raw);
    },
  });
  const result = await analyzer.analyze(image);
  assert.equal(result.subcategory, "Blouse");
  assert.equal(result.confidence, 0.88);
  assert.match(request!.url, /test-model:generateContent$/);
  assert.equal(
    new Headers(request!.init?.headers).get("x-goog-api-key"),
    "test-secret",
  );
  const body = JSON.parse(String(request!.init?.body));
  assert.equal(
    body.contents[0].parts[1].inline_data.data,
    image.bytes.toString("base64"),
  );
  assert.equal(body.generationConfig.responseMimeType, "application/json");
  assert(
    body.generationConfig.responseJsonSchema.properties.category.enum.includes(
      "Tops",
    ),
  );
});

test("normalization maps common aliases to canonical wardrobe values", () => {
  const result = normalizeClothingAnalysis({
    ...raw,
    subcategory: "tshirt",
    primaryColor: "off-white",
    seasons: ["fall"],
    pattern: "stripes",
    styleTags: ["boho"],
  });
  assert.equal(result.subcategory, "T-Shirt");
  assert.equal(result.primaryColor, "Ivory");
  assert.deepEqual(result.seasons, ["Autumn"]);
  assert.equal(result.pattern, "Striped");
  assert.deepEqual(result.styleTags, ["Bohemian"]);
});

test("normalization rejects invalid categories, mismatched subcategories, and malformed schemas", () => {
  assert.throws(
    () => normalizeClothingAnalysis({ ...raw, category: "Food" }),
    ClothingAnalysisError,
  );
  assert.throws(
    () => normalizeClothingAnalysis({ ...raw, subcategory: "Sneakers" }),
    ClothingAnalysisError,
  );
  const { confidence: _confidence, ...missingConfidence } = raw;
  assert.throws(() => normalizeClothingAnalysis(missingConfidence));
});

test("Gemini provider reports invalid JSON and malformed structured output safely", async () => {
  const invalidJson = createGeminiClothingAnalyzer({
    apiKey: "test",
    fetchFn: async () => geminiResponse("not-json"),
  });
  await assert.rejects(
    () => invalidJson.analyze(image),
    (error: unknown) =>
      error instanceof ClothingAnalysisError &&
      error.message.includes("invalid JSON"),
  );
  const malformed = createGeminiClothingAnalyzer({
    apiKey: "test",
    fetchFn: async () => geminiResponse({ category: "Tops" }),
  });
  await assert.rejects(
    () => malformed.analyze(image),
    (error: unknown) =>
      error instanceof ClothingAnalysisError &&
      error.message.includes("invalid clothing data"),
  );
});

test("missing configuration, provider failures, and timeouts remain non-fatal", async () => {
  await assert.rejects(
    () => createGeminiClothingAnalyzer({}).analyze(image),
    (error: unknown) =>
      error instanceof ClothingAnalysisError && error.status === 503,
  );
  const failed = createGeminiClothingAnalyzer({
    apiKey: "test",
    fetchFn: async () => new Response("rate limited", { status: 429 }),
  });
  await assert.rejects(
    () => failed.analyze(image),
    (error: unknown) =>
      error instanceof ClothingAnalysisError &&
      error.status === 502 &&
      !error.message.includes("rate limited"),
  );
  const timeout = createGeminiClothingAnalyzer({
    apiKey: "test",
    fetchFn: async () => {
      const error = new Error("timeout");
      error.name = "TimeoutError";
      throw error;
    },
  });
  await assert.rejects(
    () => timeout.analyze(image),
    (error: unknown) =>
      error instanceof ClothingAnalysisError && error.status === 504,
  );
});

test("reviewed AI suggestions retain metadata and track only user corrections", () => {
  const analysis = normalizeClothingAnalysis(raw);
  const wardrobe = analysisToWardrobeInput(
    analysis,
    "/uploads/00000000-0000-0000-0000-000000000000.jpg",
  );
  const corrected = { ...wardrobe, fit: "Relaxed" };
  assert.equal(wardrobe.aiAnalysisVersion, AI_ANALYSIS_VERSION);
  assert.deepEqual(findUserCorrectedFields(analysis, corrected), ["fit"]);
});
