import { AppShell } from "@/components/layout/AppShell";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  Heart,
  RotateCcw,
  Sparkles,
  Star,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

import { useWardrobe, useClosetMutation, type WardrobeItem } from "@/lib/wardrobe-api";
import { DataStatus } from "@/components/DataStatus";

type ClosetPiece = {
  id: string;
  name: string;
  note: string;
  image: string;
  tint: string;
};

const wrap = (value: number, length: number) => length ? (value + length) % length : 0;

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
      <div className={`piece-picture ${isScanning ? "is-scanning" : ""}`} style={{ "--piece-tint": piece.tint } as CSSProperties}>
        <img src={piece.image} alt={piece.name} />
        <div className="scan-line" />
        <span className="piece-name">{piece.name}</span>
      </div>
      <div className="transport-controls">
        <button type="button" onClick={onPrevious} aria-label={`Previous ${label.toLowerCase()}`}>
          <ChevronLeft aria-hidden="true" />
          <ChevronLeft aria-hidden="true" />
        </button>
        <button type="button" onClick={onNext} aria-label={`Next ${label.toLowerCase()}`}>
          <ChevronRight aria-hidden="true" />
        </button>
        <button type="button" onClick={() => { onNext(); onNext(); }} aria-label={`Skip ahead in ${label.toLowerCase()}`}>
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
  const piece = (i: WardrobeItem): ClosetPiece => ({ id: i.id, name: i.name, note: [i.primaryColor, i.material, i.fit].filter(Boolean).join(' · '), image: i.imageUrl, tint: '#344267' });
  const available = items.filter(i => i.availability === 'available' && i.maintenanceState === 'clean');
  const TOPS = available.filter(i => ['Tops', 'Outerwear'].includes(i.category)).map(piece);
  const BOTTOMS = available.filter(i => i.category === 'Bottoms').map(piece);
  const EXTRAS = available.filter(i => ['Shoes', 'Bags', 'Jewelry', 'Accessories'].includes(i.category)).map(i => ({ id: i.id, label: i.category, value: i.name, image: i.imageUrl }));
  const [topIndex, setTopIndex] = useState(0);
  const [bottomIndex, setBottomIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [hasVerdict, setHasVerdict] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [activeExtra, setActiveExtra] = useState(0);
  const [saved, setSaved] = useState(false);

  const top = TOPS[topIndex % TOPS.length];
  const bottom = BOTTOMS[bottomIndex % BOTTOMS.length];
  const extra = EXTRAS[activeExtra % EXTRAS.length];
  useEffect(() => { setSaved(false); setHasVerdict(false); }, [top?.id, bottom?.id, extra?.id]);
  const saveLook = () => {
    mutation.mutate({ path: 'outfits', method: 'POST', body: { name: top.name + ' + ' + bottom.name, source: 'manual', favorite: true,
      items: [{ itemId: top.id, role: 'top' }, { itemId: bottom.id, role: 'bottom' }, ...(extra ? [{ itemId: extra.id, role: extra.label }] : [])] } }, { onSuccess: () => setSaved(true) });
  };

  const moveTop = (direction: number) => {
    setHasVerdict(false);
    setTopIndex((current) => wrap(current + direction, TOPS.length));
  };
  const moveBottom = (direction: number) => {
    setHasVerdict(false);
    setBottomIndex((current) => wrap(current + direction, BOTTOMS.length));
  };

  const dressMe = () => { setHasVerdict(true); };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      if (event.key === "ArrowUp") moveTop(-1);
      if (event.key === "ArrowDown") moveBottom(1);
      if (event.key === "ArrowLeft") moveTop(-1);
      if (event.key === "ArrowRight") moveBottom(1);
      if (event.key.toLowerCase() === "d") dressMe();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (query.isPending || query.error) return <AppShell><DataStatus pending={query.isPending} error={query.error} /></AppShell>;
  if (!top || !bottom) return <AppShell><p>Add an available top and bottom to your wardrobe to build a look.</p><a href="/wardrobe/add">Add clothing</a></AppShell>;
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
            <div className="window-dots" aria-hidden="true"><i /><i /><i /></div>
            <span>CHER'S DIGITAL CLOSET // LOOK 04</span>
            <div className="online-pill"><i /> online</div>
          </div>

          <div className="closet-grid">
            <aside className="brief-panel">
              <span className="panel-kicker">Today’s brief</span>
              <h2>School, then a last-minute dinner.</h2>
              <div className="weather-chip"><CloudSun /> 72° · sunny</div>
              <dl>
                <div><dt>Vibe</dt><dd>Polished rebel</dd></div>
                <div><dt>Priority</dt><dd>Comfort + impact</dd></div>
                <div><dt>Palette</dt><dd><i className="swatch plum" /><i className="swatch navy" /><i className="swatch cream" /></dd></div>
              </dl>
              <button className="tiny-retro-button" type="button" onClick={() => { setTopIndex(0); setBottomIndex(0); setHasVerdict(false); }}>
                <RotateCcw /> Start over
              </button>
              <p className="keyboard-tip">Tip: use arrow keys to browse. Press D to review.</p>
            </aside>

            <div className="outfit-machine">
              <div className="machine-heading">
                <span>Match station</span>
                <strong>{String(topIndex + 1).padStart(2, "0")} / {String(TOPS.length).padStart(2, "0")}</strong>
              </div>
              <PieceViewer label="Tops" piece={top} onPrevious={() => moveTop(-1)} onNext={() => moveTop(1)} isScanning={isScanning} />
              <div className="machine-seam"><span>combine with</span></div>
              <PieceViewer label="Bottoms" piece={bottom} onPrevious={() => moveBottom(-1)} onNext={() => moveBottom(1)} isScanning={isScanning} />
            </div>

            <aside className={`verdict-panel ${hasVerdict ? "has-verdict" : ""}`} aria-live="polite">
              <span className="panel-kicker">Look preview</span>
              {hasVerdict ? (
                <>
                  <h2>Your selected look.</h2>
                  <p>A manual combination from your wardrobe. AI recommendations are not enabled yet.</p>
                  <button type="button" className={`save-look ${saved ? "is-saved" : ""}`} onClick={saveLook} disabled={saved || mutation.isPending}>
                    {saved ? <Check /> : <Bookmark />} {saved ? "Saved to favorites" : "Save this look"}
                  </button>
                </>
              ) : (
                <div className="scan-idle">
                  <Sparkles />
                  <h2>Ready when you are.</h2>
                  <p>Choose each piece, then review and save your look.</p>
                  <div className="idle-bars"><i /><i /><i /><i /><i /></div>
                </div>
              )}
            </aside>
          </div>

          <div className="action-console">
            <button type="button" className={`browse-button ${browseOpen ? "active" : ""}`} onClick={() => setBrowseOpen((value) => !value)}>
              <span>Browse</span><small>{browseOpen ? "close closet" : "see everything"}</small>
            </button>
            <div className="console-status"><Heart /> {items.length} pieces catalogued <Star /> {items.filter(i => i.favorite).length} favorites</div>
            <button type="button" className="dress-button" onClick={dressMe} disabled={isScanning}>
              <WandSparkles /> Review look
            </button>
          </div>

          {browseOpen && (
            <div className="closet-tray">
              {[...TOPS, ...BOTTOMS].map((piece, index) => (
                <button
                  type="button"
                  key={`${piece.name}-${index}`}
                  onClick={() => {
                    if (index < TOPS.length) setTopIndex(index);
                    else setBottomIndex(index - TOPS.length);
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
            <button type="button" className="active">Tops</button>
            <button type="button" onClick={() => setBrowseOpen(true)}>Bottoms</button>
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
