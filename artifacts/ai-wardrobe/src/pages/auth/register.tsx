import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Sparkles, ArrowRight, Mail, Lock, User } from "lucide-react";
import { motion } from "framer-motion";

export default function Register() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setLocation("/dashboard");
    }, 1000);
  };

  return (
    <div className="min-h-[100dvh] flex bg-background selection:bg-primary/20">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 relative z-10">
        <Link href="/" className="absolute top-8 left-8 sm:left-16 lg:left-24 flex items-center gap-2 outline-none">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-serif font-medium text-xl tracking-tight">AI Wardrobe</span>
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md w-full mx-auto"
        >
          <div className="mb-10">
            <h1 className="text-3xl font-serif font-medium mb-3">Begin your journey.</h1>
            <p className="text-muted-foreground">Create an account to start curating your wardrobe.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text" 
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-input bg-transparent hover:border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                  placeholder="Emma Stone"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="email" 
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-input bg-transparent hover:border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="password" 
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-input bg-transparent hover:border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                  placeholder="Create a password"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-12 mt-4 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>Create Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account? <Link href="/login" className="text-foreground font-medium hover:underline">Sign in</Link>
          </p>
        </motion.div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block w-1/2 relative bg-secondary">
        <img 
          src="/hero.jpg" 
          alt="Elegant wardrobe" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/10" />
      </div>
    </div>
  );
}