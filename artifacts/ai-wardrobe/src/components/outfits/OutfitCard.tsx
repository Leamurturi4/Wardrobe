import { Heart, Calendar, MoreHorizontal } from "lucide-react";
import { Link } from "wouter";
import { Outfit } from "@/lib/wardrobe-api";
import { cn } from "@/lib/utils";
import { useClosetMutation } from "@/lib/wardrobe-api";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface OutfitCardProps {
  outfit: Outfit;
  onToggleFavorite?: (id: string) => void;
}

export function OutfitCard({ outfit, onToggleFavorite }: OutfitCardProps) {
  const mutation = useClosetMutation();
  const rename = () => {
    const name = prompt("Outfit name", outfit.name);
    if (name !== null) mutation.mutate({ path: `outfits/${outfit.id}`, body: { name } });
  };
  const remove = () => {
    if (confirm(`Delete ${outfit.name}?`)) mutation.mutate({ path: `outfits/${outfit.id}`, method: "DELETE" });
  };
  return (
    <div className="group relative rounded-2xl border border-border bg-card overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 mb-6 break-inside-avoid">
      <div className="relative bg-secondary/20 aspect-[4/5] overflow-hidden">
        <img 
          src={outfit.imageUrl} 
          alt={outfit.name} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
        />
        
        {/* Overlay gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Top actions */}
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0">
          <DropdownMenu><DropdownMenuTrigger asChild><button aria-label={`Actions for ${outfit.name}`} className="w-9 h-9 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors shadow-sm">
            <MoreHorizontal className="w-4 h-4" />
          </button></DropdownMenuTrigger><DropdownMenuContent>
            <DropdownMenuItem onSelect={rename}>Rename</DropdownMenuItem>
            <DropdownMenuItem onSelect={remove}>Delete</DropdownMenuItem>
          </DropdownMenuContent></DropdownMenu>
        </div>

        {/* Floating composition preview */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-[10px] group-hover:translate-y-0">
          <div className="flex -space-x-3 bg-background/80 backdrop-blur-md p-2 rounded-xl shadow-lg border border-white/10">
            {outfit.items.slice(0, 4).map((item, idx) => (
              <div key={item.id} className="w-10 h-10 rounded-lg border-2 border-background overflow-hidden bg-white z-[1] relative" style={{ zIndex: 4 - idx }}>
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover mix-blend-multiply" />
              </div>
            ))}
            {outfit.items.length > 4 && (
              <div className="w-10 h-10 rounded-lg border-2 border-background bg-secondary flex items-center justify-center text-xs font-medium z-[0]">
                +{outfit.items.length - 4}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-5 flex flex-col gap-3">
        <div className="flex justify-between items-start gap-3">
          <div>
            <h3 className="font-serif font-medium text-lg text-foreground line-clamp-1">{outfit.name}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{outfit.occasion} • {outfit.season}</p>
          </div>
          <button 
            onClick={(e) => {
              e.preventDefault();
              if (onToggleFavorite) onToggleFavorite(outfit.id);
              else mutation.mutate({ path: `outfits/${outfit.id}/favorite`, method: "POST" });
            }}
            className={cn(
              "w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-colors",
              outfit.isFavorite 
                ? "text-red-500" 
                : "text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary"
            )}
          >
            <Heart className={cn("w-4 h-4", outfit.isFavorite && "fill-current")} />
          </button>
        </div>
        
        {outfit.lastWorn && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 mt-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Last worn {new Date(outfit.lastWorn).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        )}
      </div>
    </div>
  );
}
