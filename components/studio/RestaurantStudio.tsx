"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { BasicsStep } from "@/components/studio/BasicsStep";
import { MenuPhotosStep } from "@/components/studio/MenuPhotosStep";
import { ProductsStep } from "@/components/studio/ProductsStep";
import { RulesStep } from "@/components/studio/RulesStep";
import { ReviewStep } from "@/components/studio/ReviewStep";
import { PublishedScreen, type PublishResult } from "@/components/studio/PublishedScreen";
import {
  emptyDraft,
  emptyDraftItem,
  validateDraft,
  type DraftMenuItem,
  type RestaurantDraft
} from "@/lib/studio/draft";
import type { MenuPhoto } from "@/lib/types";

const STEPS = [
  { title: "Tell us about your place", subtitle: "The basics diners see when they sit down." },
  { title: "Upload your menu", subtitle: "Snapshots of your printed menu, kept as reference." },
  { title: "Add your dishes", subtitle: "Name, price, dietary info, photos and kitchen notes." },
  { title: "Set your rules", subtitle: "How flexible is the kitchen on changes?" },
  { title: "Review & publish", subtitle: "One last look before you go live." }
] as const;

export function RestaurantStudio() {
  const [draft, setDraft] = useState<RestaurantDraft>(emptyDraft);
  const [step, setStep] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<PublishResult | null>(null);

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
          <ProductsStep
            items={draft.items}
            menuPhotos={draft.menuPhotos}
            categories={categories}
            exclusionPolicy={draft.exclusionPolicy}
            onUpdateItem={updateItem}
            onAddItem={addItem}
            onRemoveItem={removeItem}
          />
        )}
        {step === 3 && <RulesStep draft={draft} patch={patch} />}
        {step === 4 && <ReviewStep draft={draft} />}
      </div>

      {error && <p className="studio-error">{error}</p>}

      <footer className="studio-footer">
        <button
          type="button"
          className="ghost-button"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0 || publishing}
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
          <button type="button" className="primary-button" onClick={() => setStep((current) => current + 1)}>
            Continue
            <ArrowRight size={18} />
          </button>
        )}
      </footer>
    </section>
  );
}
