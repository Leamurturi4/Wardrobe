import { AppShell } from "@/components/layout/AppShell";
import { UploadCloud, Image as ImageIcon, Sparkles, Check, ChevronLeft, ArrowRight, Loader2 } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

import { useWardrobeItem, useClosetMutation } from "@/lib/wardrobe-api";
import { customFetch } from "@workspace/api-client-react";
import { wardrobeInputSchema } from "@workspace/api-zod";
import { DataStatus } from "@/components/DataStatus";

type Step = "upload" | "processing" | "review";

export default function AddWardrobeItem() {
  const { id } = useParams();
  const existing = useWardrobeItem(id);
  const mutation = useClosetMutation();
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("upload");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "Tops",
    color: "",
    brand: "",
    material: "",
    season: [] as string[],
    occasion: [] as string[]
  });

  // Handle drag and drop
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (existing.data) {
      const i = existing.data;
      setFormData({ name: i.name, category: i.category, color: i.primaryColor, brand: i.brand, material: i.material, season: i.seasons, occasion: i.occasions });
      setImageUrl(i.originalImage); setStep("review");
    }
  }, [existing.data]);
  const handleUpload = async (file?: File) => {
    if (!file) return;
    setError(null); setStep("processing");
    try {
      const result = await customFetch<{ url: string }>("/api/images", { method: "POST", headers: { "Content-Type": file.type }, body: file });
      setImageUrl(result.url); setStep("review");
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); setStep("upload"); }
  };
  const handleSave = () => {
    setError(null);
    const fields = { name: formData.name, category: formData.category, primaryColor: formData.color, brand: formData.brand, material: formData.material,
      seasons: formData.season, occasions: formData.occasion, originalImage: imageUrl };
    const parsed = wardrobeInputSchema.safeParse(fields);
    if (!parsed.success) { setError(parsed.error.issues.map(i => i.path.join('.') + ': ' + i.message).join('; ')); return; }
    mutation.mutate({ path: id ? 'wardrobe/' + id : 'wardrobe', method: id ? 'PATCH' : 'POST', body: id ? fields : parsed.data },
      { onSuccess: () => setLocation(id ? '/wardrobe/' + id : '/wardrobe') });
  };
  if (id && !existing.data) return <AppShell><DataStatus pending={existing.isPending} error={existing.error} /></AppShell>;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center gap-4">
          <Link href="/wardrobe" className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-serif font-medium tracking-tight">{id ? "Edit Wardrobe Item" : "Add to Wardrobe"}</h1>
            <p className="text-muted-foreground text-sm">Upload a photo and enter your clothing details.</p>
          </div>
        </div>

        {error && <p role="alert">{error}</p>}
        {/* Progress steps */}
        <div className="flex items-center justify-between mb-8 max-w-2xl mx-auto relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-secondary -z-10" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-foreground transition-all duration-500 -z-10" 
            style={{ width: step === "upload" ? "0%" : step === "processing" ? "50%" : "100%" }} 
          />
          
          {[
            { id: "upload", label: "Upload Image", icon: ImageIcon },
            { id: "processing", label: "Store Image", icon: Sparkles },
            { id: "review", label: "Review & Save", icon: Check }
          ].map((s, i) => {
            const isActive = step === s.id;
            const isPast = ["upload", "processing", "review"].indexOf(step) > i;
            const Icon = s.icon;
            
            return (
              <div key={s.id} className="flex flex-col items-center gap-2 bg-background px-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                  isActive ? "border-foreground bg-foreground text-background" : 
                  isPast ? "border-foreground bg-background text-foreground" : 
                  "border-border bg-background text-muted-foreground"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={cn(
                  "text-xs font-medium transition-colors duration-500",
                  isActive || isPast ? "text-foreground" : "text-muted-foreground"
                )}>{s.label}</span>
              </div>
            );
          })}
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 md:p-10 shadow-sm">
          {step === "upload" && (
            <div 
              className={cn(
                "border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-all duration-300",
                isDragging ? "border-foreground bg-secondary/50" : "border-border hover:border-foreground/30 hover:bg-secondary/20"
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); void handleUpload(e.dataTransfer.files[0]); }}
            >
              <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6">
                <UploadCloud className="w-8 h-8 text-foreground" />
              </div>
              <h3 className="text-xl font-serif font-medium mb-2">Drag and drop your image</h3>
              <p className="text-muted-foreground mb-8 max-w-md">Upload a clear photo of the clothing item. Flat lays or clean background photos work best for a clear wardrobe photo. Maximum 5 MB.</p>
              
              <div className="flex gap-4">
                <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { void handleUpload(e.target.files?.[0]); }} />
                <button onClick={() => fileInput.current?.click()} className="px-6 py-3 rounded-full bg-foreground text-background font-medium hover:bg-foreground/90 transition-all flex items-center gap-2 shadow-sm">
                  <ImageIcon className="w-4 h-4" /> Browse Files
                </button>
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="relative mb-8">
                <div className="w-24 h-24 rounded-2xl overflow-hidden opacity-50 relative">
                  <img src={imageUrl!} alt="Uploading" className="w-full h-full object-cover grayscale" />
                </div>
                
                {/* AI Scanning animation overlay */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                  <div className="w-full h-1 bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)] animate-[scan_2s_ease-in-out_infinite]" />
                </div>
                
                <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-background rounded-full flex items-center justify-center border border-border shadow-sm">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                </div>
              </div>
              
              <h3 className="text-2xl font-serif font-medium mb-3">Storing your image...</h3>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p>Preparing your photo for manual review.</p>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in duration-700">
              {/* Image Preview */}
              <div className="space-y-4">
                <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-secondary relative border border-border">
                  <img src={imageUrl!} alt="Detected item" className="w-full h-full object-cover" />
                  <div className="absolute top-4 right-4 px-3 py-1.5 bg-background/80 backdrop-blur-md rounded-full text-xs font-medium border border-white/20 flex items-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> Manual entry
                  </div>
                </div>
                <button onClick={() => setStep("upload")} className="w-full py-3 rounded-xl border border-border hover:bg-secondary transition-colors text-sm font-medium">
                  Replace Image
                </button>
              </div>

              {/* Editable Form */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-serif font-medium mb-1">Review Details</h3>
                  <p className="text-muted-foreground text-sm">Enter the details you want to keep in your closet.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Item Name</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-secondary/50 border border-transparent focus:border-border focus:bg-background rounded-xl px-4 py-3 text-base font-medium transition-all outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</label>
                      <select 
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                        className="w-full bg-secondary/50 border border-transparent focus:border-border focus:bg-background rounded-xl px-4 py-3 text-sm transition-all outline-none appearance-none"
                      >
                        <option>Tops</option>
                        <option>Bottoms</option>
                        <option>Outerwear</option>
                        <option>Shoes</option>
                        <option>Accessories</option><option>Dresses</option><option>Bags</option><option>Jewelry</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Color</label>
                      <input 
                        type="text" 
                        value={formData.color}
                        onChange={e => setFormData({...formData, color: e.target.value})}
                        className="w-full bg-secondary/50 border border-transparent focus:border-border focus:bg-background rounded-xl px-4 py-3 text-sm transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Brand</label>
                      <input 
                        type="text" 
                        value={formData.brand}
                        onChange={e => setFormData({...formData, brand: e.target.value})}
                        className="w-full bg-secondary/50 border border-transparent focus:border-border focus:bg-background rounded-xl px-4 py-3 text-sm transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Material</label>
                      <input 
                        type="text" 
                        value={formData.material}
                        onChange={e => setFormData({...formData, material: e.target.value})}
                        className="w-full bg-secondary/50 border border-transparent focus:border-border focus:bg-background rounded-xl px-4 py-3 text-sm transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Seasons</label>
                    <div className="flex flex-wrap gap-2">
                      {["Spring", "Summer", "Autumn", "Winter"].map(s => (
                        <button 
                          key={s}
                          onClick={() => {
                            const newSeasons = formData.season.includes(s) 
                              ? formData.season.filter(x => x !== s)
                              : [...formData.season, s];
                            setFormData({...formData, season: newSeasons});
                          }}
                          className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium transition-all border",
                            formData.season.includes(s)
                              ? "bg-foreground text-background border-foreground"
                              : "bg-transparent border-border text-foreground hover:border-muted-foreground"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-border flex justify-end gap-3">
                  <button 
                    onClick={() => setStep("upload")}
                    className="px-6 py-3 rounded-full font-medium hover:bg-secondary transition-all"
                  >
                    Start Over
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={mutation.isPending}
                    className="px-8 py-3 rounded-full bg-foreground text-background font-medium hover:bg-foreground/90 transition-all flex items-center gap-2 shadow-sm"
                  >
                    Save to Wardrobe <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Required for the scanning animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(-10px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(300px); opacity: 0; }
        }
      `}} />
    </AppShell>
  );
}