import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Server } from "node:http";
import { createDatabase, migrate, seedDemo } from "@workspace/db";
import { createWardrobeService } from "../src/services/wardrobe";
import { createApp } from "../src/app";
import {
  analysisToWardrobeInput,
  findUserCorrectedFields,
  type ClothingAnalysisResult,
} from "@workspace/api-zod";
import {
  createStyleItemService,
  type OutfitReasoningContext,
} from "../src/services/outfit-recommendation";
import type { InspirationSource } from "../src/services/inspiration";

const migration = fileURLToPath(
  new URL("../../../lib/db/migrations/0001_wardrobe.sql", import.meta.url),
);
let dir: string;
let database: ReturnType<typeof createDatabase>;
let server: Server;
let base: string;
let analyzerCalls = 0;
let recommendationContext: OutfitReasoningContext | undefined;
let recommendationResult: unknown = { outfits: [] };
let inspirationDirections: unknown[] = [];
const analysisResult: ClothingAnalysisResult = {
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
  styleTags: ["Romantic"],
  aestheticTags: ["Romantic"],
  formality: "Smart Casual",
  seasons: ["Spring"],
  occasions: ["Work"],
  weatherSuitability: ["warm"],
  statementLevel: "Medium",
  visualWeight: "Low",
  structureLevel: "Low",
  versatility: "High",
  dominantStyleDirection: "Romantic",
  confidence: 0.86,
};
before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "closet-test-"));
  database = createDatabase(undefined, path.join(dir, "db"));
  await migrate(database.db, migration);
  await migrate(database.db, migration);
  const wardrobeService = createWardrobeService(database.db);
  const app = createApp(
    wardrobeService,
    path.join(dir, "uploads"),
    {
      analyze: async () => {
        analyzerCalls += 1;
        return analysisResult;
      },
    },
    createStyleItemService(
      wardrobeService,
      {
        recommend: async (context) => {
          recommendationContext = context;
          return recommendationResult;
        },
      },
      {
        search: async () => ({
          provider: "stub-search",
          directions: inspirationDirections,
        }),
      } as unknown as InspirationSource,
    ),
  );
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  base = `http://127.0.0.1:${address.port}/api`;
});
after(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
  if (database) await database.close();
  if (dir) await rm(dir, { recursive: true, force: true });
});
async function request(route: string, method = "GET", body?: unknown) {
  const response = await fetch(base + route, {
    method,
    ...(body === undefined
      ? {}
      : {
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        }),
  });
  return {
    status: response.status,
    body: response.status === 204 ? null : await response.json(),
  };
}
const input = {
  name: "Linen Test Shirt",
  category: "Tops",
  primaryColor: "White",
  originalImage: "/images/wardrobe/white-shirt.png",
  brand: "Test Atelier",
  seasons: ["Summer"],
  styleTags: ["Minimalist"],
  favorite: true,
};

test("create, patch without resetting defaults, favorite, filters, search and archive", async () => {
  const created = await request("/wardrobe", "POST", input);
  assert.equal(created.status, 201);
  const id = created.body.id;
  assert.equal(created.body.wearCount, 0);
  assert.equal(created.body.aiConfidence, null);
  assert.equal((await request(`/wardrobe/${id}`)).body.name, input.name);
  const updated = await request(`/wardrobe/${id}`, "PATCH", {
    name: "Updated Linen",
    wearCount: 3,
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.favorite, true);
  assert.deepEqual(updated.body.seasons, ["Summer"]);
  assert.equal(updated.body.brand, input.brand);
  assert.equal(updated.body.createdAt, created.body.createdAt);
  assert(
    Date.parse(updated.body.updatedAt) >= Date.parse(created.body.updatedAt),
  );
  for (const query of [
    "category=Tops",
    "favorite=true",
    "color=white",
    "season=Summer",
    "style=minimalist",
    "search=TEST%20ATELIER",
    "search=updated%20linen",
  ]) {
    const result = await request(`/wardrobe?${query}`);
    assert.equal(result.status, 200);
    assert(
      result.body.some((i: { id: string }) => i.id === id),
      query,
    );
  }
  assert.equal((await request("/wardrobe?category=Shoes")).body.length, 0);
  assert.equal(
    (await request(`/wardrobe/${id}/favorite`, "POST")).body.favorite,
    false,
  );
  assert(
    (await request("/wardrobe?favorite=false")).body.some(
      (i: { id: string }) => i.id === id,
    ),
  );
  await Promise.all([
    request(`/wardrobe/${id}/favorite`, "POST"),
    request(`/wardrobe/${id}/favorite`, "POST"),
  ]);
  assert.equal((await request(`/wardrobe/${id}`)).body.favorite, false);
  assert.equal(
    (await request(`/wardrobe/${id}`, "DELETE")).body.status,
    "archived",
  );
  assert.equal((await request("/wardrobe")).body.length, 0);
  assert.equal((await request("/wardrobe?status=archived")).body.length, 1);
  await request(`/wardrobe/${id}`, "PATCH", { status: "active" });
  assert.equal((await request(`/wardrobe/${id}`)).body.wearCount, 3);
});

test("outfits reference actual items, update atomically, preserve archived members and delete", async () => {
  const item = (
    await request("/wardrobe", "POST", { ...input, name: "Outfit member" })
  ).body;
  const saved = await request("/outfits", "POST", {
    name: "Manual look",
    items: [{ itemId: item.id, role: "top" }],
    favorite: true,
  });
  assert.equal(saved.status, 201);
  const id = saved.body.id;
  assert.equal(saved.body.source, "manual");
  assert.equal(saved.body.stylingScore, null);
  assert.equal((await request(`/outfits/${id}`)).body.items[0].itemId, item.id);
  assert.equal((await request("/outfits?favorite=true")).body.length, 1);
  const update = await request(`/outfits/${id}`, "PATCH", {
    name: "Renamed look",
  });
  assert.equal(update.body.favorite, true);
  assert.deepEqual(update.body.items, saved.body.items);
  assert.equal(
    (await request(`/outfits/${id}/favorite`, "POST")).body.favorite,
    false,
  );
  assert.equal(
    (
      await request(`/outfits/${id}`, "PATCH", {
        items: [{ itemId: "missing" }],
      })
    ).status,
    422,
  );
  assert.deepEqual(
    (await request(`/outfits/${id}`)).body.items,
    saved.body.items,
  );
  assert.equal(
    (
      await request("/outfits", "POST", {
        name: "Duplicates",
        items: [{ itemId: item.id }, { itemId: item.id }],
      })
    ).status,
    400,
  );
  await request(`/wardrobe/${item.id}`, "DELETE");
  assert.equal((await request(`/outfits/${id}`)).body.items.length, 1);
  assert.equal(
    (
      await request("/outfits", "POST", {
        name: "Archived",
        items: [{ itemId: item.id }],
      })
    ).status,
    422,
  );
  assert.equal((await request(`/outfits/${id}`, "DELETE")).status, 204);
  assert.equal((await request(`/outfits/${id}`)).status, 404);
});

test("validation rejects invalid writes and query values", async () => {
  for (const patch of [
    { name: " " },
    { category: "Invalid" },
    { wearCount: -1 },
    { aiConfidence: 2 },
    { seasons: ["Monsoon"] },
    { originalImage: "javascript:alert(1)" },
    { surprise: true },
  ]) {
    assert.equal(
      (await request("/wardrobe", "POST", { ...input, ...patch })).status,
      400,
    );
  }
  for (const query of ["favorite=maybe", "season=bad", "status=bad"])
    assert.equal((await request(`/wardrobe?${query}`)).status, 400);
  assert.equal(
    (await request("/wardrobe/missing", "PATCH", { name: "Valid" })).status,
    404,
  );
  assert.equal((await request("/wardrobe/missing", "DELETE")).status, 404);
  assert.equal(
    (await request("/outfits", "POST", { name: "Empty", items: [] })).status,
    400,
  );
  const malformed = await fetch(base + "/wardrobe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(malformed.status, 400);
});

test("profile updates persist without clearing unrelated preferences", async () => {
  assert.equal((await request("/style-profile")).body.confidence, null);
  await request("/style-profile", "PATCH", {
    aestheticTags: ["Minimalist"],
    preferredColors: ["Black"],
  });
  const updated = await request("/style-profile", "PATCH", {
    avoidedColors: ["Orange"],
  });
  assert.deepEqual(updated.body.aestheticTags, ["Minimalist"]);
  assert.deepEqual(updated.body.preferredColors, ["Black"]);
  assert.equal(updated.body.learning.status, "not-started");
  assert.equal(
    (await request("/style-profile", "PATCH", { confidence: 100 })).status,
    400,
  );
});

test("image storage validates format and serves stored content", async () => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  );
  const upload = await fetch(base + "/images", {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: png,
  });
  assert.equal(upload.status, 201);
  const { url } = await upload.json();
  const stored = await fetch(base.replace(/\/api$/, "") + url);
  assert.equal(stored.status, 200);
  assert.deepEqual(Buffer.from(await stored.arrayBuffer()), png);
  const invalid = await fetch(base + "/images", {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: "not an image",
  });
  assert.equal(invalid.status, 415);
});

test("image upload rejects missing, unsupported, mismatched, corrupt and oversized files", async () => {
  assert.equal(
    (
      await fetch(base + "/images", {
        method: "POST",
        headers: { "Content-Type": "image/png" },
      })
    ).status,
    415,
  );
  assert.equal(
    (
      await fetch(base + "/images", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "plain",
      })
    ).status,
    415,
  );
  assert.equal(
    (
      await fetch(base + "/images", {
        method: "POST",
        headers: { "Content-Type": "image/png" },
        body: "not an image",
      })
    ).status,
    415,
  );
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  );
  assert.equal(
    (
      await fetch(base + "/images", {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: png,
      })
    ).status,
    415,
  );
  assert.equal(
    (
      await fetch(base + "/images", {
        method: "POST",
        headers: { "Content-Type": "image/png" },
        body: Buffer.alloc(5 * 1024 * 1024 + 1),
      })
    ).status,
    413,
  );
});

test("analysis returns suggestions without auto-saving and reviewed corrections persist", async () => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  );
  const upload = await fetch(base + "/images", {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: png,
  });
  const { url } = await upload.json();
  const before = (await request("/wardrobe?status=all")).body.length;
  assert.equal(
    (await request("/wardrobe/analyze-image", "POST", {})).status,
    400,
  );
  assert.equal(
    (
      await request("/wardrobe/analyze-image", "POST", {
        imageUrl: "/uploads/../../secret.png",
      })
    ).status,
    400,
  );
  const analyzed = await request("/wardrobe/analyze-image", "POST", {
    imageUrl: url,
  });
  assert.equal(analyzed.status, 200);
  assert.equal(analyzed.body.suggestedName, analysisResult.suggestedName);
  assert.equal((await request("/wardrobe?status=all")).body.length, before);
  const reviewed = {
    ...analysisToWardrobeInput(analysisResult, url),
    fit: "Relaxed",
  };
  reviewed.userCorrectedFields = findUserCorrectedFields(
    analysisResult,
    reviewed,
  );
  const saved = await request("/wardrobe", "POST", reviewed);
  assert.equal(saved.status, 201);
  assert.deepEqual(saved.body.userCorrectedFields, ["fit"]);
  assert.equal(saved.body.aiConfidence, analysisResult.confidence);
  assert.equal(analyzerCalls, 1);
});

test("manual wardrobe save does not require or invoke AI", async () => {
  const calls = analyzerCalls;
  const saved = await request("/wardrobe", "POST", {
    ...input,
    name: "Manual item",
    originalImage: "/uploads/manual.jpg",
  });
  assert.equal(saved.status, 201);
  assert.equal(saved.body.aiConfidence, null);
  assert.equal(saved.body.aiAnalysisVersion, null);
  assert.equal(analyzerCalls, calls);
});

test("style-item endpoint returns wardrobe-only looks and saves an AI-assisted outfit", async () => {
  const selected = (
    await request("/wardrobe", "POST", {
      ...input,
      name: "Style anchor",
      category: "Tops",
      originalImage: "/uploads/anchor.jpg",
    })
  ).body;
  const bottom = (
    await request("/wardrobe", "POST", {
      ...input,
      name: "Style bottom",
      category: "Bottoms",
      primaryColor: "Navy",
      originalImage: "/uploads/bottom.jpg",
    })
  ).body;
  const shoes = (
    await request("/wardrobe", "POST", {
      ...input,
      name: "Style shoes",
      category: "Shoes",
      primaryColor: "Black",
      originalImage: "/uploads/shoes.jpg",
    })
  ).body;
  recommendationResult = {
    outfits: [
      {
        itemIds: [selected.id, bottom.id, shoes.id],
        title: "Polished contrast",
        explanation:
          "The dark base balances the light shirt while the shoes repeat its tailored formality.",
        styleTags: ["Minimalist"],
        occasionFit: "Work",
      },
    ],
  };
  assert.equal(
    (await request("/outfits/style-item", "POST", { wardrobeItemId: "" }))
      .status,
    400,
  );
  const recommended = await request("/outfits/style-item", "POST", {
    wardrobeItemId: selected.id,
    occasion: "Work",
    style: "Minimalist",
  });
  assert.equal(recommended.status, 200);
  assert.deepEqual(recommended.body.outfits[0].missingCategories, []);
  assert(recommended.body.outfits[0].itemIds.includes(selected.id));
  assert.equal(recommendationContext?.request.occasion, "Work");
  const look = recommended.body.outfits[0];
  const saved = await request("/outfits", "POST", {
    name: look.title,
    source: "ai-assisted",
    items: look.itemIds.map((itemId: string) => ({ itemId })),
    styleTags: look.styleTags,
    occasion: look.occasionFit,
    recommendationExplanation: look.explanation,
  });
  assert.equal(saved.status, 201);
  assert.equal(saved.body.source, "ai-assisted");
  assert.equal(saved.body.recommendationExplanation, look.explanation);
  assert.deepEqual(
    saved.body.items.map((member: { itemId: string }) => member.itemId),
    look.itemIds,
  );
});

test("inspired recommendations expose sources and still save unchanged", async () => {
  const selected = (
    await request("/wardrobe", "POST", {
      ...input,
      name: "Inspired anchor",
      category: "Tops",
      originalImage: "/uploads/inspired-anchor.jpg",
    })
  ).body;
  const jeans = (
    await request("/wardrobe", "POST", {
      ...input,
      name: "Dark selvedge jeans",
      category: "Bottoms",
      subcategory: "Jeans",
      primaryColor: "Navy",
      material: "Denim",
      silhouette: "Straight",
      originalImage: "/uploads/inspired-jeans.jpg",
    })
  ).body;
  inspirationDirections = [
    {
      name: "Polished dark denim",
      desiredCategories: ["Bottoms"],
      desiredTraits: ["dark denim", "straight leg"],
      colorDirection: ["dark indigo"],
      styleTags: ["polished"],
      reasoning: "Dark denim grounds a light top.",
      sourceReferences: [
        {
          provider: "vogue.com",
          title: "How to style a satin blouse",
          url: "https://vogue.com/looks/1",
        },
      ],
    },
  ];
  recommendationResult = {
    outfits: [
      {
        itemIds: [selected.id, jeans.id],
        title: "Polished dark denim",
        explanation: "The dark denim grounds the light shirt.",
        styleTags: ["Minimalist"],
        occasionFit: "Work",
        directionName: "Polished dark denim",
      },
    ],
  };
  const inspired = await request("/outfits/style-item", "POST", {
    wardrobeItemId: selected.id,
    useInspiration: true,
  });

  assert.equal(inspired.status, 200);
  assert.equal(inspired.body.inspirationProvider, "stub-search");
  const look = inspired.body.outfits[0];
  assert.equal(look.inspiration.directionName, "Polished dark denim");
  assert.deepEqual(
    look.inspiration.sources.map((source: { url: string }) => source.url),
    ["https://vogue.com/looks/1"],
  );
  assert(look.itemIds.includes(selected.id));

  const saved = await request("/outfits", "POST", {
    name: look.title,
    source: "ai-assisted",
    items: look.itemIds.map((itemId: string) => ({ itemId })),
    styleTags: look.styleTags,
    occasion: look.occasionFit,
    recommendationExplanation: look.explanation,
  });
  assert.equal(saved.status, 201);
  assert.deepEqual(
    saved.body.items.map((member: { itemId: string }) => member.itemId),
    look.itemIds,
  );
  inspirationDirections = [];
});

test("demo seed is idempotent and never resurrects deleted outfits", async () => {
  await seedDemo(database.db);
  await request("/wardrobe/w-1", "PATCH", { name: "User correction" });
  await request("/outfits/o-1", "DELETE");
  await seedDemo(database.db);
  assert.equal((await request("/wardrobe/w-1")).body.name, "User correction");
  assert.equal((await request("/outfits/o-1")).status, 404);
});

test("data survives closing and reopening the database", async () => {
  const service = createWardrobeService(database.db);
  const beforeItems = await service.listItems({ status: "all" });
  await database.close();
  database = createDatabase(undefined, path.join(dir, "db"));
  await migrate(database.db, migration);
  const reopened = createWardrobeService(database.db);
  assert.deepEqual(await reopened.listItems({ status: "all" }), beforeItems);
  assert.deepEqual((await reopened.getProfile()).avoidedColors, ["Orange"]);
});
