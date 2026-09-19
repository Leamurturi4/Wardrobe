import { Router } from "express";
import type { WardrobeService } from "../services/wardrobe";
export function wardrobeRouter(service: WardrobeService) {
  const router = Router();
  router.get("/wardrobe", async (req, res) => { res.json(await service.listItems(req.query)); });
  router.get("/wardrobe/:id", async (req, res) => { res.json(await service.getItem(req.params.id)); });
  router.post("/wardrobe", async (req, res) => { res.status(201).json(await service.createItem(req.body)); });
  router.patch("/wardrobe/:id", async (req, res) => { res.json(await service.updateItem(req.params.id, req.body)); });
  router.delete("/wardrobe/:id", async (req, res) => { res.json(await service.archiveItem(req.params.id)); });
  router.post("/wardrobe/:id/favorite", async (req, res) => { res.json(await service.toggleItemFavorite(req.params.id)); });
  router.get("/outfits", async (req, res) => { res.json(await service.listOutfits(req.query)); });
  router.get("/outfits/:id", async (req, res) => { res.json(await service.getOutfit(req.params.id)); });
  router.post("/outfits", async (req, res) => { res.status(201).json(await service.createOutfit(req.body)); });
  router.patch("/outfits/:id", async (req, res) => { res.json(await service.updateOutfit(req.params.id, req.body)); });
  router.delete("/outfits/:id", async (req, res) => { await service.deleteOutfit(req.params.id); res.status(204).end(); });
  router.post("/outfits/:id/favorite", async (req, res) => { res.json(await service.toggleOutfitFavorite(req.params.id)); });
  router.get("/style-profile", async (_req, res) => { res.json(await service.getProfile()); });
  router.patch("/style-profile", async (req, res) => { res.json(await service.updateProfile(req.body)); });
  return router;
}
