import { AppShell } from "@/components/layout/AppShell";
import { mockEvents } from "@/lib/mock-calendar";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useState } from "react";
import { format } from "date-fns";
import { CalendarDays, MapPin, Sparkles, AlertCircle, WashingMachine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const typeConfig: Record<string, { icon: React.ElementType, color: string, label: string }> = {
  outfit: { icon: Sparkles, color: "text-blue-500 bg-blue-500/10", label: "Outfit Plan" },
  chore: { icon: WashingMachine, color: "text-amber-500 bg-amber-500/10", label: "Maintenance" },
  travel: { icon: MapPin, color: "text-emerald-500 bg-emerald-500/10", label: "Travel" },
  event: { icon: AlertCircle, color: "text-purple-500 bg-purple-500/10", label: "Event" }
};

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const eventsForSelectedDate = mockEvents.filter(
    e => date && e.date.toDateString() === date.toDateString()
  );

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-12">
        <header className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight">Timeline</h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Your sartorial schedule. Plan outfits for upcoming events, schedule maintenance, and prepare travel capsules.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-5 xl:col-span-4">
            <Card className="border-border/50 shadow-sm bg-card/40 backdrop-blur-sm overflow-hidden p-2">
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={setDate}
                className="w-full"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4 w-full",
                  caption: "flex justify-center pt-2 relative items-center mb-4",
                  caption_label: "text-sm font-medium tracking-wide uppercase",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 transition-opacity",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex w-full",
                  head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] w-full text-center uppercase tracking-widest",
                  row: "flex w-full mt-2",
                  cell: "text-center text-sm relative p-0 w-full hover:bg-secondary/50 rounded-full cursor-pointer focus-within:relative focus-within:z-20 h-9 flex items-center justify-center",
                  day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 flex items-center justify-center rounded-full transition-colors",
                  day_selected: "bg-foreground text-background hover:bg-foreground hover:text-background focus:bg-foreground focus:text-background",
                  day_today: "bg-secondary text-foreground",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_hidden: "invisible",
                }}
                modifiers={{
                  hasEvent: mockEvents.map(e => e.date)
                }}
                modifiersStyles={{
                  hasEvent: { fontWeight: '600', position: 'relative' }
                }}
              />
            </Card>
          </div>

          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-xl font-medium tracking-tight">
                {date ? format(date, "EEEE, MMMM d") : "Select a date"}
              </h2>
              <Badge variant="outline" className="rounded-full bg-secondary/20">
                {eventsForSelectedDate.length} Scheduled
              </Badge>
            </div>

            <div className="space-y-4 min-h-[400px]">
              {eventsForSelectedDate.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 py-20">
                  <CalendarDays className="w-12 h-12 opacity-20" />
                  <p>No events or plans scheduled for this day.</p>
                </div>
              ) : (
                eventsForSelectedDate.map(event => {
                  const config = typeConfig[event.type] || typeConfig.event;
                  const Icon = config.icon;
                  return (
                    <div key={event.id} className="group p-5 rounded-2xl border border-border/50 bg-card hover:shadow-md hover:border-border transition-all flex items-start space-x-5">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <h4 className="text-lg font-medium tracking-tight group-hover:text-primary transition-colors">{event.title}</h4>
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{config.label}</span>
                        </div>
                        {event.note && <p className="text-sm text-muted-foreground leading-relaxed">{event.note}</p>}
                        
                        {event.type === 'outfit' && (
                          <div className="pt-4 flex items-center space-x-3 text-sm text-muted-foreground">
                            <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center border border-border">?</div>
                            <span>No outfit assigned yet.</span>
                            <span className="text-foreground underline decoration-border underline-offset-4 cursor-pointer hover:decoration-foreground transition-colors">Plan now</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
