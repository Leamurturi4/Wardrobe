import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { wardrobeItemSchema, outfitSchema, styleProfileSchema, z, type WardrobeItem as DomainItem, type SavedOutfit } from "@workspace/api-zod";
import { useToast } from "@/hooks/use-toast";

// Presentation aliases keep the established components independent of storage details.
export const itemView = (i: DomainItem) => ({ ...i, color: i.primaryColor, season: i.seasons, occasion: i.occasions,
  isFavorite: i.favorite, imageUrl: i.processedImage || i.originalImage, notes: i.description,
  lastWorn: i.lastWornAt, dateAdded: i.createdAt });
export type WardrobeItem = ReturnType<typeof itemView>;
export type Outfit = Omit<SavedOutfit, "items" | "season" | "imageUrl"> & {
  items: WardrobeItem[]; season: string; imageUrl: string; isFavorite: boolean; lastWorn: string | null;
};
export function useWardrobe(filters: Record<string, string> = {}) {
  const query = new URLSearchParams(filters).toString();
  return useQuery({ queryKey: ["closet", "wardrobe", query], queryFn: async () =>
    z.array(wardrobeItemSchema).parse(await customFetch(`/api/wardrobe?${query}`)).map(itemView) });
}
export function useWardrobeItem(id?: string) {
  return useQuery({ queryKey: ["closet", "item", id], enabled: !!id, queryFn: async () =>
    itemView(wardrobeItemSchema.parse(await customFetch(`/api/wardrobe/${encodeURIComponent(id!)}`))) });
}
export function useOutfits() {
  const wardrobe = useWardrobe({ status: "all" });
  const outfits = useQuery({ queryKey: ["closet", "outfits"], queryFn: async () =>
    z.array(outfitSchema).parse(await customFetch("/api/outfits")) });
  const data: Outfit[] | undefined = outfits.data && wardrobe.data ? outfits.data.map(o => {
    const items = o.items.flatMap(member => wardrobe.data!.filter(i => i.id === member.itemId));
    return { ...o, items, season: o.season || "", imageUrl: o.imageUrl || items[0]?.imageUrl || "",
      isFavorite: o.favorite, lastWorn: o.lastWornAt };
  }) : undefined;
  return { ...outfits, data, isPending: wardrobe.isPending || outfits.isPending, error: wardrobe.error || outfits.error };
}
export function useStyleProfile() {
  return useQuery({ queryKey: ["closet", "profile"], queryFn: async () => styleProfileSchema.parse(await customFetch("/api/style-profile")) });
}
export function useClosetMutation() {
  const client = useQueryClient();
  const { toast } = useToast();
  return useMutation({ mutationFn: async ({ path, method = "PATCH", body }: { path: string; method?: string; body?: unknown }) =>
    customFetch(`/api/${path}`, { method, ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["closet"] }); },
    onError: (error: Error) => toast({ title: "Could not save changes", description: error.message, variant: "destructive" }),
  });
}
