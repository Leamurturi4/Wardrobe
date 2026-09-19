import { AppShell } from "@/components/layout/AppShell";
import { Plus, Search, LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { useWardrobe, useClosetMutation } from "@/lib/wardrobe-api";
import { DataStatus } from "@/components/DataStatus";
import { ItemCard } from "@/components/wardrobe/ItemCard";

const CATEGORIES = ["All", "Tops", "Bottoms", "Outerwear", "Dresses", "Shoes", "Bags", "Accessories", "Jewelry"];

export default function Wardrobe() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const query = useWardrobe({ search, ...(activeCategory !== "All" ? { category: activeCategory } : {}), ...(favoritesOnly ? { favorite: "true" } : {}) });
  const items = query.data || [];
  const mutation = useClosetMutation();

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                            item.brand.toLowerCase().includes(search.toLowerCase()) ||
                            item.color.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, activeCategory]);

  const toggleFavorite = (id: string) => mutation.mutate({ path: `wardrobe/${id}/favorite`, method: "POST" });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-serif font-medium mb-3 tracking-tight">Wardrobe</h1>
            <p className="text-muted-foreground text-lg max-w-md">Your complete digital closet. Organized, analyzed, and ready to style.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Link href="/wardrobe/add" className="w-full md:w-auto h-11 px-6 bg-foreground text-background flex items-center justify-center gap-2 rounded-full text-sm font-medium hover:bg-foreground/90 transition-all shadow-sm hover:shadow-md">
              <Plus className="w-4 h-4" /> Add Item
            </Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-2 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center w-full sm:w-auto overflow-x-auto no-scrollbar gap-1 p-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeCategory === cat 
                    ? "bg-secondary text-secondary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto px-1 sm:px-0">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pieces..." 
                className="w-full h-10 pl-9 pr-4 rounded-xl border-none bg-secondary/50 text-sm focus:outline-none focus:ring-1 focus:ring-border transition-all"
              />
            </div>
            <div className="flex bg-secondary/50 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode("grid")}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode("list")}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button aria-label="Favorites only" aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly(v => !v)} className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {query.isPending || query.error ? <DataStatus pending={query.isPending} error={query.error} /> : filteredItems.length > 0 ? (
          <div className={
            viewMode === "grid" 
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6" 
              : "flex flex-col gap-4"
          }>
            {filteredItems.map((item, idx) => (
              <div 
                key={item.id} 
                className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <ItemCard item={item} viewMode={viewMode} onToggleFavorite={toggleFavorite} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-card rounded-3xl border border-dashed border-border">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-serif font-medium mb-2">No clothing found.</h3>
            <p className="text-muted-foreground mb-8 max-w-sm">We couldn't find any items matching your current filters and search terms.</p>
            <button 
              onClick={() => { setSearch(""); setActiveCategory("All"); }}
              className="px-6 py-2.5 rounded-full border border-border hover:bg-secondary transition-colors text-sm font-medium"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}