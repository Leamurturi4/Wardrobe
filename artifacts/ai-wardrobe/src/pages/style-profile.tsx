import { AppShell } from "@/components/layout/AppShell";
import { useStyleProfile } from "@/lib/wardrobe-api";
import { DataStatus } from "@/components/DataStatus";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Sparkles, Target } from "lucide-react";

export default function StyleProfile() {
  const query = useStyleProfile();
  const profile = query.data;
  if (!profile) return <AppShell><DataStatus pending={query.isPending} error={query.error} /></AppShell>;
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <header className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight">Style DNA</h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Your saved aesthetic, color, and brand preferences.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-none shadow-sm bg-card/40 backdrop-blur-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium flex items-center text-muted-foreground tracking-wide uppercase">
                <Brain className="w-4 h-4 mr-2" /> AI Confidence Map
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Algorithm Confidence</span>
                  <span className="text-muted-foreground">{profile.confidence === null ? "Not analyzed" : `${Math.round(profile.confidence * 100)}%`}</span>
                </div>
                <Progress value={profile.confidence === null ? 0 : profile.confidence * 100} className="h-1" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Learning Progress</span>
                  <span className="text-muted-foreground">{profile.learning.status}</span>
                </div>
                <Progress value={0} className="h-1" />
                <p className="text-xs text-muted-foreground pt-2 leading-relaxed">
                  Learning is not enabled yet. These preferences are saved without AI analysis.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase flex items-center">
                <Sparkles className="w-4 h-4 mr-2" /> Core Aesthetics
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.aestheticTags.map(a => (
                  <Badge key={a} variant="secondary" className="px-4 py-1.5 text-sm font-medium rounded-full bg-secondary/50 hover:bg-secondary transition-colors">
                    {a}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase flex items-center">
                <Target className="w-4 h-4 mr-2" /> Atelier Preferences
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.preferredBrands.map(b => (
                  <Badge key={b} variant="outline" className="px-4 py-1.5 text-sm font-medium rounded-full border-border/50 hover:border-border transition-colors">
                    {b}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-4">
          <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase">Palette Architecture</h3>
          <div className="flex flex-wrap gap-4">
            {profile.preferredColors.map((color, i) => (
              <div key={i} className="group relative">
                <div 
                  className="w-16 h-16 rounded-full shadow-sm border border-border/50 transition-transform group-hover:scale-105 duration-300"
                  style={{ backgroundColor: color }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6 pt-8">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase">Inspiration Matrix</h3>
            <span className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">View full board &rarr;</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {profile.recentInspirations.map((item) => (
              <div key={item.id} className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-secondary/20">
                <img 
                  src={item.image} 
                  alt={item.source}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Badge variant="secondary" className="bg-white/20 text-white backdrop-blur-md border-white/10 hover:bg-white/30">
                    {item.source}
                  </Badge>
                </div>
              </div>
            ))}
            <div className="aspect-[3/4] rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:bg-secondary/20 hover:text-foreground transition-colors cursor-pointer">
              <span className="text-2xl font-light mb-2">+</span>
              <span className="text-sm font-medium tracking-wide">Add Reference</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
