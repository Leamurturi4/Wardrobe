import { writeFile } from "node:fs/promises";
import { z, wardrobeInputSchema, wardrobePatchSchema, wardrobeItemSchema, outfitInputSchema, outfitPatchSchema,
  outfitSchema, styleProfileSchema, styleProfilePatchSchema, categories, seasons } from "@workspace/api-zod";

// The shared validation schemas are authoritative; this exports their public contract for Orval/tools.
const models = { ClosetItemInput: wardrobeInputSchema, ClosetItemPatch: wardrobePatchSchema, ClosetItem: wardrobeItemSchema,
  ClosetOutfitInput: outfitInputSchema, ClosetOutfitPatch: outfitPatchSchema, ClosetOutfit: outfitSchema,
  ClosetProfile: styleProfileSchema, ClosetProfilePatch: styleProfilePatchSchema };
const schemas = Object.fromEntries(Object.entries(models).map(([name, schema]) => {
  const { $schema, ...json } = z.toJSONSchema(schema, { io: name.endsWith("Input") || name.endsWith("Patch") ? "input" : "output" });
  return [name, json];
}));
schemas.HealthStatus = { type: "object", properties: { status: { type: "string" } }, required: ["status"] };
schemas.ClosetError = { type: "object", properties: { error: { type: "string" }, issues: { type: "array", items: { type: "object" } } }, required: ["error"] };
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const content = (schema: object) => ({ "application/json": { schema } });
const errors = Object.fromEntries([400, 404, 422, 500].map(code => [code, { description: ({ 400: "Invalid request", 404: "Not found", 422: "Missing or archived outfit member", 500: "Server error" })[code as 400 | 404 | 422 | 500], content: content(ref("ClosetError")) }]));
const id = { name: "id", in: "path", required: true, schema: { type: "string" } };
const query = (name: string, values?: readonly string[]) => ({ name, in: "query", schema: { type: "string", ...(values ? { enum: values } : {}) } });
function operation(operationId: string, response: object, options: { body?: string; list?: boolean; created?: boolean; parameters?: object[]; description?: string } = {}) {
  return { operationId, tags: ["closet"], ...(options.description ? { description: options.description } : {}),
    ...(options.parameters ? { parameters: options.parameters } : {}),
    ...(options.body ? { requestBody: { required: true, content: content(ref(options.body)) } } : {}),
    responses: { [options.created ? "201" : "200"]: { description: "Success", content: content(options.list ? { type: "array", items: response } : response) }, ...errors } };
}
const paths = {
  "/healthz": { get: { operationId: "healthCheck", tags: ["health"], responses: { "200": { description: "Healthy", content: content(ref("HealthStatus")) } } } },
  "/wardrobe": {
    get: operation("listClosetItems", ref("ClosetItem"), { list: true, parameters: [query("category", categories), query("favorite", ["true", "false"]), query("color"), query("season", seasons), query("style"), query("search"), query("status", ["active", "archived", "all"])] }),
    post: operation("createClosetItem", ref("ClosetItem"), { body: "ClosetItemInput", created: true }),
  },
  "/wardrobe/{id}": {
    get: operation("getClosetItem", ref("ClosetItem"), { parameters: [id] }),
    patch: operation("updateClosetItem", ref("ClosetItem"), { parameters: [id], body: "ClosetItemPatch" }),
    delete: operation("archiveClosetItem", ref("ClosetItem"), { parameters: [id], description: "Soft archive. Existing outfit references are retained. Restore using PATCH status=active." }),
  },
  "/wardrobe/{id}/favorite": { post: operation("toggleClosetItemFavorite", ref("ClosetItem"), { parameters: [id] }) },
  "/outfits": {
    get: operation("listClosetOutfits", ref("ClosetOutfit"), { list: true, parameters: [query("favorite", ["true", "false"]), query("season", seasons), query("search")] }),
    post: operation("createClosetOutfit", ref("ClosetOutfit"), { body: "ClosetOutfitInput", created: true }),
  },
  "/outfits/{id}": {
    get: operation("getClosetOutfit", ref("ClosetOutfit"), { parameters: [id] }),
    patch: operation("updateClosetOutfit", ref("ClosetOutfit"), { parameters: [id], body: "ClosetOutfitPatch" }),
    delete: { operationId: "deleteClosetOutfit", tags: ["closet"], parameters: [id], responses: { "204": { description: "Deleted" }, ...errors } },
  },
  "/outfits/{id}/favorite": { post: operation("toggleClosetOutfitFavorite", ref("ClosetOutfit"), { parameters: [id] }) },
  "/style-profile": {
    get: operation("getClosetProfile", ref("ClosetProfile")),
    patch: operation("updateClosetProfile", ref("ClosetProfile"), { body: "ClosetProfilePatch" }),
  },
  "/images": { post: { operationId: "uploadClosetImage", tags: ["closet"], description: "Store a PNG, JPEG or WebP up to 5 MB; no AI analysis. Send raw image bytes.",
    requestBody: { required: true, content: Object.fromEntries(["image/png", "image/jpeg", "image/webp"].map(type => [type, { schema: { type: "string", format: "binary" } }])) },
    responses: { "201": { description: "Stored", content: content({ type: "object", properties: { url: { type: "string" } }, required: ["url"] }) },
      "413": { description: "Too large" }, "415": { description: "Unsupported image" }, ...errors },
  } },
};
// JSON is valid YAML and avoids a second serializer dependency.
await writeFile(new URL("../../../lib/api-spec/openapi.yaml", import.meta.url), JSON.stringify({ openapi: "3.1.0",
  info: { title: "Api", version: "0.2.0", description: "Single-user persisted wardrobe API. Generated from shared Zod schemas." },
  servers: [{ url: "/api" }], tags: [{ name: "health" }, { name: "closet" }], paths, components: { schemas } }, null, 2) + "\n");
