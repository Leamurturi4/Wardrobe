import { AppShell } from "@/components/layout/AppShell";
import { ChevronLeft, Edit2, Trash2, Heart, Share, Calendar, Sparkles, AlertCircle } from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { useState, useMemo } from "react";
import { MOCK_WARDROBE } from "@/lib/mock-wardrobe";
import { OutfitCard } from "@/components/outfits/OutfitCard";
import { MOCK_OUTFITS } from "@/lib/mock-outfits";
import { cn } from "@/lib/utils";

export default function WardrobeDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  
  const [item, setItem] = useState(() => MOCK_WARDROBE.find(i => i.id === id) || MOCK_WARDROBE[0]);
  
  // Find outfits this item appears in
  const relatedOutfits = useMemo(() => {
    return MOCK_OUTFITS.filter(outfit => outfit.items.some(i => i.id === item.id));
  }, [item.id]);

  const toggleFavorite = () => {
    setItem(prev => ({ ...prev, isFavorite: !prev.isFavorite }));
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to remove this item from your wardrobe?")) {
      setLocation("/wardrobe");
    }
  };

  if (!item) return null;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-12 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Nav Header */}
        <div className="flex items-center justify-between">
          <Link href="/wardrobe" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
            <div className="w-10 h-10 rounded-full bg-secondary/50 group-hover:bg-secondary flex items-center justify-center transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </div>
            <span className="font-medium">Back to Wardrobe</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleFavorite}
              className="w-10 h-10 rounded-full bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-colors"
            >
              <Heart className={cn("w-5 h-5", item.isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
            </button>
            <button className="w-10 h-10 rounded-full bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-colors text-muted-foreground">
              <Share className="w-4 h-4" />
            </button>
            <div className="h-6 w-px bg-border mx-1" />
            <button className="h-10 px-4 rounded-full bg-secondary/50 hover:bg-secondary flex items-center gap-2 transition-colors text-sm font-medium">
              <Edit2 className="w-4 h-4" /> Edit
            </button>
            <button onClick={handleDelete} className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 flex items-center justify-center transition-colors text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* Left Column - Image */}
          <div className="lg:col-span-5">
            <div className="sticky top-8">
              <div className="aspect-[3/4] rounded-3xl overflow-hidden bg-secondary relative border border-border shadow-md group">
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  className="w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-700" 
                />
              </div>
            </div>
          </div>
          
          {/* Right Column - Details */}
          <div className="lg:col-span-7 space-y-10">
            {/* Header Info */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-secondary text-xs font-medium text-secondary-foreground">{item.category}</span>
                <span className="px-3 py-1 rounded-full border border-border text-xs font-medium text-muted-foreground">{item.color}</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-serif font-medium tracking-tight text-foreground leading-tight">
                {item.name}
              </h1>
              <p className="text-xl text-muted-foreground">{item.brand}</p>
            </div>

            <hr className="border-border" />

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/50">
                <div className="text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="text-2xl font-serif font-medium">{item.wearCount}</div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Times Worn</div>
              </div>
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/50">
                <div className="text-muted-foreground mb-1">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-lg font-medium">{relatedOutfits.length}</div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Saved Outfits</div>
              </div>
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/50 col-span-2 md:col-span-2">
                <div className="text-muted-foreground mb-1">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="text-base font-medium truncate">
                  {item.lastWorn ? new Date(item.lastWorn).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Never'}
                </div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Last Worn</div>
              </div>
            </div>

            {/* Attributes */}
            <div className="space-y-6">
              <h3 className="text-lg font-serif font-medium">Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground text-sm">Material</span>
                  <span className="font-medium text-sm">{item.material}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground text-sm">Color</span>
                  <span className="font-medium text-sm">{item.color}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground text-sm">Seasons</span>
                  <span className="font-medium text-sm">{item.season.join(", ")}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground text-sm">Occasions</span>
                  <span className="font-medium text-sm">{item.occasion.join(", ")}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground text-sm">Date Added</span>
                  <span className="font-medium text-sm">{new Date(item.dateAdded).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-serif font-medium">Stylist Notes</h3>
                <button className="text-sm font-medium text-muted-foreground hover:text-foreground">Edit Notes</button>
              </div>
              <div className="p-5 rounded-2xl bg-secondary/20 border border-border">
                {item.notes ? (
                  <p className="text-sm leading-relaxed text-foreground/80">{item.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No notes added yet. Add care instructions, fit details, or styling ideas.</p>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Featured in Outfits Section */}
        {relatedOutfits.length > 0 && (
          <div className="pt-12 border-t border-border space-y-8">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-serif font-medium mb-1">Featured In</h2>
                <p className="text-muted-foreground text-sm">Outfits incorporating this piece.</p>
              </div>
              <Link href="/outfits/saved" className="text-sm font-medium text-primary hover:underline">
                View All Outfits
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedOutfits.map(outfit => (
                <OutfitCard key={outfit.id} outfit={outfit} />
              ))}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}