import { AppShell } from "@/components/layout/AppShell";
import { Plus, Search, Filter, Layers, LayoutGrid } from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { MOCK_OUTFITS } from "@/lib/mock-outfits";
import { OutfitCard } from "@/components/outfits/OutfitCard";

const SEASONS = ["All", "Spring", "Summer", "Autumn", "Winter"];

export default function SavedOutfits() {
  const [search, setSearch] = useState("");
  const [activeSeason, setActiveSeason] = useState("All");
  const [outfits, setOutfits] = useState(MOCK_OUTFITS);

  const filteredOutfits = useMemo(() => {
    return outfits.filter((outfit) => {
      const matchesSearch = outfit.name.toLowerCase().includes(search.toLowerCase()) || 
                            outfit.occasion.toLowerCase().includes(search.toLowerCase());
      const matchesSeason = activeSeason === "All" || outfit.season === activeSeason;
      return matchesSearch && matchesSeason;
    });
  }, [outfits, search, activeSeason]);

  const toggleFavorite = (id: string) => {
    setOutfits(outfits.map(outfit => 
      outfit.id === id ? { ...outfit, isFavorite: !outfit.isFavorite } : outfit
    ));
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-serif font-medium mb-3 tracking-tight">Lookbook</h1>
            <p className="text-muted-foreground text-lg max-w-md">Your saved outfits and styling inspirations.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Link href="/outfits/generate" className="w-full md:w-auto h-11 px-6 bg-foreground text-background flex items-center justify-center gap-2 rounded-full text-sm font-medium hover:bg-foreground/90 transition-all shadow-sm hover:shadow-md">
              <Plus className="w-4 h-4" /> New Outfit
            </Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-2 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center w-full sm:w-auto overflow-x-auto no-scrollbar gap-1 p-1">
            {SEASONS.map(season => (
              <button
                key={season}
                onClick={() => setActiveSeason(season)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeSeason === season 
                    ? "bg-secondary text-secondary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {season}
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
                placeholder="Search outfits..." 
                className="w-full h-10 pl-9 pr-4 rounded-xl border-none bg-secondary/50 text-sm focus:outline-none focus:ring-1 focus:ring-border transition-all"
              />
            </div>
            <button className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {filteredOutfits.length > 0 ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
            {filteredOutfits.map((outfit, idx) => (
              <div 
                key={outfit.id} 
                className="animate-in fade-in slide-in-from-bottom-8 fill-mode-both"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <OutfitCard outfit={outfit} onToggleFavorite={toggleFavorite} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-card rounded-3xl border border-dashed border-border">
            <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mb-6">
              <Layers className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-serif font-medium mb-3">No outfits found.</h3>
            {search || activeSeason !== "All" ? (
              <>
                <p className="text-muted-foreground mb-8 max-w-sm">We couldn't find any outfits matching your current filters.</p>
                <button 
                  onClick={() => { setSearch(""); setActiveSeason("All"); }}
                  className="px-6 py-2.5 rounded-full border border-border hover:bg-secondary transition-colors text-sm font-medium"
                >
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-8 max-w-sm">You haven't saved any outfits yet. Let the AI stylist put together some looks for you.</p>
                <Link 
                  href="/outfits/generate"
                  className="px-8 py-3 rounded-full bg-foreground text-background transition-colors text-sm font-medium hover:bg-foreground/90 shadow-sm"
                >
                  Generate First Outfit
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}