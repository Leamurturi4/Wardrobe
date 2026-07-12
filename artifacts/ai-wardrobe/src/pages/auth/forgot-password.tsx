import { useState } from "react";
import { Link } from "wouter";
import { Sparkles, ArrowLeft, Mail } from "lucide-react";
import { motion } from "framer-motion";

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSent(true);
    }, 1000);
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background selection:bg-primary/20 px-6 relative">
      <Link href="/" className="absolute top-8 left-8 sm:left-12 flex items-center gap-2 outline-none">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-serif font-medium text-xl tracking-tight hidden sm:block">AI Wardrobe</span>
      </Link>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border shadow-xl rounded-[2rem] p-8 sm:p-12 relative overflow-hidden">
          {/* Subtle gradient background element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[60px] pointer-events-none -translate-y-1/2 translate-x-1/2" />

          {isSent ? (
            <div className="text-center relative z-10">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-serif font-medium mb-3">Check your email</h1>
              <p className="text-muted-foreground mb-8 text-balance">
                We've sent password reset instructions to your email address.
              </p>
              <Link href="/login" className="h-12 w-full bg-primary text-primary-foreground flex items-center justify-center rounded-xl font-medium hover:bg-primary/90 transition-all active:scale-[0.98]">
                Return to login
              </Link>
            </div>
          ) : (
            <div className="relative z-10">
              <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
                <ArrowLeft className="w-4 h-4" /> Back to login
              </Link>

              <h1 className="text-3xl font-serif font-medium mb-3">Reset password</h1>
              <p className="text-muted-foreground mb-8">Enter your email address and we'll send you a link to reset your password.</p>

              <form onSubmit={handleSubmit} className="space-y-6">
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

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}