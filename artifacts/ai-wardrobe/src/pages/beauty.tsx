import { AppShell } from "@/components/layout/AppShell";
import { mockBeauty } from "@/lib/mock-beauty";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Sparkles, MapPin } from "lucide-react";

export default function Beauty() {
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-12">
        <header className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight">Vanity</h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Your curated collection of care rituals, cosmetics, and upcoming maintenance. Integrated seamlessly with your overall presentation.
          </p>
        </header>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-medium text-muted-foreground tracking-wide uppercase flex items-center">
              <CalendarIcon className="w-4 h-4 mr-2" /> Appointments
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockBeauty.appointments.map(apt => (
              <Card key={apt.id} className="border-border/50 shadow-sm bg-card hover:border-border transition-colors">
                <CardContent className="p-6 flex justify-between items-center">
                  <div className="space-y-1">
                    <h4 className="font-medium text-lg">{apt.title}</h4>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3 mr-1" /> {apt.location}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium bg-secondary/50 text-secondary-foreground px-3 py-1 rounded-full">
                      {apt.date}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-6 pt-4">
          <h2 className="text-sm font-medium text-muted-foreground tracking-wide uppercase flex items-center">
            <Sparkles className="w-4 h-4 mr-2" /> The Collection
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {mockBeauty.categories.map(category => (
              <div 
                key={category.id} 
                className="group relative p-8 rounded-3xl border border-border/40 bg-card/40 backdrop-blur-sm hover:bg-secondary/20 transition-all duration-500 cursor-pointer overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity duration-500 transform translate-x-4 -translate-y-4">
                  <Sparkles className="w-24 h-24 stroke-[0.5]" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between space-y-8">
                  <div>
                    <Badge variant="outline" className="mb-4 bg-background/50 backdrop-blur-md">
                      {category.count} Items
                    </Badge>
                    <h3 className="text-2xl font-serif font-medium tracking-tight mb-2 group-hover:text-primary transition-colors">
                      {category.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                  <div className="text-sm font-medium flex items-center text-muted-foreground group-hover:text-foreground transition-colors">
                    Manage Collection <span className="ml-2 group-hover:translate-x-1 transition-transform">&rarr;</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
