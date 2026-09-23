import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ClothingAnalysisError,
  createOpenAIClothingAnalyzer,
  normalizeClothingAnalysis,
  type ClothingImage,
} from "../src/services/clothing-analysis";
import {
  createOpenAIStructuredClient,
  type OpenAIClientOptions,
} from "../src/services/openai-client";
import {
  AI_ANALYSIS_VERSION,
  analysisToWardrobeInput,
  findUserCorrectedFields,
} from "@workspace/api-zod";

const image: ClothingImage = {
  bytes: Buffer.from("test image"),
  mimeType: "image/jpeg",
};
const analyzer = (options: OpenAIClientOptions) =>
  createOpenAIClothingAnalyzer(createOpenAIStructuredClient(options));
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
const openAIResponse = (value: unknown) =>
  new Response(
    JSON.stringify({
      status: "completed",
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: typeof value === "string" ? value : JSON.stringify(value),
            },
          ],
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );

test("OpenAI provider sends inline image server-side and validates structured output", async () => {
  let request: { url: string; init?: RequestInit } | undefined;
  const clothingAnalyzer = analyzer({
    apiKey: "test-secret",
    model: "test-model",
    fetchFn: async (url, init) => {
      request = { url: String(url), init };
      return openAIResponse(raw);
    },
  });
  const result = await clothingAnalyzer.analyze(image);
  assert.equal(result.subcategory, "Blouse");
  assert.equal(result.confidence, 0.88);
  assert.equal(request!.url, "https://api.openai.com/v1/responses");
  assert.equal(
    new Headers(request!.init?.headers).get("Authorization"),
    "Bearer test-secret",
  );
  const body = JSON.parse(String(request!.init?.body));
  assert.equal(body.model, "test-model");
  assert.equal(body.store, false);
  assert.equal(
    body.input[0].content[1].image_url,
    `data:image/jpeg;base64,${image.bytes.toString("base64")}`,
  );
  assert.equal(body.text.format.type, "json_schema");
  assert.equal(body.text.format.strict, true);
  assert(body.text.format.schema.properties.category.enum.includes("Tops"));
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

test("OpenAI provider reports invalid JSON and malformed structured output safely", async () => {
  const invalidJson = analyzer({
    apiKey: "test",
    fetchFn: async () => openAIResponse("not-json"),
  });
  await assert.rejects(
    () => invalidJson.analyze(image),
    (error: unknown) =>
      error instanceof ClothingAnalysisError &&
      error.message.includes("invalid JSON"),
  );
  const malformed = analyzer({
    apiKey: "test",
    fetchFn: async () => openAIResponse({ category: "Tops" }),
  });
  await assert.rejects(
    () => malformed.analyze(image),
    (error: unknown) =>
      error instanceof ClothingAnalysisError &&
      error.message.includes("invalid clothing data"),
  );
  const missingOutput = analyzer({
    apiKey: "test",
    fetchFn: async () =>
      new Response(JSON.stringify({ output: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  });
  await assert.rejects(
    () => missingOutput.analyze(image),
    (error: unknown) =>
      error instanceof ClothingAnalysisError &&
      error.message.includes("no structured result"),
  );
  const incomplete = analyzer({
    apiKey: "test",
    fetchFn: async () =>
      new Response(
        JSON.stringify({
          status: "incomplete",
          output_text: JSON.stringify(raw),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
  });
  await assert.rejects(
    () => incomplete.analyze(image),
    (error: unknown) =>
      error instanceof ClothingAnalysisError &&
      error.message.includes("no structured result"),
  );
});

test("missing configuration, auth, rate limits, provider failures, and timeouts are distinct and safe", async () => {
  await assert.rejects(
    () => analyzer({}).analyze(image),
    (error: unknown) =>
      error instanceof ClothingAnalysisError && error.status === 503,
  );
  const diagnostics: {
    status?: number;
    errorType: string;
    errorCode?: string;
  }[] = [];
  const responseError = (status: number, type: string, code: string) =>
    new Response(
      JSON.stringify({ error: { type, code, message: "sensitive" } }),
      {
        status,
        headers: { "Content-Type": "application/json" },
      },
    );
  const auth = analyzer({
    apiKey: "test",
    fetchFn: async () =>
      responseError(401, "authentication_error", "invalid_api_key"),
    onError: (value) => diagnostics.push(value),
  });
  await assert.rejects(
    () => auth.analyze(image),
    (error: unknown) =>
      error instanceof ClothingAnalysisError &&
      error.status === 502 &&
      error.message.includes("authentication") &&
      !error.message.includes("sensitive"),
  );
  const rateLimit = analyzer({
    apiKey: "test",
    fetchFn: async () =>
      responseError(429, "rate_limit_error", "rate_limit_exceeded"),
    onError: (value) => diagnostics.push(value),
  });
  await assert.rejects(
    () => rateLimit.analyze(image),
    (error: unknown) =>
      error instanceof ClothingAnalysisError && error.status === 503,
  );
  const badRequest = analyzer({
    apiKey: "test",
    fetchFn: async () =>
      responseError(400, "invalid_request_error", "invalid_image"),
    onError: (value) => diagnostics.push(value),
  });
  await assert.rejects(
    () => badRequest.analyze(image),
    (error: unknown) =>
      error instanceof ClothingAnalysisError &&
      error.status === 502 &&
      error.message.includes("process this request"),
  );
  const unavailableModel = analyzer({
    apiKey: "test",
    fetchFn: async () =>
      responseError(404, "invalid_request_error", "model_not_found"),
    onError: (value) => diagnostics.push(value),
  });
  await assert.rejects(
    () => unavailableModel.analyze(image),
    (error: unknown) =>
      error instanceof ClothingAnalysisError &&
      error.status === 502 &&
      error.message.includes("model is unavailable"),
  );
  const provider5xx = analyzer({
    apiKey: "test",
    fetchFn: async () => responseError(503, "server_error", "overloaded"),
    onError: (value) => diagnostics.push(value),
  });
  await assert.rejects(
    () => provider5xx.analyze(image),
    (error: unknown) =>
      error instanceof ClothingAnalysisError && error.status === 502,
  );
  const timeout = analyzer({
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
  assert.deepEqual(
    diagnostics.map(({ status, errorType, errorCode }) => ({
      status,
      errorType,
      errorCode,
    })),
    [
      {
        status: 401,
        errorType: "authentication_error",
        errorCode: "invalid_api_key",
      },
      {
        status: 429,
        errorType: "rate_limit_error",
        errorCode: "rate_limit_exceeded",
      },
      {
        status: 400,
        errorType: "invalid_request_error",
        errorCode: "invalid_image",
      },
      {
        status: 404,
        errorType: "invalid_request_error",
        errorCode: "model_not_found",
      },
      { status: 503, errorType: "server_error", errorCode: "overloaded" },
    ],
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
