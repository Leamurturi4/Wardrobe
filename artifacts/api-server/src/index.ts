import { createApp } from "./app";
import { createDatabase, migrate, seedDemo } from "@workspace/db";
import { createWardrobeService } from "./services/wardrobe";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "./lib/logger";
import {
  createGeminiClothingAnalyzer,
  createGeminiStructuredClient,
} from "./services/clothing-analysis";
import {
  createGeminiOutfitReasoner,
  createStyleItemService,
} from "./services/outfit-recommendation";
import { noOpInspirationSource } from "./services/inspiration";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const database = createDatabase(
  process.env.DATABASE_URL,
  process.env.PGLITE_DATA_DIR,
);
await migrate(
  database.db,
  path.join(root, "lib/db/migrations/0001_wardrobe.sql"),
);
if (process.env.SEED_DEMO === "true") await seedDemo(database.db);
const wardrobeService = createWardrobeService(database.db);
const geminiOptions = {
  apiKey: process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_MODEL,
};
const app = createApp(
  wardrobeService,
  process.env.UPLOAD_DIR || path.join(root, ".local/uploads"),
  createGeminiClothingAnalyzer(geminiOptions),
  createStyleItemService(
    wardrobeService,
    createGeminiOutfitReasoner(createGeminiStructuredClient(geminiOptions)),
    noOpInspirationSource,
  ),
);
const server = app.listen(port, process.env.HOST || "127.0.0.1", () => {
  logger.info({ port }, "Server listening");
});
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    server.close(() => {
      void database.close().then(() => process.exit(0));
    });
  });
