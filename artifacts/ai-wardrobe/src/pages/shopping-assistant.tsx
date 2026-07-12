import { AppShell } from "@/components/layout/AppShell";
import { mockShopping } from "@/lib/mock-shopping";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ShoppingBag, TrendingDown, ArrowRight, Heart, Sparkles, Check } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function ShoppingAssistant() {
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-12">
        <header className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight">Acquisitions</h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Curated pieces that fill strategic gaps in your wardrobe. Every recommendation is calculated based on compatibility, versatility, and your aesthetic DNA.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-primary text-primary-foreground md:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm font-medium tracking-wide uppercase opacity-80">Wardrobe Cohesion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-5xl font-serif font-medium">{mockShopping.compatibilityScore}%</div>
              <p className="text-sm opacity-80 leading-relaxed">
                Your wardrobe is highly integrated. The recommended pieces below will increase your outfit combinations by 14%.
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm bg-card/40 backdrop-blur-md md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground tracking-wide uppercase flex items-center">
                <TrendingDown className="w-4 h-4 mr-2" /> Cost Per Wear Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mockShopping.costPerWear.map((item, i) => (
                  <div key={i} className="space-y-2 p-4 rounded-xl bg-secondary/30">
                    <div className="text-xl font-medium">${item.cpw.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground leading-tight">{item.item}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-serif font-medium flex items-center">
              <Sparkles className="w-5 h-5 mr-3 text-muted-foreground" /> Strategic Investments
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {mockShopping.recommended.map(item => (
              <div key={item.id} className="group flex flex-col sm:flex-row gap-6 bg-card border border-border/50 rounded-[2rem] p-4 transition-all hover:border-border hover:shadow-md duration-500">
                <div className="w-full sm:w-48 aspect-square sm:aspect-[3/4] rounded-2xl overflow-hidden bg-secondary relative shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-background/80 text-foreground backdrop-blur-md hover:bg-background/90 font-medium">
                      {item.match}% Match
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col justify-between py-2 space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">{item.brand}</h3>
                    <h4 className="text-xl font-medium tracking-tight mb-3">{item.name}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <Check className="w-4 h-4 inline-block mr-1 opacity-70" /> {item.reason}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-lg">${item.price}</span>
                    <Button variant="outline" className="rounded-full px-6 transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary">
                      Source
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6 pt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-serif font-medium">Wishlist</h2>
            <Button variant="link" className="text-muted-foreground">View all <ArrowRight className="w-4 h-4 ml-1" /></Button>
          </div>
          
          <ScrollArea className="w-full whitespace-nowrap pb-6">
            <div className="flex w-max space-x-6">
              {mockShopping.wishlist.map((item) => (
                <div key={item.id} className="w-64 group cursor-pointer space-y-4">
                  <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-secondary relative">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <button className="absolute top-3 right-3 p-2 rounded-full bg-background/50 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background/80">
                      <Heart className="w-4 h-4 fill-foreground" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{item.brand}</span>
                      <span className="font-serif text-muted-foreground">${item.price}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{item.name}</div>
                  </div>
                </div>
              ))}
              <div className="w-64 aspect-[3/4] rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:bg-secondary/20 hover:text-foreground transition-colors cursor-pointer">
                <ShoppingBag className="w-6 h-6 mb-3" />
                <span className="text-sm font-medium tracking-wide">Add Item</span>
              </div>
            </div>
            <ScrollBar orientation="horizontal" className="invisible hover:visible" />
          </ScrollArea>
        </section>
      </div>
    </AppShell>
  );
}
