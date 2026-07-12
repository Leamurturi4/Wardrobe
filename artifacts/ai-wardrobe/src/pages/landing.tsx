import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Wand2, Shirt, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function Landing() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground selection:bg-primary/20 flex flex-col relative overflow-hidden">
      {/* Background ambient elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-secondary/30 rounded-full blur-[150px] pointer-events-none" />

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 h-20 z-50 glass border-b-0 border-white/10 dark:border-white/5">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-serif font-medium text-2xl tracking-tight">AI Wardrobe</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 text-sm font-medium">
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
            </div>
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-border/50">
              {mounted && (
                <button 
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground mr-2"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              )}
              <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors hidden sm:block">Log In</Link>
              <Link href="/register" className="h-10 px-5 bg-primary text-primary-foreground flex items-center justify-center rounded-full text-sm font-medium hover:bg-primary/90 transition-all shadow-sm hover:shadow active:scale-95">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[70vh]">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-xl"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium mb-8 border border-border/50">
                <Sparkles className="w-3.5 h-3.5" />
                <span>The future of personal styling</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-serif font-medium leading-[1.1] mb-6 text-balance">
                Your AI <br/>
                <span className="text-gradient">Personal Stylist</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-10 text-balance leading-relaxed">
                An elegant digital atelier that studies your real wardrobe and dresses you. Like a world-class stylist who has memorized your closet.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Link href="/register" className="w-full sm:w-auto h-14 px-8 bg-primary text-primary-foreground flex items-center justify-center gap-2 rounded-full text-base font-medium hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl active:scale-95">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
                <button className="w-full sm:w-auto h-14 px-8 bg-secondary/80 hover:bg-secondary text-foreground flex items-center justify-center gap-2 rounded-full text-base font-medium transition-all border border-border/50">
                  Watch Demo
                </button>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative aspect-[4/5] lg:aspect-square w-full max-w-lg mx-auto lg:ml-auto"
            >
              <div className="absolute inset-0 rounded-[2.5rem] bg-secondary/20 -rotate-3 scale-[0.98] origin-bottom-left transition-transform duration-500 hover:rotate-0" />
              <img 
                src="/hero.jpg" 
                alt="Minimalist wardrobe" 
                className="absolute inset-0 w-full h-full object-cover rounded-[2.5rem] shadow-2xl z-10 border border-white/10"
              />
              {/* Floating glass card */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.8 }}
                className="absolute -left-8 md:-left-16 top-1/4 glass-card p-4 flex items-center gap-4 z-20"
              >
                <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center shrink-0">
                  <Wand2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Perfect for tonight</p>
                  <p className="text-xs text-muted-foreground">Generated from your closet</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* How it works */}
        <section id="how-it-works" className="mt-32 pt-24 border-t border-border/50 bg-secondary/20">
          <div className="max-w-7xl mx-auto px-6 pb-24">
            <div className="text-center max-w-2xl mx-auto mb-20">
              <h2 className="text-3xl md:text-5xl font-serif font-medium mb-6">How it works</h2>
              <p className="text-muted-foreground text-lg">Effortless style in three simple steps. We handle the curation, you handle the confidence.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12 relative">
              <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-[1px] bg-gradient-to-r from-transparent via-border to-transparent" />
              
              <div className="relative text-center flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-background border border-border shadow-sm flex items-center justify-center mb-6 relative z-10 text-primary">
                  <Camera className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-medium mb-3">1. Upload your closet</h3>
                <p className="text-muted-foreground text-balance">Snap photos of your pieces. Our AI automatically removes backgrounds and categorizes everything instantly.</p>
              </div>

              <div className="relative text-center flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-background border border-border shadow-sm flex items-center justify-center mb-6 relative z-10 text-primary">
                  <Shirt className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-medium mb-3">2. AI understands</h3>
                <p className="text-muted-foreground text-balance">The system learns your personal style, preferred silhouettes, color palettes, and the weather in your city.</p>
              </div>

              <div className="relative text-center flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center mb-6 relative z-10">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-medium mb-3">3. Get dressed</h3>
                <p className="text-muted-foreground text-balance">Receive personalized daily outfit recommendations for any occasion, beautifully curated from what you already own.</p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Gallery/Features teaser */}
        <section className="py-24 max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="order-2 md:order-1 relative aspect-[3/4] w-full rounded-[2rem] overflow-hidden">
               <img src="/outfit-1.jpg" alt="Curated outfit" className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-8">
                 <div className="glass-card p-6 w-full text-white border-white/20">
                   <div className="flex items-center justify-between mb-2">
                     <span className="font-medium text-lg">Weekend Brunch</span>
                     <span className="text-sm opacity-80">72° Sunny</span>
                   </div>
                   <p className="text-sm opacity-90">Linen shirt, tailored trousers, leather loafers.</p>
                 </div>
               </div>
            </div>
            <div className="order-1 md:order-2 md:pl-12">
              <h2 className="text-3xl md:text-5xl font-serif font-medium mb-6">A curated eye for your everyday.</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Stop staring at a full closet feeling like you have nothing to wear. AI Wardrobe creates fresh combinations you never thought of, ensuring you get the most out of every piece you own.
              </p>
              <ul className="space-y-4">
                {['Smart packing lists for travel', 'Event-specific outfit generation', 'Purchase recommendations to fill gaps', 'Seasonal wardrobe rotation'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Sparkles className="w-3 h-3" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Pricing placeholder */}
        <section id="pricing" className="py-24 bg-foreground text-background">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-5xl font-serif font-medium mb-6">Elevate your style</h2>
            <p className="text-lg text-background/70 mb-16 max-w-2xl mx-auto">Start with our essentials or upgrade to premium for advanced AI styling and unlimited closet space.</p>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-background/5 rounded-[2rem] p-8 border border-white/10 text-left flex flex-col">
                <h3 className="text-2xl font-medium mb-2">Essential</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-serif">$0</span>
                  <span className="text-background/60">/ forever</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-background/80"><Sparkles className="w-4 h-4" /> Up to 50 items</li>
                  <li className="flex items-center gap-3 text-background/80"><Sparkles className="w-4 h-4" /> 3 daily outfit generations</li>
                  <li className="flex items-center gap-3 text-background/80"><Sparkles className="w-4 h-4" /> Basic categorization</li>
                </ul>
                <button className="w-full h-12 rounded-full border border-white/20 hover:bg-white/10 transition-colors font-medium">Get Started</button>
              </div>
              <div className="bg-background text-foreground rounded-[2rem] p-8 border border-border shadow-xl text-left flex flex-col relative">
                <div className="absolute top-0 right-8 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">Most Popular</div>
                <h3 className="text-2xl font-medium mb-2">Atelier</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-serif">$12</span>
                  <span className="text-muted-foreground">/ month</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3"><Sparkles className="w-4 h-4 text-primary" /> Unlimited items</li>
                  <li className="flex items-center gap-3"><Sparkles className="w-4 h-4 text-primary" /> Unlimited outfit generations</li>
                  <li className="flex items-center gap-3"><Sparkles className="w-4 h-4 text-primary" /> Advanced event styling</li>
                  <li className="flex items-center gap-3"><Sparkles className="w-4 h-4 text-primary" /> Smart shopping assistant</li>
                </ul>
                <button className="w-full h-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">Subscribe Now</button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-secondary/30 py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="font-serif font-medium">AI Wardrobe</span>
          </div>
          <div className="text-sm text-muted-foreground">
            © 2024 AI Wardrobe. Elegantly crafted.
          </div>
        </div>
      </footer>
    </div>
  );
}