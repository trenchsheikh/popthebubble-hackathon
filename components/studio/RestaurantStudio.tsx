"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

export function RestaurantStudio({ ownerEmail }: { ownerEmail?: string } = {}) {
  const [draft, setDraft] = useState<RestaurantDraft>(emptyDraft);
  const [step, setStep] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<PublishResult | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractNote, setExtractNote] = useState<string | null>(null);
  const [extractedOnce, setExtractedOnce] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  // Durable onboarding telemetry. Open a run on mount; each step logs against it.
  const runIdRef = useRef<string | null>(null);
  async function track(step: string, detail?: Record<string, unknown>) {
    const runId = runIdRef.current;
    if (!runId) return;
    try {
      await fetch("/api/studio/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, step, detail })
      });
    } catch {
      /* telemetry is best-effort */
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/studio/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start" })
        });
        const data = (await response.json()) as { runId?: string };
        if (active && data.runId) runIdRef.current = data.runId;
      } catch {
        /* best-effort */
      }
    })();
    // Prefill the owner handle from their sign-in email to reduce friction.
    if (ownerEmail) {
      setDraft((current) => (current.username ? current : { ...current, username: ownerEmail.split("@")[0] }));
    }
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    void track("ocr_started", { photos: draft.menuPhotos.length });
    try {
      const response = await fetch("/api/studio/extract-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: draft.menuPhotos.map((photo) => photo.dataUrl) })
      });
      const data = (await response.json()) as {
        configured?: boolean;
        items?: ExtractedDish[];
        model?: string;
        ms?: number;
        truncated?: boolean;
        error?: string;
      };
      const items = Array.isArray(data.items) ? data.items : [];
      const hasNative = items.some((dish) => /[㐀-鿿぀-ヿ]/.test(dish.nativeName || ""));
      void track("ocr_completed", {
        dishCount: items.length,
        ok: items.length > 0,
        truncated: Boolean(data.truncated),
        model: data.model,
        ms: data.ms,
        languages: hasNative ? ["native", "en"] : ["en"]
      });
      if (response.ok && items.length > 0) {
        setDraft((current) => ({ ...current, items: items.map(draftItemFromExtracted) }));
        setExtractNote(
          data.truncated
            ? `Read ${items.length} dishes — that's a big menu, so a few at the end may be missing. Scroll down to check and add any.`
            : `Read ${items.length} dish${items.length > 1 ? "es" : ""} from your menu — review and tweak below.`
        );
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
    if (step === 0) void track("basics_completed", { name: draft.name.trim(), cuisine: draft.cuisine.trim() });
    if (step === MENU_STEP && draft.menuPhotos.length > 0) {
      void track("photos_uploaded", { count: draft.menuPhotos.length });
      if (!extractedOnce) await extractFromMenu();
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
    setUploadProgress(null);
    try {
      // Phase 1 — publish TEXT only (small payload). Dish photos are uploaded
      // separately below so we never exceed the platform request-size limit.
      const named = draft.items.filter((item) => item.name.trim());
      const lightItems = named.map((item) => ({ ...item, photoDataUrl: undefined }));
      const photos = named
        .map((item, index) => ({ dataUrl: item.photoDataUrl, index }))
        .filter((entry): entry is { dataUrl: string; index: number } => Boolean(entry.dataUrl));

      const response = await fetch("/api/studio/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          menuPhotos: [],
          items: lightItems,
          photoCount: photos.length,
          runId: runIdRef.current
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(typeof data?.error === "string" ? data.error : "Could not publish your menu.");
        return;
      }

      // Phase 2 — upload each dish photo to its menu item, a few at a time, with
      // progress. One bad image never blocks going live.
      const itemIds: string[] = Array.isArray(data.itemIds) ? data.itemIds : [];
      const uploads = photos
        .map((photo) => ({ dataUrl: photo.dataUrl, itemId: itemIds[photo.index] }))
        .filter((upload) => Boolean(upload.itemId));
      if (uploads.length > 0) {
        setUploadProgress({ done: 0, total: uploads.length });
        let done = 0;
        const CONCURRENCY = 4;
        for (let i = 0; i < uploads.length; i += CONCURRENCY) {
          await Promise.all(
            uploads.slice(i, i + CONCURRENCY).map(async (upload) => {
              try {
                await fetch("/api/studio/upload-image", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ restaurantId: data.restaurantId, itemId: upload.itemId, dataUrl: upload.dataUrl })
                });
              } catch {
                /* skip a failed image — the dish just shows the gradient placeholder */
              } finally {
                done += 1;
                setUploadProgress({ done, total: uploads.length });
              }
            })
          );
        }
      }

      setPublished({ slug: data.slug, url: data.url, itemCount: data.itemCount });
    } catch {
      setError("Network error while publishing. Please try again.");
    } finally {
      setPublishing(false);
      setUploadProgress(null);
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
              currency={draft.currency}
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
            {uploadProgress
              ? `Uploading photos ${uploadProgress.done}/${uploadProgress.total}…`
              : publishing
                ? "Publishing…"
                : "Publish menu"}
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
