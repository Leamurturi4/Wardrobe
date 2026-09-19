import express, { type Express, type ErrorRequestHandler } from "express";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { z } from "@workspace/api-zod";
import { DomainError, type WardrobeService } from "./services/wardrobe";
import { wardrobeRouter } from "./routes/wardrobe";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

export function createApp(service: WardrobeService, uploadDir: string): Express {
const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: false }));
app.use("/uploads", express.static(uploadDir, { dotfiles: "deny" }));
app.post("/api/images", express.raw({ type: ["image/png", "image/jpeg", "image/webp"], limit: "5mb" }), async (req, res) => {
  const body: unknown = req.body;
  if (!Buffer.isBuffer(body)) throw new DomainError(415, "Upload a PNG, JPEG or WebP image");
  const ext = body.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "png"
    : body[0] === 255 && body[1] === 216 && body[2] === 255 ? "jpg"
    : body.toString("ascii", 0, 4) === "RIFF" && body.toString("ascii", 8, 12) === "WEBP" ? "webp" : null;
  if (!ext) throw new DomainError(415, "Unsupported image contents");
  await mkdir(uploadDir, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(uploadDir, filename), body);
  res.status(201).json({ url: `/uploads/${filename}` });
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use("/api", wardrobeRouter(service));
app.use("/api", (_req, res) => { res.status(404).json({ error: "Endpoint not found" }); });
const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof z.ZodError) { res.status(400).json({ error: "Invalid request", issues: error.issues }); return; }
  if (error instanceof DomainError) { res.status(error.status).json({ error: error.message }); return; }
  if (error instanceof SyntaxError) { res.status(400).json({ error: "Invalid JSON body" }); return; }
  if (typeof error === "object" && error !== null && "type" in error && error.type === "entity.too.large") {
    res.status(413).json({ error: "Image must be under 5 MB" }); return;
  }
  logger.error({ err: error }, "Request failed");
  res.status(500).json({ error: "Could not complete the request" });
};
app.use(errors);
return app;
}
