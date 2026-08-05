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

type ClosetPiece = {
  name: string;
  note: string;
  image: string;
  tint: string;
};

const TOPS: ClosetPiece[] = [
  {
    name: "Midnight moto",
    note: "black leather · fitted",
    image: "/images/wardrobe/leather-jacket.png",
    tint: "#242330",
  },
  {
    name: "Silk day blouse",
    note: "champagne · fluid",
    image: "/images/silk-blouse.png",
    tint: "#c6a9a4",
  },
  {
    name: "Prep-school blazer",
    note: "navy wool · tailored",
    image: "/images/wardrobe/blazer.png",
    tint: "#344267",
  },
  {
    name: "Soft-focus knit",
    note: "oat cashmere · relaxed",
    image: "/images/wardrobe/sweater.png",
    tint: "#b99f8b",
  },
];

const BOTTOMS: ClosetPiece[] = [
  {
    name: "Indigo mini",
    note: "dark denim · structured",
    image: "/images/wardrobe/jeans.png",
    tint: "#28344d",
  },
  {
    name: "Campus classic",
    note: "ink denim · straight",
    image: "/images/outfits/outfit-1.png",
    tint: "#4d3b4e",
  },
  {
    name: "Cocoa tailoring",
    note: "wool blend · polished",
    image: "/images/outfits/outfit-2.png",
    tint: "#7b5b56",
  },
  {
    name: "After-dark denim",
    note: "washed black · slim",
    image: "/images/outfits/outfit-3.png",
    tint: "#39363d",
  },
];

const EXTRAS = [
  { label: "Shoes", value: "White court sneakers", image: "/images/wardrobe/sneakers.png" },
  { label: "Jewelry", value: "Tiny gold hoops", image: "/images/leather-tote.png" },
  { label: "Bag", value: "Chocolate leather tote", image: "/images/leather-tote.png" },
  { label: "More", value: "Sheer berry tights", image: "/images/moodboard-parisian.png" },
];

const wrap = (value: number, length: number) => (value + length) % length;

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
  const [topIndex, setTopIndex] = useState(0);
  const [bottomIndex, setBottomIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [hasVerdict, setHasVerdict] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [activeExtra, setActiveExtra] = useState(0);
  const [saved, setSaved] = useState(false);

  const top = TOPS[topIndex];
  const bottom = BOTTOMS[bottomIndex];
  const compatibility = useMemo(() => 88 + ((topIndex * 3 + bottomIndex * 5) % 11), [topIndex, bottomIndex]);

  const moveTop = (direction: number) => {
    setHasVerdict(false);
    setTopIndex((current) => wrap(current + direction, TOPS.length));
  };
  const moveBottom = (direction: number) => {
    setHasVerdict(false);
    setBottomIndex((current) => wrap(current + direction, BOTTOMS.length));
  };

  const dressMe = () => {
    if (isScanning) return;
    setSaved(false);
    setHasVerdict(false);
    setIsScanning(true);
    window.setTimeout(() => {
      const nextTop = Math.floor(Math.random() * TOPS.length);
      setTopIndex(nextTop);
      setBottomIndex((nextTop + 2) % BOTTOMS.length);
      setIsScanning(false);
      setHasVerdict(true);
    }, 900);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") moveTop(-1);
      if (event.key === "ArrowDown") moveBottom(1);
      if (event.key === "ArrowLeft") moveTop(-1);
      if (event.key === "ArrowRight") moveBottom(1);
      if (event.key.toLowerCase() === "d") dressMe();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <AppShell>
      <div className="clueless-page">
        <div className="clueless-intro">
          <div>
            <span className="eyebrow">Tuesday · 7:42 AM · Beverly Hills</span>
            <h1>Outfit Lab</h1>
          </div>
          <p>Build it. Scan it. Wear it.</p>
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
              <p className="keyboard-tip">Tip: use arrow keys to browse. Press D to dress.</p>
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
              <span className="panel-kicker">Fashion scan</span>
              {hasVerdict ? (
                <>
                  <div className="score-ring" style={{ "--score": `${compatibility}%` } as CSSProperties}><strong>{compatibility}</strong><span>%</span></div>
                  <h2>Totally works.</h2>
                  <p>The sharp top and clean dark base have the right amount of tension.</p>
                  <ul>
                    <li><Check /> Proportion balanced</li>
                    <li><Check /> Colors in harmony</li>
                    <li><Check /> Day-to-night ready</li>
                  </ul>
                  <button type="button" className={`save-look ${saved ? "is-saved" : ""}`} onClick={() => setSaved((value) => !value)}>
                    {saved ? <Check /> : <Bookmark />} {saved ? "Saved to favorites" : "Save this look"}
                  </button>
                </>
              ) : (
                <div className="scan-idle">
                  <Sparkles />
                  <h2>Ready when you are.</h2>
                  <p>Choose each piece yourself or let the closet find your match.</p>
                  <div className="idle-bars"><i /><i /><i /><i /><i /></div>
                </div>
              )}
            </aside>
          </div>

          <div className="action-console">
            <button type="button" className={`browse-button ${browseOpen ? "active" : ""}`} onClick={() => setBrowseOpen((value) => !value)}>
              <span>Browse</span><small>{browseOpen ? "close closet" : "see everything"}</small>
            </button>
            <div className="console-status"><Heart /> 48 pieces catalogued <Star /> 12 favorites</div>
            <button type="button" className="dress-button" onClick={dressMe} disabled={isScanning}>
              <WandSparkles /> {isScanning ? "Scanning..." : "Dress me"}
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
                key={extra.label}
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
          <strong>{EXTRAS[activeExtra].value}</strong>
          <span>selected</span>
        </div>
      </div>
    </AppShell>
  );
}
