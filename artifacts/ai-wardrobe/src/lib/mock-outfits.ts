import { WardrobeItem, MOCK_WARDROBE } from "./mock-wardrobe";

export type Outfit = {
  id: string;
  name: string;
  occasion: string;
  season: string;
  items: WardrobeItem[];
  imageUrl: string;
  isFavorite: boolean;
  lastWorn?: string;
  dateCreated: string;
};

export const MOCK_OUTFITS: Outfit[] = [
  {
    id: "o-1",
    name: "Weekend Coffee Run",
    occasion: "Casual",
    season: "Spring",
    items: [
      MOCK_WARDROBE.find(i => i.id === "w-1")!,
      MOCK_WARDROBE.find(i => i.id === "w-2")!,
      MOCK_WARDROBE.find(i => i.id === "w-5")!,
    ],
    imageUrl: "/images/outfits/outfit-1.png",
    isFavorite: true,
    lastWorn: "2023-09-24",
    dateCreated: "2023-04-10",
  },
  {
    id: "o-2",
    name: "Dinner in the City",
    occasion: "Smart Casual",
    season: "Autumn",
    items: [
      MOCK_WARDROBE.find(i => i.id === "w-3")!,
      MOCK_WARDROBE.find(i => i.id === "w-6")!,
      MOCK_WARDROBE.find(i => i.id === "w-7")!, // Optional fallback if undefined
    ].filter(Boolean),
    imageUrl: "/images/outfits/outfit-2.png",
    isFavorite: true,
    dateCreated: "2023-08-20",
  },
  {
    id: "o-3",
    name: "Creative Studio Day",
    occasion: "Casual",
    season: "Autumn",
    items: [
      MOCK_WARDROBE.find(i => i.id === "w-4")!,
      MOCK_WARDROBE.find(i => i.id === "w-10")!,
      MOCK_WARDROBE.find(i => i.id === "w-2")!,
      MOCK_WARDROBE.find(i => i.id === "w-9")!,
    ].filter(Boolean),
    imageUrl: "/images/outfits/outfit-3.png",
    isFavorite: false,
    lastWorn: "2023-10-02",
    dateCreated: "2023-09-05",
  }
];
