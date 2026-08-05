import { useState } from "react";
import { Link, useLocation } from "wouter";
import { CalendarDays, Heart, Menu, Shirt, Sparkles, UserCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const NAV_ITEMS = [
  { href: "/outfits/generate", label: "Outfit Lab", icon: Sparkles },
  { href: "/wardrobe", label: "My Closet", icon: Shirt },
  { href: "/outfits/saved", label: "Favorites", icon: Heart },
  { href: "/calendar", label: "Planner", icon: CalendarDays },
  { href: "/style-profile", label: "Profile", icon: UserCircle },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-frame">
      <header className="app-topbar">
        <Link href="/" className="app-brand" aria-label="Closet dot exe home">
          <span className="brand-gem">C</span>
          <span><strong>closet</strong><small>.exe</small></span>
        </Link>

        <nav className="desktop-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = location === item.href || (item.href === "/outfits/generate" && location === "/");
            return <Link key={item.href} href={item.href} className={active ? "active" : ""}><Icon />{item.label}</Link>;
          })}
        </nav>

        <div className="topbar-meta"><span>Closet synced</span><i /></div>
        <button className="mobile-menu-button" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle navigation">
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav className="mobile-nav" aria-label="Mobile navigation" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}><Icon />{item.label}</Link>;
            })}
          </motion.nav>
        )}
      </AnimatePresence>

      <main className="app-content">{children}</main>
    </div>
  );
}
