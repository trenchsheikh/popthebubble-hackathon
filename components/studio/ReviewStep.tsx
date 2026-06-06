"use client";

import { AlertTriangle, Check } from "lucide-react";
import { EXCLUSION_OPTIONS, validateDraft, type RestaurantDraft } from "@/lib/studio/draft";

export function ReviewStep({ draft }: { draft: RestaurantDraft }) {
  const named = draft.items.filter((item) => item.name.trim());
  const validation = validateDraft(draft);
  const policyLabel = EXCLUSION_OPTIONS.find((option) => option.key === draft.exclusionPolicy)?.label ?? draft.exclusionPolicy;
  const withPhotos = named.filter((item) => item.photoDataUrl).length;

  const categories = named.reduce<Record<string, number>>((acc, item) => {
    const key = item.category.trim() || "Uncategorised";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="studio-form">
      <div className="review-grid">
        <ReviewStat label="Restaurant" value={draft.name.trim() || "—"} />
        <ReviewStat label="Owner" value={draft.username.trim() || "—"} />
        <ReviewStat label="Dishes" value={String(named.length)} />
        <ReviewStat label="Dish photos" value={`${withPhotos}/${named.length}`} />
        <ReviewStat label="Menu snapshots" value={String(draft.menuPhotos.length)} />
        <ReviewStat label="Exclusions" value={policyLabel} />
      </div>

      <div className="review-sections">
        <span className="studio-field-label">Sections</span>
        <div className="review-section-chips">
          {Object.entries(categories).map(([category, count]) => (
            <span key={category} className="review-section-chip">
              {category} · {count}
            </span>
          ))}
          {Object.keys(categories).length === 0 && <span className="studio-hint-line">No dishes yet.</span>}
        </div>
      </div>

      {validation.ok ? (
        <div className="review-status ok">
          <Check size={16} />
          Ready to publish. Diners can scan in as soon as you go live.
        </div>
      ) : (
        <div className="review-status warn">
          <AlertTriangle size={16} />
          {validation.message}
        </div>
      )}
    </div>
  );
}

function ReviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="review-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
