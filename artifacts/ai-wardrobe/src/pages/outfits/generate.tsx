import { AppShell } from "@/components/layout/AppShell";
import { DataStatus } from "@/components/DataStatus";
import {
  useClosetMutation,
  useWardrobe,
  type WardrobeItem,
} from "@/lib/wardrobe-api";
import { customFetch } from "@workspace/api-client-react";
import {
  formalities,
  occasionValues,
  styleDirections,
  styleItemRecommendationsSchema,
  type OutfitRecommendation,
} from "@workspace/api-zod";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  RotateCcw,
  Search,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

import {
  anchorSelectionIssue,
  buildCompleteOutfitRequest,
  buildGeneratedOutfitSaveBody,
  buildRecommendationPieces,
  generationErrorMessage,
  moveRecommendationIndex,
  parseCompleteOutfitResponse,
  recommendationKey,
} from "./complete-outfit-state";

const categoryClass = (category: string) =>
  category.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function CanvasPiece({
  item,
  isAnchor,
  index,
}: {
  item: WardrobeItem;
  isAnchor: boolean;
  index: number;
}) {
  return (
    <article
      className="lab-canvas-piece"
      data-category={categoryClass(item.category)}
      style={{ "--piece-order": index + 1 } as CSSProperties}
    >
      <div className="lab-canvas-image">
        <img src={item.imageUrl} alt={item.name} />
        <span className={isAnchor ? "lab-anchor-label" : "lab-added-label"}>
          {isAnchor ? (
            <Lock aria-hidden="true" />
          ) : (
            <Sparkles aria-hidden="true" />
          )}
          {isAnchor ? "Selected" : "AI added"}
        </span>
      </div>
      <div className="lab-piece-caption">
        <strong>{item.name}</strong>
        <span>{item.category}</span>
      </div>
    </article>
  );
}

export default function GenerateOutfit() {
  const query = useWardrobe();
  const mutation = useClosetMutation();
  const items = query.data || [];
  const available = useMemo(
    () =>
      items.filter(
        (item) =>
          item.availability === "available" &&
          item.maintenanceState === "clean",
      ),
    [items],
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [anchorIds, setAnchorIds] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<
    OutfitRecommendation[]
  >([]);
  const [recommendationIndex, setRecommendationIndex] = useState(0);
  const [resultAnchorIds, setResultAnchorIds] = useState<string[]>([]);
  const [savedRecommendationKeys, setSavedRecommendationKeys] = useState<
    string[]
  >([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<"style" | "complete">("style");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [occasion, setOccasion] = useState("");
  const [style, setStyle] = useState("");
  const [formality, setFormality] = useState("");
  const [useInspiration, setUseInspiration] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  useEffect(() => {
    if (
      available.length &&
      !available.some((item) => item.id === selectedItemId)
    )
      setSelectedItemId(available[0]!.id);
  }, [available, selectedItemId]);

  const selectedItem =
    available.find((item) => item.id === selectedItemId) || available[0];
  const itemById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const selectedAnchors = anchorIds.flatMap((id) => {
    const item = itemById.get(id);
    return item ? [item] : [];
  });
  const categories = useMemo(
    () => ["All", ...new Set(available.map((item) => item.category))],
    [available],
  );
  const filteredItems = available.filter(
    (item) =>
      (category === "All" || item.category === category) &&
      (!search.trim() ||
        [item.name, item.category, item.primaryColor]
          .join(" ")
          .toLowerCase()
          .includes(search.trim().toLowerCase())),
  );
  const recommendation =
    recommendations[
      moveRecommendationIndex(recommendationIndex, 0, recommendations.length)
    ];
  const recommendationView = recommendation
    ? buildRecommendationPieces(recommendation, items, resultAnchorIds)
    : null;
  const previewPieces = recommendationView
    ? recommendationView.pieces
    : selectedAnchors.length
      ? selectedAnchors.map((item) => ({ item, isAnchor: true }))
      : selectedItem
        ? [{ item: selectedItem, isAnchor: true }]
        : [];
  const currentRecommendationKey = recommendation
    ? recommendationKey(recommendation)
    : "";
  const isCurrentSaved =
    !!currentRecommendationKey &&
    savedRecommendationKeys.includes(currentRecommendationKey);

  const clearGenerated = () => {
    setRecommendations([]);
    setRecommendationIndex(0);
    setResultAnchorIds([]);
    setGenerationError(null);
    setSourcesOpen(false);
  };

  const toggleAnchor = (item: WardrobeItem) => {
    if (isGenerating) return;
    setSelectedItemId(item.id);
    if (anchorIds.includes(item.id)) {
      setAnchorIds((current) => current.filter((id) => id !== item.id));
      clearGenerated();
      return;
    }
    const issue = anchorSelectionIssue(selectedAnchors, item);
    if (issue) {
      setGenerationError(issue);
      return;
    }
    setAnchorIds((current) => [...current, item.id]);
    clearGenerated();
  };

  const styleThisItem = async (itemId = selectedItem?.id) => {
    if (!itemId || isGenerating) return;
    setIsGenerating(true);
    setLastAction("style");
    setGenerationError(null);
    setAnchorIds([itemId]);
    try {
      const result = styleItemRecommendationsSchema.parse(
        await customFetch("/api/outfits/style-item", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wardrobeItemId: itemId,
            ...(occasion ? { occasion } : {}),
            ...(style ? { style } : {}),
            ...(formality ? { formality } : {}),
            useInspiration,
          }),
        }),
      );
      setRecommendations(result.outfits);
      setResultAnchorIds([result.selectedItemId]);
      setRecommendationIndex(0);
      setSourcesOpen(false);
    } catch (error) {
      setGenerationError(
        generationErrorMessage(
          error,
          "We could not style this item. Your selection is still here.",
        ),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const completeOutfit = async (ids = anchorIds) => {
    if (ids.length < 2 || isGenerating) return;
    setIsGenerating(true);
    setLastAction("complete");
    setGenerationError(null);
    try {
      const result = parseCompleteOutfitResponse(
        await customFetch("/api/outfits/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            buildCompleteOutfitRequest(ids, {
              occasion,
              style,
              formality: formality || undefined,
              useInspiration,
            }),
          ),
        }),
      );
      setRecommendations(result.outfits);
      setResultAnchorIds(result.anchorItemIds);
      setRecommendationIndex(0);
      setSourcesOpen(false);
    } catch (error) {
      setGenerationError(
        generationErrorMessage(
          error,
          "We could not complete this outfit. Your selected pieces are still here.",
        ),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerate = () => {
    if (resultAnchorIds.length >= 2) void completeOutfit(resultAnchorIds);
    else void styleThisItem(resultAnchorIds[0] || selectedItem?.id);
  };

  const navigateRecommendation = (direction: number) => {
    setRecommendationIndex((current) =>
      moveRecommendationIndex(current, direction, recommendations.length),
    );
    setGenerationError(null);
    setSourcesOpen(false);
  };

  const saveLook = () => {
    if (!recommendation || isCurrentSaved || mutation.isPending) return;
    const key = recommendationKey(recommendation);
    mutation.mutate(
      {
        path: "outfits",
        method: "POST",
        body: buildGeneratedOutfitSaveBody(recommendation, items, occasion),
      },
      {
        onSuccess: () =>
          setSavedRecommendationKeys((current) =>
            current.includes(key) ? current : [...current, key],
          ),
      },
    );
  };

  const startOver = () => {
    setAnchorIds([]);
    clearGenerated();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        recommendations.length < 2 ||
        (event.target instanceof HTMLElement &&
          /INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName))
      )
        return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        navigateRecommendation(event.key === "ArrowLeft" ? -1 : 1);
      }
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

  if (!available.length)
    return (
      <AppShell>
        <div className="lab-no-wardrobe">
          <h1>Outfit Lab</h1>
          <p>Add a clean, available wardrobe item to start building looks.</p>
          <a href="/wardrobe/add">Add clothing</a>
        </div>
      </AppShell>
    );

  return (
    <AppShell>
      <main className="outfit-lab-page">
        <header className="lab-heading">
          <div>
            <span>Personal styling workspace</span>
            <h1>Outfit Lab</h1>
          </div>
          <p>
            Build around pieces you own. Keep every anchor, explore every look.
          </p>
        </header>

        <div className="lab-workspace">
          <aside className="lab-wardrobe-panel" aria-label="Your Wardrobe">
            <div className="lab-panel-heading">
              <div>
                <span>01</span>
                <h2>Your Wardrobe</h2>
              </div>
              <small>{available.length} available</small>
            </div>
            <label className="lab-search">
              <Search aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your wardrobe"
                aria-label="Search your wardrobe"
              />
            </label>
            <div
              className="lab-category-filter"
              aria-label="Wardrobe categories"
            >
              {categories.map((value) => (
                <button
                  type="button"
                  key={value}
                  className={category === value ? "active" : ""}
                  onClick={() => setCategory(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <div className="lab-wardrobe-grid">
              {filteredItems.map((item) => {
                const isSelected = anchorIds.includes(item.id);
                const isFocused = selectedItem?.id === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`lab-wardrobe-card ${isSelected ? "selected" : ""} ${isFocused ? "focused" : ""}`}
                    aria-pressed={isSelected}
                    disabled={isGenerating}
                    onClick={() => toggleAnchor(item)}
                  >
                    <span className="lab-card-image">
                      <img src={item.imageUrl} alt="" />
                      {isSelected && <Check aria-hidden="true" />}
                    </span>
                    <span className="lab-card-copy">
                      <strong>{item.name}</strong>
                      <small>{item.category}</small>
                    </span>
                  </button>
                );
              })}
              {!filteredItems.length && (
                <p className="lab-no-results">
                  No wardrobe pieces match this filter.
                </p>
              )}
            </div>
          </aside>

          <section
            className={`lab-outfit-canvas piece-count-${Math.min(previewPieces.length, 6)} ${recommendation ? "has-result" : ""}`}
            aria-label={
              recommendation
                ? `Generated outfit: ${recommendation.title}`
                : "Outfit canvas"
            }
          >
            <div className="lab-canvas-topline">
              <span>
                {recommendation ? "Complete look" : "Build your look"}
              </span>
              {recommendation && (
                <strong>
                  {recommendationIndex + 1} / {recommendations.length}
                </strong>
              )}
            </div>

            {!recommendation && (
              <div className="lab-empty-copy">
                <Sparkles aria-hidden="true" />
                <div>
                  <h2>
                    {selectedAnchors.length
                      ? "Your selected foundation"
                      : "Build your look"}
                  </h2>
                  <p>
                    {selectedAnchors.length
                      ? "Add up to three anchors, then let the stylist complete the outfit."
                      : "Select an item from your wardrobe or let AI style the focused piece."}
                  </p>
                </div>
              </div>
            )}

            <div className="lab-canvas-stage">
              {previewPieces.map(({ item, isAnchor }, index) => (
                <CanvasPiece
                  key={item.id}
                  item={item}
                  isAnchor={isAnchor}
                  index={index}
                />
              ))}
            </div>

            {isGenerating && (
              <div
                className="lab-loading-layer"
                role="status"
                aria-live="polite"
              >
                <div className="lab-loading-card">
                  <span className="lab-loading-line" />
                  <span className="lab-loading-line short" />
                  <p>Styling with your wardrobe…</p>
                </div>
              </div>
            )}

            {recommendationView?.unresolvedItemIds.length ? (
              <div className="lab-lookup-error" role="alert">
                We could not match these returned wardrobe IDs:{" "}
                {recommendationView.unresolvedItemIds.join(", ")}.
              </div>
            ) : null}

            {recommendations.length > 1 && recommendation && (
              <div className="lab-canvas-navigation">
                <button
                  type="button"
                  aria-label="Previous recommendation"
                  onClick={() => navigateRecommendation(-1)}
                  disabled={isGenerating}
                >
                  <ChevronLeft aria-hidden="true" />
                  Previous
                </button>
                <div>
                  <span>{recommendation.title}</span>
                  <strong>
                    {recommendationIndex + 1} of {recommendations.length}
                  </strong>
                </div>
                <button
                  type="button"
                  aria-label="Next recommendation"
                  onClick={() => navigateRecommendation(1)}
                  disabled={isGenerating}
                >
                  Next
                  <ChevronRight aria-hidden="true" />
                </button>
              </div>
            )}
          </section>

          <aside className="lab-stylist-panel" aria-label="AI Stylist">
            <div className="lab-panel-heading">
              <div>
                <span>02</span>
                <h2>AI Stylist</h2>
              </div>
              <WandSparkles aria-hidden="true" />
            </div>

            <section className="lab-anchor-section">
              <div className="lab-section-label">
                <span>Selected pieces</span>
                <small>{anchorIds.length} / 3</small>
              </div>
              {selectedAnchors.length ? (
                <div className="lab-anchor-list">
                  {selectedAnchors.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => toggleAnchor(item)}
                      disabled={isGenerating}
                      aria-label={`Remove ${item.name} from selected anchors`}
                    >
                      <img src={item.imageUrl} alt="" />
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.category}</small>
                      </span>
                      <X aria-hidden="true" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="lab-helper-copy">
                  Select wardrobe cards to lock pieces into your look.
                </p>
              )}
            </section>

            <div className="lab-control-stack">
              <label>
                Occasion
                <select
                  value={occasion}
                  onChange={(event) => setOccasion(event.target.value)}
                  disabled={isGenerating}
                >
                  <option value="">Any occasion</option>
                  {occasionValues.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label>
                Style
                <select
                  value={style}
                  onChange={(event) => setStyle(event.target.value)}
                  disabled={isGenerating}
                >
                  <option value="">Any style</option>
                  {styleDirections.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label>
                Formality
                <select
                  value={formality}
                  onChange={(event) => setFormality(event.target.value)}
                  disabled={isGenerating}
                >
                  <option value="">Any formality</option>
                  {formalities.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>

            <div
              className="lab-mode-toggle"
              role="group"
              aria-label="Recommendation mode"
            >
              <button
                type="button"
                className={!useInspiration ? "active" : ""}
                aria-pressed={!useInspiration}
                disabled={isGenerating}
                onClick={() => setUseInspiration(false)}
              >
                Wardrobe only
              </button>
              <button
                type="button"
                className={useInspiration ? "active" : ""}
                aria-pressed={useInspiration}
                disabled={isGenerating}
                onClick={() => setUseInspiration(true)}
              >
                Inspired
              </button>
            </div>

            <div className="lab-primary-actions">
              <button
                type="button"
                className="lab-primary-button"
                disabled={!selectedItem || isGenerating}
                onClick={() => void styleThisItem()}
              >
                {isGenerating && lastAction === "style" ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <WandSparkles aria-hidden="true" />
                )}
                Style this item
              </button>
              <button
                type="button"
                className="lab-secondary-button"
                disabled={anchorIds.length < 2 || isGenerating}
                onClick={() => void completeOutfit()}
              >
                {isGenerating && lastAction === "complete" ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles aria-hidden="true" />
                )}
                Complete outfit
              </button>
            </div>

            {generationError && (
              <div className="lab-generation-error" role="alert">
                <strong>Styling paused</strong>
                <p>{generationError}</p>
                <button
                  type="button"
                  onClick={() =>
                    lastAction === "complete"
                      ? void completeOutfit()
                      : void styleThisItem()
                  }
                  disabled={isGenerating}
                >
                  Try again
                </button>
              </div>
            )}

            {recommendation && (
              <section className="lab-result-details">
                <span className="lab-eyebrow">Why this works</span>
                <h3>{recommendation.title}</h3>
                <p>{recommendation.explanation}</p>
                <div className="lab-result-meta">
                  <span>{resultAnchorIds.length} selected</span>
                  <span>
                    {recommendationView?.pieces.filter(
                      (piece) => !piece.isAnchor,
                    ).length || 0}{" "}
                    AI added
                  </span>
                </div>
                {recommendation.missingCategories.length > 0 && (
                  <p className="lab-missing">
                    Still needed: {recommendation.missingCategories.join(", ")}
                  </p>
                )}
                {recommendation.inspiration && (
                  <div className="lab-inspiration-note">
                    <strong>{recommendation.inspiration.directionName}</strong>
                    <p>{recommendation.inspiration.summary}</p>
                    {!!recommendation.inspiration.sources.length && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSourcesOpen((current) => !current)}
                          aria-expanded={sourcesOpen}
                        >
                          {sourcesOpen ? "Hide sources" : "View sources"}
                        </button>
                        {sourcesOpen && (
                          <ul>
                            {recommendation.inspiration.sources.map(
                              (source) => (
                                <li key={source.url}>
                                  <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
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
                <div className="lab-result-actions">
                  <button
                    type="button"
                    className="lab-save-button"
                    onClick={saveLook}
                    disabled={isCurrentSaved || mutation.isPending}
                  >
                    {isCurrentSaved ? <Check /> : <Bookmark />}
                    {isCurrentSaved ? "Saved to Lookbook" : "Save to Lookbook"}
                  </button>
                  <button
                    type="button"
                    className="lab-regenerate-button"
                    onClick={regenerate}
                    disabled={isGenerating}
                  >
                    <RotateCcw aria-hidden="true" />
                    Regenerate
                  </button>
                </div>
              </section>
            )}

            {(anchorIds.length > 0 || recommendation) && (
              <button
                type="button"
                className="lab-start-over"
                onClick={startOver}
                disabled={isGenerating}
              >
                Start over
              </button>
            )}
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
