import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  CloudSun, 
  Sparkles, 
  Shirt, 
  Heart, 
  Clock, 
  Plus,
  ArrowRight,
  MapPin
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

const STATS = [
  { label: "Total Items", value: "124", icon: Shirt },
  { label: "Saved Outfits", value: "32", icon: Heart },
  { label: "Worn This Month", value: "45", icon: Clock },
];

const RECENT_ACTIVITY = [
  { id: 1, type: "outfit", title: "Weekend Brunch Outfit", time: "2 hours ago", img: "/outfit-1.jpg" },
  { id: 2, type: "item", title: "Added Navy Linen Blazer", time: "Yesterday", img: "/outfit-2.jpg" },
  { id: 3, type: "item", title: "Added White Silk Blouse", time: "Yesterday", img: "/hero.jpg" },
];

export default function Dashboard() {
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-serif font-medium mb-2">Good morning, Emma.</h1>
            <p className="text-muted-foreground">Your wardrobe is looking elegant today.</p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center gap-3 bg-secondary/50 px-4 py-2.5 rounded-2xl border border-border"
          >
            <div className="flex items-center gap-2 text-primary">
              <MapPin className="w-4 h-4" />
              <span className="font-medium text-sm">New York</span>
            </div>
            <div className="w-[1px] h-4 bg-border mx-1" />
            <div className="flex items-center gap-2">
              <CloudSun className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">72°</span>
            </div>
            <div className="w-[1px] h-4 bg-border mx-1" />
            <span className="text-sm text-muted-foreground">Sunny</span>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <Link href="/outfits/generate">
            <div className="h-full bg-primary text-primary-foreground p-6 rounded-[2rem] hover:bg-primary/90 transition-all cursor-pointer group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/2" />
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-4 text-primary-foreground backdrop-blur-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-medium text-lg mb-1">Generate Outfit</h3>
              <p className="text-primary-foreground/70 text-sm">AI styled for today</p>
              <div className="absolute bottom-6 right-6 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </Link>
          
          <Link href="/wardrobe/add">
            <div className="h-full bg-card border border-border p-6 rounded-[2rem] hover:border-primary/50 transition-all cursor-pointer group shadow-sm">
              <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center mb-4 text-foreground">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="font-medium text-lg mb-1">Add Clothing</h3>
              <p className="text-muted-foreground text-sm">Digitize new pieces</p>
              <div className="absolute bottom-6 right-6 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-muted-foreground">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </Link>

          <Link href="/wardrobe">
            <div className="h-full bg-card border border-border p-6 rounded-[2rem] hover:border-primary/50 transition-all cursor-pointer group shadow-sm">
              <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center mb-4 text-foreground">
                <Shirt className="w-5 h-5" />
              </div>
              <h3 className="font-medium text-lg mb-1">Browse Wardrobe</h3>
              <p className="text-muted-foreground text-sm">View your collection</p>
              <div className="absolute bottom-6 right-6 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-muted-foreground">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </Link>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Today's Pick */}
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-serif font-medium">Today's Pick</h2>
                <button className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Re-generate
                </button>
              </div>
              <div className="bg-card border border-border rounded-[2rem] p-4 flex flex-col md:flex-row gap-6 shadow-sm">
                <div className="w-full md:w-1/2 aspect-square rounded-[1.5rem] overflow-hidden relative">
                  <img src="/outfit-1.jpg" alt="Today's outfit" className="w-full h-full object-cover" />
                  <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium border border-border shadow-sm">
                    Office Day
                  </div>
                </div>
                <div className="w-full md:w-1/2 flex flex-col py-2 pr-2">
                  <h3 className="text-lg font-medium mb-2">Modern Minimalist</h3>
                  <p className="text-muted-foreground text-sm mb-6 flex-1">
                    Perfectly suited for today's weather in New York. The breathable linen keeps you cool, while the tailored silhouette maintains a professional edge.
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden shrink-0">
                         <img src="/outfit-1.jpg" alt="item" className="w-full h-full object-cover opacity-50" />
                      </div>
                      <span className="font-medium">Beige Linen Blazer</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden shrink-0">
                         <img src="/hero.jpg" alt="item" className="w-full h-full object-cover opacity-50" />
                      </div>
                      <span className="font-medium">White Silk Camisole</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden shrink-0">
                         <img src="/outfit-2.jpg" alt="item" className="w-full h-full object-cover opacity-50" />
                      </div>
                      <span className="font-medium">Tailored Trousers</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 h-10 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-all">
                      Wear Today
                    </button>
                    <button className="w-10 h-10 bg-secondary text-foreground rounded-xl flex items-center justify-center hover:bg-secondary/80 transition-all">
                      <Heart className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.section>
            
            {/* Stats */}
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="grid grid-cols-3 gap-4"
            >
              {STATS.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="bg-secondary/30 rounded-[1.5rem] p-5 border border-border/50">
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center mb-3 text-muted-foreground shadow-sm">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="text-2xl font-serif font-medium mb-1">{stat.value}</div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</div>
                  </div>
                );
              })}
            </motion.section>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">
            {/* Recent Activity */}
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-serif font-medium">Recent Activity</h2>
                <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">View all</button>
              </div>
              <div className="bg-card border border-border rounded-[2rem] p-6 shadow-sm">
                <div className="space-y-6">
                  {RECENT_ACTIVITY.map((activity, i) => (
                    <div key={activity.id} className="flex gap-4 relative group cursor-pointer">
                      {i !== RECENT_ACTIVITY.length - 1 && (
                        <div className="absolute left-6 top-14 bottom-[-1.5rem] w-[1px] bg-border group-hover:bg-primary/20 transition-colors" />
                      )}
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-border">
                        <img src={activity.img} alt={activity.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="pt-1">
                        <h4 className="text-sm font-medium leading-tight group-hover:text-primary transition-colors">{activity.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>
            
            {/* Style Insight */}
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="bg-primary/5 border border-primary/10 rounded-[2rem] p-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="flex items-center gap-2 mb-3 text-primary">
                <Sparkles className="w-4 h-4" />
                <span className="font-medium text-sm">Style Insight</span>
              </div>
              <p className="text-sm leading-relaxed mb-4">
                You've worn your <span className="font-medium">Navy Linen Blazer</span> 3 times this month. Consider pairing it with your new white silk blouse for a fresh look.
              </p>
              <button className="text-sm font-medium text-primary hover:underline">View suggestion</button>
            </motion.section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}