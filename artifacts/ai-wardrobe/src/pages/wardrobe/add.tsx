import { AppShell } from "@/components/layout/AppShell";
import {
  UploadCloud,
  Image as ImageIcon,
  Sparkles,
  Check,
  ChevronLeft,
  ArrowRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useWardrobeItem, useClosetMutation } from "@/lib/wardrobe-api";
import { customFetch } from "@workspace/api-client-react";
import {
  AI_ANALYSIS_VERSION,
  analysisToWardrobeInput,
  canonicalColors,
  categories,
  categorySubcategories,
  clothingAnalysisResultSchema,
  findUserCorrectedFields,
  fits,
  formalities,
  garmentLengths,
  layeringRoles,
  necklines,
  occasionValues,
  patterns,
  rises,
  seasons,
  signalLevels,
  silhouettes,
  sleeveLengths,
  styleDirections,
  textures,
  wardrobeInputSchema,
  weatherValues,
  type ClothingAnalysisResult,
} from "@workspace/api-zod";
import { DataStatus } from "@/components/DataStatus";

type Step = "upload" | "processing" | "review";
type FormState = {
  name: string;
  category: string;
  subcategory: string;
  primaryColor: string;
  secondaryColors: string[];
  brand: string;
  material: string;
  materialCandidates: string[];
  pattern: string;
  texture: string;
  fit: string;
  silhouette: string;
  length: string;
  neckline: string;
  sleeveLength: string;
  rise: string;
  layeringRole: string;
  styleTags: string[];
  aestheticTags: string[];
  formality: string;
  seasons: string[];
  occasions: string[];
  weatherSuitability: string[];
  statementLevel: string;
  visualWeight: string;
  structureLevel: string;
  versatility: string;
  dominantStyleDirection: string;
};
const emptyForm: FormState = {
  name: "",
  category: "Tops",
  subcategory: "",
  primaryColor: "",
  secondaryColors: [],
  brand: "",
  material: "",
  materialCandidates: [],
  pattern: "",
  texture: "",
  fit: "",
  silhouette: "",
  length: "",
  neckline: "",
  sleeveLength: "",
  rise: "",
  layeringRole: "",
  styleTags: [],
  aestheticTags: [],
  formality: "",
  seasons: [],
  occasions: [],
  weatherSuitability: [],
  statementLevel: "",
  visualWeight: "",
  structureLevel: "",
  versatility: "",
  dominantStyleDirection: "",
};
const list = (value: string) => [
  ...new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  ),
];
const nullable = (value: string) => value || null;
const inputClass =
  "w-full bg-secondary/50 border border-transparent focus:border-border focus:bg-background rounded-xl px-4 py-3 text-sm transition-all outline-none";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}
function SelectField({
  label,
  value,
  values,
  onChange,
  optional = true,
}: {
  label: string;
  value: string;
  values: readonly string[];
  onChange(value: string): void;
  optional?: boolean;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      >
        {optional && <option value="">Unknown</option>}
        {values.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}

export default function AddWardrobeItem() {
  const { id } = useParams();
  const existing = useWardrobeItem(id);
  const mutation = useClosetMutation();
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("upload");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ClothingAnalysisResult | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!existing.data) return;
    const item = existing.data;
    setFormData({
      name: item.name,
      category: item.category,
      subcategory: item.subcategory,
      primaryColor: item.primaryColor,
      secondaryColors: item.secondaryColors,
      brand: item.brand,
      material: item.material,
      materialCandidates: item.materialCandidates,
      pattern: item.pattern,
      texture: item.texture || "",
      fit: item.fit,
      silhouette: item.silhouette || "",
      length: item.length || "",
      neckline: item.neckline || "",
      sleeveLength: item.sleeveLength || "",
      rise: item.rise || "",
      layeringRole: item.layeringRole || "",
      styleTags: item.styleTags,
      aestheticTags: item.aestheticTags,
      formality: item.formality || "",
      seasons: item.seasons,
      occasions: item.occasions,
      weatherSuitability: item.weatherSuitability,
      statementLevel: item.statementLevel || "",
      visualWeight: item.visualWeight || "",
      structureLevel: item.structureLevel || "",
      versatility: item.versatility || "",
      dominantStyleDirection: item.dominantStyleDirection || "",
    });
    setImageUrl(item.originalImage);
    setStep("review");
  }, [existing.data]);

  const applyAnalysis = (result: ClothingAnalysisResult) => {
    const suggestion = wardrobeInputSchema.parse(
      analysisToWardrobeInput(result, "/uploads/analysis.jpg"),
    );
    setFormData((current) => ({
      ...current,
      name: suggestion.name,
      category: suggestion.category,
      subcategory: suggestion.subcategory,
      primaryColor: suggestion.primaryColor,
      secondaryColors: suggestion.secondaryColors,
      material: suggestion.material,
      materialCandidates: suggestion.materialCandidates,
      pattern: suggestion.pattern,
      texture: suggestion.texture || "",
      fit: suggestion.fit,
      silhouette: suggestion.silhouette || "",
      length: suggestion.length || "",
      neckline: suggestion.neckline || "",
      sleeveLength: suggestion.sleeveLength || "",
      rise: suggestion.rise || "",
      layeringRole: suggestion.layeringRole || "",
      styleTags: suggestion.styleTags,
      aestheticTags: suggestion.aestheticTags,
      formality: suggestion.formality || "",
      seasons: suggestion.seasons,
      occasions: suggestion.occasions,
      weatherSuitability: suggestion.weatherSuitability,
      statementLevel: suggestion.statementLevel || "",
      visualWeight: suggestion.visualWeight || "",
      structureLevel: suggestion.structureLevel || "",
      versatility: suggestion.versatility || "",
      dominantStyleDirection: suggestion.dominantStyleDirection || "",
    }));
  };
  const analyzeImage = async (storedUrl: string, clearPrevious: boolean) => {
    setError(null);
    setStep("processing");
    if (clearPrevious) setAnalysis(null);
    try {
      const result = clothingAnalysisResultSchema.parse(
        await customFetch("/api/wardrobe/analyze-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: storedUrl }),
        }),
      );
      setAnalysis(result);
      applyAnalysis(result);
    } catch (cause) {
      setError(
        `${cause instanceof Error ? cause.message : "AI analysis failed"} Your photo and current details are preserved; you can continue manually.`,
      );
    } finally {
      setStep("review");
    }
  };
  const handleUpload = async (file?: File) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Choose a PNG, JPEG or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }
    setError(null);
    setStep("processing");
    try {
      const result = await customFetch<{ url: string }>("/api/images", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      setImageUrl(result.url);
      await analyzeImage(result.url, true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed");
      setStep(imageUrl ? "review" : "upload");
    }
  };
  const reviewedFields = () => ({
    ...formData,
    texture: nullable(formData.texture),
    silhouette: nullable(formData.silhouette),
    length: nullable(formData.length),
    neckline: nullable(formData.neckline),
    sleeveLength: nullable(formData.sleeveLength),
    rise: nullable(formData.rise),
    layeringRole: nullable(formData.layeringRole),
    formality: nullable(formData.formality),
    statementLevel: nullable(formData.statementLevel),
    visualWeight: nullable(formData.visualWeight),
    structureLevel: nullable(formData.structureLevel),
    versatility: nullable(formData.versatility),
    dominantStyleDirection: nullable(formData.dominantStyleDirection),
  });
  const handleSave = () => {
    setError(null);
    const reviewed = reviewedFields();
    const fields = {
      ...reviewed,
      originalImage: imageUrl,
      ...(analysis
        ? {
            aiConfidence: analysis.confidence,
            aiAnalysisVersion: AI_ANALYSIS_VERSION,
            aiGeneratedTags: analysis.styleTags,
            userCorrectedFields: findUserCorrectedFields(analysis, reviewed),
          }
        : {}),
    };
    const parsed = wardrobeInputSchema.safeParse(fields);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      );
      return;
    }
    mutation.mutate(
      {
        path: id ? `wardrobe/${id}` : "wardrobe",
        method: id ? "PATCH" : "POST",
        body: id ? fields : parsed.data,
      },
      { onSuccess: () => setLocation(id ? `/wardrobe/${id}` : "/wardrobe") },
    );
  };
  if (id && !existing.data)
    return (
      <AppShell>
        <DataStatus pending={existing.isPending} error={existing.error} />
      </AppShell>
    );

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setFormData((current) => ({ ...current, [field]: value }));
  const textField = (label: string, field: keyof FormState) => (
    <Field label={label}>
      <input
        value={String(formData[field])}
        onChange={(event) => update(field, event.target.value as never)}
        className={inputClass}
      />
    </Field>
  );
  const listField = (label: string, field: keyof FormState) => (
    <Field label={label}>
      <input
        value={(formData[field] as string[]).join(", ")}
        onChange={(event) => update(field, list(event.target.value) as never)}
        placeholder="Comma-separated"
        className={inputClass}
      />
    </Field>
  );

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center gap-4">
          <Link
            href="/wardrobe"
            className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-serif font-medium tracking-tight">
              {id ? "Edit Wardrobe Item" : "Add to Wardrobe"}
            </h1>
            <p className="text-muted-foreground text-sm">
              Upload a photo, review the suggested details, and save when they
              are right.
            </p>
          </div>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm"
          >
            {error}
          </p>
        )}
        <div className="flex items-center justify-between mb-8 max-w-2xl mx-auto relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-secondary -z-10" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-foreground transition-all duration-500 -z-10"
            style={{
              width:
                step === "upload"
                  ? "0%"
                  : step === "processing"
                    ? "50%"
                    : "100%",
            }}
          />
          {[
            { id: "upload", label: "Upload Image", icon: ImageIcon },
            { id: "processing", label: "Analyze Item", icon: Sparkles },
            { id: "review", label: "Review & Save", icon: Check },
          ].map((item, index) => {
            const active = step === item.id;
            const past =
              ["upload", "processing", "review"].indexOf(step) > index;
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="flex flex-col items-center gap-2 bg-background px-4"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : past
                        ? "border-foreground bg-background text-foreground"
                        : "border-border bg-background text-muted-foreground",
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    active || past
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="bg-card border border-border rounded-3xl p-6 md:p-10 shadow-sm">
          {step === "upload" && (
            <div
              className={cn(
                "border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-all duration-300",
                isDragging
                  ? "border-foreground bg-secondary/50"
                  : "border-border hover:border-foreground/30 hover:bg-secondary/20",
              )}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                void handleUpload(event.dataTransfer.files[0]);
              }}
            >
              <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-serif font-medium mb-2">
                Drag and drop your image
              </h3>
              <p className="text-muted-foreground mb-8 max-w-md">
                Upload a clear PNG, JPEG or WebP photo of one clothing item.
                Maximum 5 MB.
              </p>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(event) => {
                  void handleUpload(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
              <button
                onClick={() => fileInput.current?.click()}
                className="px-6 py-3 rounded-full bg-foreground text-background font-medium hover:bg-foreground/90 flex items-center gap-2"
              >
                <ImageIcon className="w-4 h-4" /> Browse Files
              </button>
            </div>
          )}
          {step === "processing" && (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-secondary rounded-2xl flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-2xl font-serif font-medium mb-3">
                Understanding your item...
              </h3>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p>Identifying visible garment details.</p>
              </div>
            </div>
          )}
          {step === "review" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in duration-700">
              <div className="space-y-4">
                <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-secondary relative border border-border">
                  <img
                    src={imageUrl!}
                    alt="Wardrobe item"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4 px-3 py-1.5 bg-background/80 backdrop-blur-md rounded-full text-xs font-medium border flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />{" "}
                    {analysis ? "AI suggestions" : "Manual entry"}
                  </div>
                </div>
                <button
                  onClick={() => setStep("upload")}
                  className="w-full py-3 rounded-xl border border-border hover:bg-secondary text-sm font-medium"
                >
                  Replace Image
                </button>
                <button
                  onClick={() => imageUrl && void analyzeImage(imageUrl, false)}
                  className="w-full py-3 rounded-xl border border-border hover:bg-secondary text-sm font-medium flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Re-analyze
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-serif font-medium mb-1">
                    Review Details
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Every suggestion remains editable and nothing is saved
                    automatically.
                  </p>
                </div>
                <div className="space-y-4">
                  {textField("Item Name", "name")}
                  <div className="grid grid-cols-2 gap-4">
                    <SelectField
                      label="Category"
                      value={formData.category}
                      values={categories}
                      optional={false}
                      onChange={(value) => {
                        update("category", value);
                        update("subcategory", "");
                      }}
                    />
                    <SelectField
                      label="Subtype"
                      value={formData.subcategory}
                      values={
                        categorySubcategories[
                          formData.category as keyof typeof categorySubcategories
                        ] || ["Other"]
                      }
                      onChange={(value) => update("subcategory", value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <SelectField
                      label="Primary Color"
                      value={formData.primaryColor}
                      values={canonicalColors}
                      onChange={(value) => update("primaryColor", value)}
                    />
                    {listField("Secondary Colors", "secondaryColors")}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {textField("Brand (manual only)", "brand")}
                    {textField("Material", "material")}
                  </div>
                  {listField("Material Candidates", "materialCandidates")}
                  <div className="grid grid-cols-2 gap-4">
                    <SelectField
                      label="Pattern"
                      value={formData.pattern}
                      values={patterns}
                      onChange={(value) => update("pattern", value)}
                    />
                    <SelectField
                      label="Texture"
                      value={formData.texture}
                      values={textures}
                      onChange={(value) => update("texture", value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <SelectField
                      label="Fit"
                      value={formData.fit}
                      values={fits}
                      onChange={(value) => update("fit", value)}
                    />
                    <SelectField
                      label="Silhouette"
                      value={formData.silhouette}
                      values={silhouettes}
                      onChange={(value) => update("silhouette", value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <SelectField
                      label="Length"
                      value={formData.length}
                      values={garmentLengths}
                      onChange={(value) => update("length", value)}
                    />
                    <SelectField
                      label="Neckline"
                      value={formData.neckline}
                      values={necklines}
                      onChange={(value) => update("neckline", value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <SelectField
                      label="Sleeve Length"
                      value={formData.sleeveLength}
                      values={sleeveLengths}
                      onChange={(value) => update("sleeveLength", value)}
                    />
                    <SelectField
                      label="Rise"
                      value={formData.rise}
                      values={rises}
                      onChange={(value) => update("rise", value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <SelectField
                      label="Layering Role"
                      value={formData.layeringRole}
                      values={layeringRoles}
                      onChange={(value) => update("layeringRole", value)}
                    />
                    <SelectField
                      label="Formality"
                      value={formData.formality}
                      values={formalities}
                      onChange={(value) => update("formality", value)}
                    />
                  </div>
                  {listField("Style Tags", "styleTags")}
                  {listField("Aesthetic Tags", "aestheticTags")}
                  <Field label="Seasons">
                    <div className="flex flex-wrap gap-2">
                      {seasons.map((season) => (
                        <button
                          key={season}
                          onClick={() =>
                            update(
                              "seasons",
                              formData.seasons.includes(season)
                                ? formData.seasons.filter(
                                    (value) => value !== season,
                                  )
                                : [...formData.seasons, season],
                            )
                          }
                          className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium border",
                            formData.seasons.includes(season)
                              ? "bg-foreground text-background border-foreground"
                              : "border-border",
                          )}
                        >
                          {season}
                        </button>
                      ))}
                    </div>
                  </Field>
                  {listField("Occasions", "occasions")}
                  {listField("Weather Suitability", "weatherSuitability")}
                  <div className="grid grid-cols-2 gap-4">
                    <SelectField
                      label="Statement Level"
                      value={formData.statementLevel}
                      values={signalLevels}
                      onChange={(value) => update("statementLevel", value)}
                    />
                    <SelectField
                      label="Visual Weight"
                      value={formData.visualWeight}
                      values={signalLevels}
                      onChange={(value) => update("visualWeight", value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <SelectField
                      label="Structure Level"
                      value={formData.structureLevel}
                      values={signalLevels}
                      onChange={(value) => update("structureLevel", value)}
                    />
                    <SelectField
                      label="Versatility"
                      value={formData.versatility}
                      values={signalLevels}
                      onChange={(value) => update("versatility", value)}
                    />
                  </div>
                  <SelectField
                    label="Dominant Style Direction"
                    value={formData.dominantStyleDirection}
                    values={styleDirections}
                    onChange={(value) =>
                      update("dominantStyleDirection", value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Canonical values include{" "}
                    {occasionValues.slice(0, 4).join(", ")} occasions and{" "}
                    {weatherValues.slice(0, 4).join(", ")} weather conditions.
                  </p>
                </div>
                <div className="pt-6 border-t border-border flex justify-end gap-3">
                  <button
                    onClick={() => setStep("upload")}
                    className="px-6 py-3 rounded-full font-medium hover:bg-secondary"
                  >
                    Start Over
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={mutation.isPending}
                    className="px-8 py-3 rounded-full bg-foreground text-background font-medium hover:bg-foreground/90 flex items-center gap-2"
                  >
                    Save to Wardrobe <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
