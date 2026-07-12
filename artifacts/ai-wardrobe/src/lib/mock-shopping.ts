export const mockShopping = {
  wishlist: [
    { id: 1, name: "Silk Blouse", brand: "Lemaire", price: 650, image: "/images/silk-blouse.png" },
    { id: 2, name: "Leather Tote", brand: "The Row", price: 1850, image: "/images/leather-tote.png" },
  ],
  recommended: [
    { id: 3, name: "Camel Wool Coat", brand: "Toteme", price: 1200, image: "/images/wool-coat.png", match: 98, reason: "Completes 12 existing outfits" },
    { id: 4, name: "Cashmere Sweater", brand: "Khaite", price: 890, image: "/images/cashmere-sweater.png", match: 94, reason: "Fills missing knitwear gap" }
  ],
  missing: [
    { category: "Evening Footwear", impact: "High" },
    { category: "Transitional Outerwear", impact: "Medium" }
  ],
  costPerWear: [
    { item: "Black Tailored Trousers", cpw: 2.50 },
    { item: "White Poplin Shirt", cpw: 1.20 },
    { item: "Classic Trench", cpw: 4.80 },
    { item: "Cashmere Scarf", cpw: 1.05 }
  ],
  compatibilityScore: 91
};
