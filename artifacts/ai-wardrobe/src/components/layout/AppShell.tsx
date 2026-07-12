import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Shirt, 
  Sparkles, 
  UserCircle, 
  ShoppingBag, 
  CalendarDays, 
  Users, 
  Wand2, 
  Settings,
  Menu,
  X,
  Moon,
  Sun
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/wardrobe", label: "Wardrobe", icon: Shirt },
  { href: "/outfits/generate", label: "Outfits", icon: Sparkles },
  { href: "/style-profile", label: "Style Profile", icon: UserCircle },
  { href: "/shopping-assistant", label: "Shopping Assistant", icon: ShoppingBag },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/beauty", label: "Beauty", icon: Wand2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="min-h-[100dvh] w-full flex bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-border bg-sidebar shrink-0 sticky top-0 h-[100dvh]">
        <div className="h-20 flex items-center px-8 border-b border-border/50">
          <Link href="/dashboard" className="flex items-center gap-3 outline-none">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-serif font-medium text-xl tracking-tight">AI Wardrobe</span>
          </Link>
        </div>
        
        <nav className="flex-1 py-8 px-4 flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="outline-none">
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group cursor-pointer",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50 flex justify-between items-center">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border">
              <img src="https://ui-avatars.com/api/?name=Emma+Stone&background=random&color=fff" alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Emma</span>
              <span className="text-xs text-muted-foreground">Premium</span>
            </div>
          </div>
          
          {mounted && (
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Topbar & Nav */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 glass z-50 flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2 outline-none">
          <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-serif font-medium text-lg tracking-tight">AI Wardrobe</span>
        </Link>
        
        <div className="flex items-center gap-2">
          {mounted && (
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-secondary/50 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          )}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-full bg-secondary/50 text-foreground"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-xl pt-20 pb-4 px-4 overflow-y-auto"
          >
            <nav className="flex flex-col gap-2">
              {NAV_ITEMS.map((item) => {
                const isActive = location === item.href || location.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={closeMenu} className="outline-none">
                    <div
                      className={cn(
                        "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary/40 text-foreground"
                      )}
                    >
                      <Icon className={cn("w-6 h-6", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                      <span className="font-medium text-lg">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 relative lg:pt-0 pt-16">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}