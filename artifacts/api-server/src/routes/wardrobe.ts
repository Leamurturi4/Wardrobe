import { Router } from "express";
import type { WardrobeService } from "../services/wardrobe";
import { clothingAnalysisRequestSchema } from "@workspace/api-zod";
import {
  analyzeStoredImage,
  ClothingAnalysisError,
  type ClothingAnalyzer,
} from "../services/clothing-analysis";
import type { StyleItemService } from "../services/outfit-recommendation";
export function wardrobeRouter(
  service: WardrobeService,
  options: {
    uploadDir: string;
    analyzer?: ClothingAnalyzer;
    styleItemService?: StyleItemService;
  },
) {
  const router = Router();
  router.get("/wardrobe", async (req, res) => {
    res.json(await service.listItems(req.query));
  });
  router.get("/wardrobe/:id", async (req, res) => {
    res.json(await service.getItem(req.params.id));
  });
  router.post("/wardrobe", async (req, res) => {
    res.status(201).json(await service.createItem(req.body));
  });
  router.patch("/wardrobe/:id", async (req, res) => {
    res.json(await service.updateItem(req.params.id, req.body));
  });
  router.delete("/wardrobe/:id", async (req, res) => {
    res.json(await service.archiveItem(req.params.id));
  });
  router.post("/wardrobe/:id/favorite", async (req, res) => {
    res.json(await service.toggleItemFavorite(req.params.id));
  });
  router.post("/wardrobe/analyze-image", async (req, res) => {
    if (!options.analyzer)
      throw new ClothingAnalysisError(
        503,
        "AI analysis is not configured. You can continue with manual entry.",
      );
    const { imageUrl } = clothingAnalysisRequestSchema.parse(req.body);
    res.json(
      await analyzeStoredImage(imageUrl, options.uploadDir, options.analyzer),
    );
  });
  router.get("/outfits", async (req, res) => {
    res.json(await service.listOutfits(req.query));
  });
  router.get("/outfits/:id", async (req, res) => {
    res.json(await service.getOutfit(req.params.id));
  });
  router.post("/outfits/style-item", async (req, res) => {
    if (!options.styleItemService)
      throw new ClothingAnalysisError(
        503,
        "AI recommendations are not configured. Manual outfit building is still available.",
      );
    res.json(await options.styleItemService.recommend(req.body));
  });
  router.post("/outfits", async (req, res) => {
    res.status(201).json(await service.createOutfit(req.body));
  });
  router.patch("/outfits/:id", async (req, res) => {
    res.json(await service.updateOutfit(req.params.id, req.body));
  });
  router.delete("/outfits/:id", async (req, res) => {
    await service.deleteOutfit(req.params.id);
    res.status(204).end();
  });
  router.post("/outfits/:id/favorite", async (req, res) => {
    res.json(await service.toggleOutfitFavorite(req.params.id));
  });
  router.get("/style-profile", async (_req, res) => {
    res.json(await service.getProfile());
  });
  router.patch("/style-profile", async (req, res) => {
    res.json(await service.updateProfile(req.body));
  });
  return router;
}
