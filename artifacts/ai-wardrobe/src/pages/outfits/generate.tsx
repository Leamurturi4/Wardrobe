import { AppShell } from "@/components/layout/AppShell";
import { Sparkles, Wand2, RefreshCw, X, Plus, Filter, Umbrella, Briefcase, Calendar as CalendarIcon, Coffee } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { MOCK_WARDROBE } from "@/lib/mock-wardrobe";
import { ItemCard } from "@/components/wardrobe/ItemCard";
import { MOCK_OUTFITS, Outfit } from "@/lib/mock-outfits";
import { OutfitCard } from "@/components/outfits/OutfitCard";
import { cn } from "@/lib/utils";

export default function GenerateOutfit() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutfit, setGeneratedOutfit] = useState<Outfit | null>(null);
  
  // Generation inputs
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  
  const [filters, setFilters] = useState({
    weather: "Sunny",
    occasion: "Casual",
    vibe: "Minimalist"
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    setGeneratedOutfit(null);
    
    // Simulate API delay
    setTimeout(() => {
      setIsGenerating(false);
      // Pick a random mock outfit to display as generated
      const randomOutfit = MOCK_OUTFITS[Math.floor(Math.random() * MOCK_OUTFITS.length)];
      setGeneratedOutfit({
        ...randomOutfit,
        id: `gen-${Date.now()}`,
        name: "AI Suggested Look",
        isFavorite: false
      });
    }, 3000);
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-serif font-medium tracking-tight">Outfit Stylist</h1>
          <p className="text-muted-foreground text-lg">
            Let the AI curate the perfect look from your wardrobe. Give it a prompt, select anchor pieces, or just be surprised.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pt-4">
          
          {/* Left Column - Controls */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-8">
              
              {/* Natural Language Prompt */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">What's the plan?</label>
                <textarea 
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="e.g. A casual coffee date in the city on a crisp autumn afternoon..."
                  className="w-full h-24 p-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                />
              </div>

              {/* Quick Filters */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Context parameters</label>
                  <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <Filter className="w-3 h-3" /> More
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
                      <Umbrella className="w-3 h-3" /> Weather
                    </span>
                    <select 
                      value={filters.weather}
                      onChange={e => setFilters({...filters, weather: e.target.value})}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm outline-none"
                    >
                      <option>Sunny & Warm</option>
                      <option>Crisp Autumn</option>
                      <option>Rainy</option>
                      <option>Freezing</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3" /> Occasion
                    </span>
                    <select 
                      value={filters.occasion}
                      onChange={e => setFilters({...filters, occasion: e.target.value})}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm outline-none"
                    >
                      <option>Casual</option>
                      <option>Smart Casual</option>
                      <option>Business</option>
                      <option>Evening / Date</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> Vibe
                    </span>
                    <select 
                      value={filters.vibe}
                      onChange={e => setFilters({...filters, vibe: e.target.value})}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm outline-none"
                    >
                      <option>Minimalist</option>
                      <option>Streetwear</option>
                      <option>Classic</option>
                      <option>Avant-Garde</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Anchor Pieces */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Anchor pieces (Optional)</label>
                  <span className="text-xs text-muted-foreground">{selectedItems.length} selected</span>
                </div>
                
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                  {/* Selected Items Previews */}
                  {selectedItems.map(id => {
                    const item = MOCK_WARDROBE.find(i => i.id === id);
                    if (!item) return null;
                    return (
                      <div key={id} className="relative w-16 h-16 rounded-xl border border-primary shrink-0 overflow-hidden bg-secondary">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover mix-blend-multiply" />
                        <button 
                          onClick={() => toggleItemSelection(id)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-background rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  
                  {/* Add button */}
                  <button className="w-16 h-16 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:bg-secondary/50 hover:border-foreground/30 transition-all shrink-0 gap-1">
                    <Plus className="w-4 h-4" />
                    <span className="text-[10px] font-medium">Add</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full h-12 rounded-full bg-foreground text-background font-medium flex items-center justify-center gap-2 hover:bg-foreground/90 transition-all shadow-sm disabled:opacity-70"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" /> Curating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" /> Generate Outfit
                    </>
                  )}
                </button>
                
                <button className="w-full h-12 rounded-full border border-border bg-background text-foreground font-medium hover:bg-secondary transition-all">
                  Surprise Me
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-7 flex flex-col">
            
            {!isGenerating && !generatedOutfit && (
              <div className="flex-1 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center p-12 text-center bg-card/50 min-h-[500px]">
                <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mb-6">
                  <Sparkles className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-serif font-medium mb-3 text-foreground">Waiting for your cue</h3>
                <p className="text-muted-foreground max-w-sm">Adjust your preferences on the left and tap generate to see what the AI stylist puts together.</p>
              </div>
            )}

            {isGenerating && (
              <div className="flex-1 border border-border rounded-3xl flex flex-col items-center justify-center p-12 text-center bg-card min-h-[500px] relative overflow-hidden">
                {/* Decorative scanning effects */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent h-[200%] animate-[scan_3s_linear_infinite]" />
                
                <div className="relative z-10 space-y-6 flex flex-col items-center">
                  <div className="flex gap-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-16 h-20 bg-secondary/80 rounded-xl animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-2">Analyzing your wardrobe...</h3>
                    <p className="text-sm text-muted-foreground">Finding the perfect balance of color and proportion.</p>
                  </div>
                </div>
              </div>
            )}

            {generatedOutfit && !isGenerating && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-serif font-medium">Your Generated Look</h2>
                  <div className="flex gap-2">
                    <button onClick={handleGenerate} className="px-4 py-2 rounded-full border border-border bg-background hover:bg-secondary text-sm font-medium transition-colors flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" /> Regenerate
                    </button>
                    <button className="px-6 py-2 rounded-full bg-foreground text-background text-sm font-medium transition-colors hover:bg-foreground/90">
                      Save Outfit
                    </button>
                  </div>
                </div>

                <div className="max-w-md">
                  <OutfitCard outfit={generatedOutfit} />
                </div>

                <div className="space-y-4 pt-4">
                  <h3 className="font-serif font-medium text-lg">Why this works</h3>
                  <div className="p-5 bg-secondary/30 rounded-2xl border border-border">
                    <p className="text-sm leading-relaxed">
                      This combination perfectly balances the relaxed nature of the {filters.occasion.toLowerCase()} occasion with a {filters.vibe.toLowerCase()} aesthetic. The tones complement your requested {filters.weather.toLowerCase()} context, while the textures provide depth without feeling overcomplicated.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-serif font-medium text-lg">Pieces used</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {generatedOutfit.items.map(item => (
                      <ItemCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(-50%); }
          100% { transform: translateY(0%); }
        }
      `}} />
    </AppShell>
  );
}