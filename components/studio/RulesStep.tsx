"use client";

import { EXCLUSION_OPTIONS, type RestaurantDraft } from "@/lib/studio/draft";
import type { ExclusionPolicy } from "@/lib/types";

export function RulesStep({
  draft,
  patch
}: {
  draft: RestaurantDraft;
  patch: (partial: Partial<RestaurantDraft>) => void;
}) {
  const flaggedCount = draft.items.filter((item) => item.name.trim() && item.allowExclusions).length;

  return (
    <div className="studio-form">
      <div>
        <h3 className="studio-subhead">Ingredient exclusions</h3>
        <p className="studio-hint-line">Can diners ask to leave ingredients out of a dish?</p>
      </div>

      <div className="rule-options">
        {EXCLUSION_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`rule-option ${draft.exclusionPolicy === option.key ? "selected" : ""}`}
            aria-pressed={draft.exclusionPolicy === option.key}
            onClick={() => patch({ exclusionPolicy: option.key as ExclusionPolicy })}
          >
            <strong>{option.label}</strong>
            <span>{option.hint}</span>
          </button>
        ))}
      </div>

      {draft.exclusionPolicy === "some" && (
        <p className="studio-hint-line">
          {flaggedCount > 0
            ? `${flaggedCount} dish${flaggedCount > 1 ? "es" : ""} flagged for swaps. Toggle more on each dish in the Products step.`
            : "No dishes flagged yet — turn on “Allow ingredient swaps” on individual dishes in the Products step."}
        </p>
      )}
    </div>
  );
}
