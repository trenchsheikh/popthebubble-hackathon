"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { useT, useLocale } from "@/lib/i18n";
import type { Allergen, MenuItem } from "@/lib/types";

const ALLERGEN_LABEL: Record<Allergen, string> = {
  gluten: "Gluten",
  shellfish: "Shellfish",
  fish: "Fish",
  dairy: "Dairy",
  egg: "Egg",
  nuts: "Nuts"
};

export function Dish3D({
  dish,
  src,
  large = false,
  feed = false
}: {
  dish: MenuItem;
  src?: string;
  large?: boolean;
  feed?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState({ rx: 0, ry: 0, mx: 50, my: 50, active: false });
  const [failed, setFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [clipIndex, setClipIndex] = useState(0);
  const [openHotspot, setOpenHotspot] = useState<string | null>(null);

  function move(clientX: number, clientY: number) {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const py = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const range = large ? 28 : 16;
    setState({
      ry: (px - 0.5) * range,
      rx: (0.5 - py) * (range - 4),
      mx: px * 100,
      my: py * 100,
      active: true
    });
  }

  function reset() {
    setState((current) => ({ ...current, rx: 0, ry: 0, mx: 50, my: 50, active: false }));
  }

  const t = useT();
  const { locale } = useLocale();
  const clips = dish.clips ?? [];
  const hasVideo = (clips.length > 0 || Boolean(dish.videoUrl)) && !videoFailed;
  const showImage = !hasVideo && src && !failed;
  const hotspots = large ? dish.hotspots ?? [] : [];
  const activeHotspot = hotspots.find((hotspot) => hotspot.id === openHotspot) ?? null;
  const showSteam = large && Boolean(dish.steam);

  // Single pre-edited video, or a sequence of short clips played back-to-back.
  const videoSrc = clips.length > 0 ? clips[clipIndex % clips.length] : dish.videoUrl;

  return (
    <div
      ref={ref}
      className={`dish3d ${feed ? "dish3d-feed" : ""}`}
      style={{ perspective: large ? 900 : 700 }}
      onMouseMove={(event) => move(event.clientX, event.clientY)}
      onMouseLeave={reset}
      onTouchMove={
        feed
          ? undefined
          : (event) => {
              const touch = event.touches[0];
              if (touch) move(touch.clientX, touch.clientY);
            }
      }
      onTouchEnd={feed ? undefined : reset}
    >
      <div
        className={`dish3d-card ${large && !state.active ? "dish3d-float" : ""}`}
        style={{
          transform: `rotateX(${state.rx}deg) rotateY(${state.ry}deg) scale(${state.active ? (large ? 1.04 : 1.03) : 1})`,
          transition: state.active ? "transform 40ms linear" : "transform 500ms cubic-bezier(.2,.85,.25,1)",
          boxShadow: `${-state.ry}px ${state.rx + (large ? 26 : 14)}px ${large ? 54 : 30}px rgba(0,0,0,.42)`
        }}
      >
        {hasVideo ? (
          <video
            key={videoSrc}
            className="dish3d-img"
            src={videoSrc}
            autoPlay
            muted
            playsInline
            loop={clips.length === 0}
            onEnded={clips.length > 1 ? () => setClipIndex((index) => (index + 1) % clips.length) : undefined}
            onError={() => setVideoFailed(true)}
          />
        ) : showImage ? (
          <img src={src} alt={dish.name} className="dish3d-img" draggable={false} onError={() => setFailed(true)} />
        ) : (
          <div
            className="dish3d-plate"
            style={{
              background:
                `radial-gradient(115% 90% at 32% 24%, ${dish.hue}dd 0%, ${dish.hue}66 38%, #171716 76%),` +
                "radial-gradient(70% 50% at 70% 78%, rgba(0,0,0,.45), rgba(0,0,0,0) 64%)"
            }}
          >
            <span className="dish3d-native">{dish.nativeName ?? dish.category}</span>
            <span className="dish3d-label">photo ready</span>
          </div>
        )}
        <div
          className="dish3d-shine"
          style={{
            background: `radial-gradient(circle at ${state.mx}% ${state.my}%, rgba(255,244,222,.42) 0%, rgba(255,255,255,0) 48%)`,
            opacity: state.active ? 1 : 0.4
          }}
        />
        <div className="dish3d-rim" />
      </div>

      {showSteam && (
        <div className="dish3d-steam" aria-hidden>
          <div className="dish3d-steam-parallax" style={{ transform: `translate(${-state.ry * 1.3}px, ${state.rx * 0.8}px)` }}>
            <div className="dish3d-steam-plume" />
          </div>
        </div>
      )}

      {hotspots.length > 0 && (
        <div className="dish3d-hotspots">
          {hotspots.map((hotspot) => (
            <button
              key={hotspot.id}
              type="button"
              className={`dish3d-hotspot ${openHotspot === hotspot.id ? "open" : ""}`}
              style={{ left: `${hotspot.x * 100}%`, top: `${hotspot.y * 100}%` }}
              aria-label={`${hotspot.label}${hotspot.allergen ? `, contains ${ALLERGEN_LABEL[hotspot.allergen]}` : ""}`}
              aria-expanded={openHotspot === hotspot.id}
              onClick={(event) => {
                event.stopPropagation();
                setOpenHotspot((current) => (current === hotspot.id ? null : hotspot.id));
              }}
            >
              <span className="dish3d-hotspot-ring" aria-hidden />
            </button>
          ))}
        </div>
      )}

      {activeHotspot && (
        <div
          className={`dish3d-pop ${activeHotspot.y > 0.55 ? "above" : "below"}`}
          style={{ left: `${Math.min(82, Math.max(18, activeHotspot.x * 100))}%`, top: `${activeHotspot.y * 100}%` }}
          role="dialog"
          aria-label={activeHotspot.label}
        >
          <button
            type="button"
            className="dish3d-pop-close"
            onClick={() => setOpenHotspot(null)}
            aria-label="Close ingredient detail"
          >
            <X size={13} />
          </button>
          {activeHotspot.macroUrl && (
            <img className="dish3d-pop-thumb" src={activeHotspot.macroUrl} alt={activeHotspot.label} draggable={false} />
          )}
          <strong>{t(activeHotspot.label)}</strong>
          {activeHotspot.allergen && (
            <span className="dish3d-pop-allergen">
              {locale === "ja"
                ? `${t(ALLERGEN_LABEL[activeHotspot.allergen])}を含む`
                : `Contains ${ALLERGEN_LABEL[activeHotspot.allergen]}`}
            </span>
          )}
          <p>{t(activeHotspot.note)}</p>
        </div>
      )}
    </div>
  );
}
