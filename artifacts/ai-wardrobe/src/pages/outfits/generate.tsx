import { AppShell } from "@/components/layout/AppShell";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  Globe,
  Heart,
  Loader2,
  RotateCcw,
  Sparkles,
  Star,
  WandSparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

import {
  useWardrobe,
  useClosetMutation,
  type WardrobeItem,
} from "@/lib/wardrobe-api";
import { DataStatus } from "@/components/DataStatus";
import { customFetch } from "@workspace/api-client-react";
import {
  formalities,
  completeOutfitRecommendationsSchema,
  occasionValues,
  styleDirections,
  styleItemRecommendationsSchema,
  type OutfitRecommendation,
} from "@workspace/api-zod";

type ClosetPiece = {
  id: string;
  name: string;
  note: string;
  image: string;
  tint: string;
};

const wrap = (value: number, length: number) =>
  length ? (value + length) % length : 0;

function PieceViewer({
  label,
  piece,
  onPrevious,
  onNext,
  isScanning,
}: {
  label: string;
  piece: ClosetPiece;
  onPrevious: () => void;
  onNext: () => void;
  isScanning: boolean;
}) {
  return (
    <section className="piece-viewer" aria-label={`${label}: ${piece.name}`}>
      <div className="piece-label-row">
        <span>{label}</span>
        <span>{piece.note}</span>
      </div>
      <div
        className={`piece-picture ${isScanning ? "is-scanning" : ""}`}
        style={{ "--piece-tint": piece.tint } as CSSProperties}
      >
        <img src={piece.image} alt={piece.name} />
        <div className="scan-line" />
        <span className="piece-name">{piece.name}</span>
      </div>
      <div className="transport-controls">
        <button
          type="button"
          onClick={onPrevious}
          aria-label={`Previous ${label.toLowerCase()}`}
        >
          <ChevronLeft aria-hidden="true" />
          <ChevronLeft aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label={`Next ${label.toLowerCase()}`}
        >
          <ChevronRight aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => {
            onNext();
            onNext();
          }}
          aria-label={`Skip ahead in ${label.toLowerCase()}`}
        >
          <ChevronRight aria-hidden="true" />
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export default function GenerateOutfit() {
  const query = useWardrobe();
  const mutation = useClosetMutation();
  const items = query.data || [];
  const piece = (i: WardrobeItem): ClosetPiece => ({
    id: i.id,
    name: i.name,
    note: [i.primaryColor, i.material, i.fit].filter(Boolean).join(" · "),
    image: i.imageUrl,
    tint: "#344267",
  });
  const available = items.filter(
    (i) => i.availability === "available" && i.maintenanceState === "clean",
  );
  const TOPS = available.map(piece);
  const BOTTOMS = available.filter((i) => i.category === "Bottoms").map(piece);
  const EXTRAS = available
    .filter((i) =>
      ["Shoes", "Bags", "Jewelry", "Accessories"].includes(i.category),
    )
    .map((i) => ({
      id: i.id,
      label: i.category,
      value: i.name,
      image: i.imageUrl,
    }));
  const [topIndex, setTopIndex] = useState(0);
  const [bottomIndex, setBottomIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [hasVerdict, setHasVerdict] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [activeExtra, setActiveExtra] = useState(0);
  const [saved, setSaved] = useState(false);
  const [recommendations, setRecommendations] = useState<
    OutfitRecommendation[]
  >([]);
  const [recommendationIndex, setRecommendationIndex] = useState(0);
  const [recommendationError, setRecommendationError] = useState<string | null>(
    null,
  );
  const [occasion, setOccasion] = useState("");
  const [style, setStyle] = useState("");
  const [formality, setFormality] = useState("");
  const [useInspiration, setUseInspiration] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [anchorIds, setAnchorIds] = useState<string[]>([]);

  const top = TOPS[topIndex % TOPS.length];
  const bottom = BOTTOMS[bottomIndex % BOTTOMS.length];
  const extra = EXTRAS[activeExtra % EXTRAS.length];
  const recommendation =
    recommendations[recommendationIndex % recommendations.length];
  const selectedAnchors = anchorIds.flatMap((id) =>
    items.filter((item) => item.id === id),
  );
  useEffect(() => {
    setSaved(false);
    setHasVerdict(false);
    setRecommendations([]);
    setRecommendationError(null);
  }, [top?.id]);
  useEffect(() => {
    setSaved(false);
    setHasVerdict(false);
  }, [bottom?.id, extra?.id]);
  const saveLook = () => {
    if (recommendation) {
      mutation.mutate(
        {
          path: "outfits",
          method: "POST",
          body: {
            name: recommendation.title,
            source: "ai-assisted",
            favorite: true,
            items: recommendation.itemIds.map((itemId) => ({
              itemId,
              role: items
                .find((item) => item.id === itemId)
                ?.category.toLowerCase(),
            })),
            styleTags: recommendation.styleTags,
            occasion: recommendation.occasionFit || occasion,
            recommendationExplanation: recommendation.explanation,
          },
        },
        { onSuccess: () => setSaved(true) },
      );
      return;
    }
    const manualItems = [
      { itemId: top.id, role: "selected" },
      ...(bottom && bottom.id !== top.id
        ? [{ itemId: bottom.id, role: "bottom" }]
        : []),
      ...(extra && extra.id !== top.id && extra.id !== bottom?.id
        ? [{ itemId: extra.id, role: extra.label }]
        : []),
    ];
    mutation.mutate(
      {
        path: "outfits",
        method: "POST",
        body: {
          name: top.name + (bottom ? " + " + bottom.name : ""),
          source: "manual",
          favorite: true,
          items: manualItems,
        },
      },
      { onSuccess: () => setSaved(true) },
    );
  };

  const moveTop = (direction: number) => {
    setHasVerdict(false);
    setTopIndex((current) => wrap(current + direction, TOPS.length));
  };
  const moveBottom = (direction: number) => {
    setHasVerdict(false);
    setBottomIndex((current) => wrap(current + direction, BOTTOMS.length));
  };

  const reviewManual = () => {
    setRecommendations([]);
    setRecommendationError(null);
    setHasVerdict(true);
  };
  const styleThis = async () => {
    setIsScanning(true);
    setRecommendationError(null);
    setSaved(false);
    setHasVerdict(false);
    try {
      const result = styleItemRecommendationsSchema.parse(
        await customFetch("/api/outfits/style-item", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wardrobeItemId: top.id,
            ...(occasion ? { occasion } : {}),
            ...(style ? { style } : {}),
            ...(formality ? { formality } : {}),
            useInspiration,
          }),
        }),
      );
      setRecommendations(result.outfits);
      setRecommendationIndex(0);
      setSourcesOpen(false);
    } catch (error) {
      setRecommendations([]);
      setRecommendationError(
        error instanceof Error
          ? error.message
          : "Could not create recommendations",
      );
    } finally {
      setIsScanning(false);
    }
  };
  const toggleAnchor = (id: string) => {
    setRecommendationError(null);
    setAnchorIds((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length === 3) {
        setRecommendationError("Complete My Outfit supports up to three selected pieces.");
        return current;
      }
      return [...current, id];
    });
  };
  const completeOutfit = async () => {
    if (anchorIds.length < 2) {
      setRecommendationError("Select two or three anchor pieces first.");
      return;
    }
    setIsScanning(true);
    setRecommendationError(null);
    setSaved(false);
    setHasVerdict(false);
    try {
      const result = completeOutfitRecommendationsSchema.parse(
        await customFetch("/api/outfits/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anchorItemIds: anchorIds,
            ...(occasion ? { occasion } : {}),
            ...(style ? { style } : {}),
            ...(formality ? { formality } : {}),
            useInspiration,
          }),
        }),
      );
      setRecommendations(result.outfits);
      setRecommendationIndex(0);
      setSourcesOpen(false);
    } catch (error) {
      setRecommendations([]);
      setRecommendationError(
        error instanceof Error ? error.message : "Could not complete this outfit",
      );
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)
      )
        return;
      if (event.key === "ArrowUp") moveTop(-1);
      if (event.key === "ArrowDown") moveBottom(1);
      if (event.key === "ArrowLeft") moveTop(-1);
      if (event.key === "ArrowRight") moveBottom(1);
      if (event.key.toLowerCase() === "d") void styleThis();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (query.isPending || query.error)
    return (
      <AppShell>
        <DataStatus pending={query.isPending} error={query.error} />
      </AppShell>
    );
  if (!top)
    return (
      <AppShell>
        <p>Add an available wardrobe item to style a look.</p>
        <a href="/wardrobe/add">Add clothing</a>
      </AppShell>
    );
  return (
    <AppShell>
      <div className="clueless-page">
        <div className="clueless-intro">
          <div>
            <span className="eyebrow">Tuesday · 7:42 AM · Beverly Hills</span>
            <h1>Outfit Lab</h1>
          </div>
          <p>Build it. Save it. Wear it.</p>
        </div>

        <div className="closet-window">
          <div className="window-titlebar">
            <div className="window-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <span>CHER'S DIGITAL CLOSET // LOOK 04</span>
            <div className="online-pill">
              <i /> online
            </div>
          </div>

          <div className="closet-grid">
            <aside className="brief-panel">
              <span className="panel-kicker">Today’s brief</span>
              <h2>School, then a last-minute dinner.</h2>
              <div className="weather-chip">
                <CloudSun /> 72° · sunny
              </div>
              <dl>
                <div>
                  <dt>Occasion</dt>
                  <dd>
                    <select
                      aria-label="Occasion"
                      value={occasion}
                      onChange={(event) => setOccasion(event.target.value)}
                    >
                      <option value="">Any</option>
                      {occasionValues.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </dd>
                </div>
                <div>
                  <dt>Vibe</dt>
                  <dd>
                    <select
                      aria-label="Style or vibe"
                      value={style}
                      onChange={(event) => setStyle(event.target.value)}
                    >
                      <option value="">Any</option>
                      {styleDirections.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </dd>
                </div>
                <div>
                  <dt>Formality</dt>
                  <dd>
                    <select
                      aria-label="Formality"
                      value={formality}
                      onChange={(event) => setFormality(event.target.value)}
                    >
                      <option value="">Any</option>
                      {formalities.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </dd>
                </div>
                <div>
                  <dt>Recommendation mode</dt>
                  <dd
                    className="inspiration-mode-control"
                    role="group"
                    aria-label="Recommendation mode"
                  >
                    <button
                      type="button"
                      className={!useInspiration ? "active" : ""}
                      aria-pressed={!useInspiration}
                      disabled={isScanning}
                      onClick={() => setUseInspiration(false)}
                    >
                      Wardrobe Only
                    </button>
                    <button
                      type="button"
                      className={useInspiration ? "active" : ""}
                      aria-pressed={useInspiration}
                      disabled={isScanning}
                      onClick={() => setUseInspiration(true)}
                    >
                      Inspired
                    </button>
                  </dd>
                </div>
                <div>
                  <dt>Palette</dt>
                  <dd>
                    <i className="swatch plum" />
                    <i className="swatch navy" />
                    <i className="swatch cream" />
                  </dd>
                </div>
              </dl>
              <div className="space-y-2">
                <span className="panel-kicker">Complete My Outfit anchors</span>
                {selectedAnchors.length ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedAnchors.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="tiny-retro-button"
                        onClick={() => toggleAnchor(item.id)}
                        aria-label={`Remove ${item.name} from selected anchors`}
                      >
                        {item.name} <X aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="keyboard-tip">Select two or three pieces you want to keep.</p>
                )}
                <button
                  className="tiny-retro-button"
                  type="button"
                  disabled={anchorIds.includes(top.id)}
                  onClick={() => toggleAnchor(top.id)}
                >
                  {anchorIds.includes(top.id) ? "Current item selected" : "Add current item as anchor"}
                </button>
              </div>
              <button
                className="tiny-retro-button"
                type="button"
                onClick={() => {
                  setTopIndex(0);
                  setBottomIndex(0);
                  setHasVerdict(false);
                }}
              >
                <RotateCcw /> Start over
              </button>
              <button
                className="tiny-retro-button"
                type="button"
                onClick={reviewManual}
              >
                Review manual pairing
              </button>
              <p className="keyboard-tip">
                Tip: use arrow keys to browse. Press D to style the selected
                item.
              </p>
            </aside>

            <div className="outfit-machine">
              <div className="machine-heading">
                <span>Match station</span>
                <strong>
                  {String(topIndex + 1).padStart(2, "0")} /{" "}
                  {String(TOPS.length).padStart(2, "0")}
                </strong>
              </div>
              <PieceViewer
                label="Selected item"
                piece={top}
                onPrevious={() => moveTop(-1)}
                onNext={() => moveTop(1)}
                isScanning={isScanning}
              />
              <div className="machine-seam">
                <span>manual pair with</span>
              </div>
              {bottom ? (
                <PieceViewer
                  label="Bottoms"
                  piece={bottom}
                  onPrevious={() => moveBottom(-1)}
                  onNext={() => moveBottom(1)}
                  isScanning={isScanning}
                />
              ) : (
                <p>
                  Add a bottom for manual pairing. Style This Item can still
                  return a partial look.
                </p>
              )}
            </div>

            <aside
              className={`verdict-panel ${hasVerdict ? "has-verdict" : ""}`}
              aria-live="polite"
            >
              <span className="panel-kicker">Look preview</span>
              {recommendation ? (
                <>
                  <h2>{recommendation.title}</h2>
                  <p>{recommendation.explanation}</p>
                  <p>
                    {recommendation.itemIds
                      .map((id) => items.find((item) => item.id === id)?.name)
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {recommendation.inspiration && (
                    <div className="inspired-note">
                      <span className="inspired-badge">
                        <Globe aria-hidden="true" /> Inspired
                      </span>
                      <strong>
                        {recommendation.inspiration.directionName}
                      </strong>
                      <p>{recommendation.inspiration.summary}</p>
                      {recommendation.inspiration.sources.length > 0 && (
                        <>
                          <button
                            type="button"
                            className="sources-toggle"
                            aria-expanded={sourcesOpen}
                            onClick={() => setSourcesOpen((value) => !value)}
                          >
                            {sourcesOpen
                              ? "Hide sources"
                              : `Sources (${recommendation.inspiration.sources.length})`}
                          </button>
                          {sourcesOpen && (
                            <ul className="inspired-sources">
                              {recommendation.inspiration.sources.map(
                                (source) => (
                                  <li key={source.url}>
                                    <a
                                      href={source.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={source.title}
                                    >
                                      {source.provider}
                                    </a>
                                  </li>
                                ),
                              )}
                            </ul>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {recommendation.missingCategories.length > 0 && (
                    <p>
                      Still needed:{" "}
                      {recommendation.missingCategories.join(", ")}
                    </p>
                  )}
                  {recommendations.length > 1 && (
                    <div className="transport-controls">
                      <button
                        type="button"
                        onClick={() => {
                          setSourcesOpen(false);
                          setRecommendationIndex((value) =>
                            wrap(value - 1, recommendations.length),
                          );
                        }}
                        aria-label="Previous recommendation"
                      >
                        <ChevronLeft />
                      </button>
                      <span>
                        {recommendationIndex + 1} / {recommendations.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSourcesOpen(false);
                          setRecommendationIndex((value) =>
                            wrap(value + 1, recommendations.length),
                          );
                        }}
                        aria-label="Next recommendation"
                      >
                        <ChevronRight />
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    className={`save-look ${saved ? "is-saved" : ""}`}
                    onClick={saveLook}
                    disabled={saved || mutation.isPending}
                  >
                    {saved ? <Check /> : <Bookmark />}{" "}
                    {saved ? "Saved to favorites" : "Save this look"}
                  </button>
                </>
              ) : hasVerdict ? (
                <>
                  <h2>Your selected look.</h2>
                  <p>A manual combination from your wardrobe.</p>
                  <button
                    type="button"
                    className={`save-look ${saved ? "is-saved" : ""}`}
                    onClick={saveLook}
                    disabled={saved || mutation.isPending}
                  >
                    {saved ? <Check /> : <Bookmark />}{" "}
                    {saved ? "Saved to favorites" : "Save this look"}
                  </button>
                </>
              ) : (
                <div className="scan-idle">
                  <Sparkles />
                  <h2>
                    {recommendationError
                      ? "Could not style this item."
                      : "Ready when you are."}
                  </h2>
                  <p>
                    {recommendationError ||
                      (useInspiration
                        ? "Choose an item, then generate recommendations inspired by online styling patterns."
                        : "Choose an item, then request wardrobe-only recommendations.")}
                  </p>
                  <div className="idle-bars">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              )}
            </aside>
          </div>

          <div className="action-console">
            <button
              type="button"
              className={`browse-button ${browseOpen ? "active" : ""}`}
              onClick={() => setBrowseOpen((value) => !value)}
            >
              <span>Browse</span>
              <small>{browseOpen ? "close closet" : "see everything"}</small>
            </button>
            <div className="console-status">
              <Heart /> {items.length} pieces catalogued <Star />{" "}
              {items.filter((i) => i.favorite).length} favorites
            </div>
            <button
              type="button"
              className="dress-button"
              onClick={() => void styleThis()}
              disabled={isScanning}
            >
              {isScanning ? (
                <Loader2 className="animate-spin" />
              ) : (
                <WandSparkles />
              )}{" "}
              {isScanning ? "Styling..." : "Style this item"}
            </button>
            <button
              type="button"
              className="dress-button"
              onClick={() => void completeOutfit()}
              disabled={isScanning || anchorIds.length < 2}
              title={anchorIds.length < 2 ? "Select at least two anchor pieces" : undefined}
            >
              {isScanning ? <Loader2 className="animate-spin" /> : <WandSparkles />} {" "}
              Complete my outfit
            </button>
          </div>

          {browseOpen && (
            <div className="closet-tray">
              {TOPS.map((piece, index) => (
                <button
                  type="button"
                  key={`${piece.name}-${index}`}
                  onClick={() => {
                    setTopIndex(index);
                    setHasVerdict(false);
                  }}
                >
                  <img src={piece.image} alt="" />
                  <span>{piece.name}</span>
                </button>
              ))}
            </div>
          )}

          <nav className="category-strip" aria-label="Closet categories">
            <button type="button" className="active">
              All items
            </button>
            <button type="button" onClick={() => setBrowseOpen(true)}>
              Bottoms
            </button>
            {EXTRAS.map((extra, index) => (
              <button
                type="button"
                key={extra.id}
                className={activeExtra === index ? "selected-extra" : ""}
                onClick={() => setActiveExtra(index)}
                title={extra.value}
              >
                {extra.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="selected-extra-note">
          <span>Finishing touch</span>
          <strong>{extra?.value || "No accessory selected"}</strong>
          <span>selected</span>
        </div>
      </div>
    </AppShell>
  );
}
