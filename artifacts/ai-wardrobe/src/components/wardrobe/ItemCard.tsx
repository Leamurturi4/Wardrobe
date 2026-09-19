import { Heart } from "lucide-react";
import { Link } from "wouter";
import { WardrobeItem } from "@/lib/wardrobe-api";
import { cn } from "@/lib/utils";

interface ItemCardProps {
  item: WardrobeItem;
  viewMode?: "grid" | "list";
  onToggleFavorite?: (id: string) => void;
}

export function ItemCard({ item, viewMode = "grid", onToggleFavorite }: ItemCardProps) {
  const isList = viewMode === "list";

  return (
    <div 
      className={cn(
        "group relative rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5",
        isList ? "flex flex-row h-40" : "flex flex-col"
      )}
    >
      <Link href={`/wardrobe/${item.id}`} className={cn("block bg-secondary/30 relative overflow-hidden", isList ? "w-40 shrink-0 h-full" : "aspect-[3/4] w-full")}>
        <img 
          src={item.imageUrl} 
          alt={item.name} 
          className="w-full h-full object-cover mix-blend-multiply opacity-90 transition-all duration-700 group-hover:scale-105 group-hover:opacity-100" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </Link>
      
      <div className={cn("flex flex-col flex-grow", isList ? "p-6 justify-center" : "p-4")}>
        <div className="flex justify-between items-start gap-4">
          <Link href={`/wardrobe/${item.id}`} className="block flex-grow">
            <h3 className="font-serif font-medium text-base text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
              {item.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {item.brand}
            </p>
          </Link>
          <button 
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite?.(item.id);
            }}
            className={cn(
              "w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 z-10",
              item.isFavorite 
                ? "text-red-500 bg-red-50 dark:bg-red-500/10" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            )}
          >
            <Heart className={cn("w-4 h-4", item.isFavorite && "fill-current")} />
          </button>
        </div>
        
        {isList && (
          <div className="flex items-center gap-2 mt-4">
            <span className="px-2.5 py-1 rounded-full bg-secondary text-xs font-medium text-secondary-foreground">{item.category}</span>
            <span className="px-2.5 py-1 rounded-full border border-border text-xs font-medium text-muted-foreground">{item.color}</span>
            <span className="px-2.5 py-1 rounded-full border border-border text-xs font-medium text-muted-foreground">{item.wearCount} wears</span>
          </div>
        )}
      </div>
    </div>
  );
}
