"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { BasicsStep } from "@/components/studio/BasicsStep";
import { MenuPhotosStep } from "@/components/studio/MenuPhotosStep";
import { ProductsStep } from "@/components/studio/ProductsStep";
import { ReviewStep } from "@/components/studio/ReviewStep";
import { PublishedScreen, type PublishResult } from "@/components/studio/PublishedScreen";
import {
  draftItemFromExtracted,
  emptyDraft,
  emptyDraftItem,
  validateDraft,
  type DraftMenuItem,
  type ExtractedDish,
  type RestaurantDraft
} from "@/lib/studio/draft";
import type { MenuPhoto } from "@/lib/types";

const MENU_STEP = 1;

const STEPS = [
  { title: "Tell us about your place", subtitle: "The basics diners see when they sit down." },
  { title: "Upload your menu", subtitle: "Snap or upload your menu — we read the dishes for you." },
  { title: "Review your dishes", subtitle: "Pulled from your menu. Check the details and add a photo for each." },
  { title: "Review & publish", subtitle: "One last look before you go live." }
] as const;

export function RestaurantStudio() {
  const [draft, setDraft] = useState<RestaurantDraft>(emptyDraft);
  const [step, setStep] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<PublishResult | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractNote, setExtractNote] = useState<string | null>(null);
  const [extractedOnce, setExtractedOnce] = useState(false);

  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const item of draft.items) {
      const category = item.category.trim();
      if (category && !seen.includes(category)) seen.push(category);
    }
    return seen;
  }, [draft.items]);

  function patch(partial: Partial<RestaurantDraft>) {
    setDraft((current) => ({ ...current, ...partial }));
    setError(null);
  }

  function updateItem(id: string, partial: Partial<DraftMenuItem>) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, ...partial } : item))
    }));
  }

  function addItem() {
    setDraft((current) => ({ ...current, items: [...current.items, emptyDraftItem()] }));
  }

  function removeItem(id: string) {
    setDraft((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }));
  }

  function setMenuPhotos(photos: MenuPhoto[]) {
    patch({ menuPhotos: photos });
  }

  // Read dishes from the uploaded menu photos via OCR/vision, then prefill the
  // dish list. Best-effort: on failure or no result we keep manual entry.
  async function extractFromMenu() {
    setExtracting(true);
    setExtractNote(null);
    try {
      const response = await fetch("/api/studio/extract-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: draft.menuPhotos.map((photo) => photo.dataUrl) })
      });
      const data = (await response.json()) as { configured?: boolean; items?: ExtractedDish[]; error?: string };
      const items = Array.isArray(data.items) ? data.items : [];
      if (response.ok && items.length > 0) {
        setDraft((current) => ({ ...current, items: items.map(draftItemFromExtracted) }));
        setExtractNote(`Read ${items.length} dish${items.length > 1 ? "es" : ""} from your menu — review and tweak below.`);
      } else if (response.ok && data.configured) {
        setExtractNote("We couldn't read dishes from those photos — add them manually below.");
      } else if (response.ok) {
        setExtractNote("Menu reader is off — add your dishes manually below.");
      } else {
        setExtractNote(data.error ?? "Couldn't read the menu — add your dishes manually below.");
      }
    } catch {
      setExtractNote("Couldn't reach the menu reader — add your dishes manually below.");
    } finally {
      setExtractedOnce(true);
      setExtracting(false);
    }
  }

  async function goNext() {
    if (step === MENU_STEP && !extractedOnce && draft.menuPhotos.length > 0) {
      await extractFromMenu();
    }
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  }

  async function publish() {
    const validation = validateDraft(draft);
    if (!validation.ok) {
      setError(validation.message);
      setStep(STEPS.length - 1);
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      const response = await fetch("/api/studio/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const data = await response.json();
      if (!response.ok) {
        setError(typeof data?.error === "string" ? data.error : "Could not publish your menu.");
        return;
      }
      setPublished({ slug: data.slug, url: data.url, itemCount: data.itemCount });
    } catch {
      setError("Network error while publishing. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  if (published) {
    return (
      <section className="studio-screen">
        <PublishedScreen result={published} restaurantName={draft.name.trim() || "Your restaurant"} />
      </section>
    );
  }

  const isLast = step === STEPS.length - 1;
  const meta = STEPS[step];

  return (
    <section className="studio-screen">
      <header className="studio-header">
        <div className="session-pill">
          <Sparkles size={14} />
          Restaurant studio
        </div>
        <div className="studio-progress" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((item, index) => (
            <span key={item.title} className={index <= step ? "active" : ""} />
          ))}
        </div>
        <h1>{meta.title}</h1>
        <p>{meta.subtitle}</p>
      </header>

      <div className="studio-body">
        {step === 0 && <BasicsStep draft={draft} patch={patch} />}
        {step === 1 && <MenuPhotosStep photos={draft.menuPhotos} onChange={setMenuPhotos} />}
        {step === 2 && (
          <>
            {extractNote && <p className="studio-extract-note">{extractNote}</p>}
            <ProductsStep
              items={draft.items}
              menuPhotos={draft.menuPhotos}
              categories={categories}
              exclusionPolicy={draft.exclusionPolicy}
              onUpdateItem={updateItem}
              onAddItem={addItem}
              onRemoveItem={removeItem}
            />
          </>
        )}
        {step === 3 && <ReviewStep draft={draft} />}
      </div>

      {error && <p className="studio-error">{error}</p>}

      <footer className="studio-footer">
        <button
          type="button"
          className="ghost-button"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0 || publishing || extracting}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        {isLast ? (
          <button type="button" className="primary-button" onClick={publish} disabled={publishing}>
            {publishing ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
            {publishing ? "Publishing…" : "Publish menu"}
          </button>
        ) : (
          <button type="button" className="primary-button" onClick={goNext} disabled={extracting}>
            {extracting ? (
              <>
                <Loader2 size={18} className="spin" />
                Reading your menu…
              </>
            ) : (
              <>
                Continue
                <ArrowRight size={18} />
              </>
            )}
          </button>
        )}
      </footer>
    </section>
  );
}
