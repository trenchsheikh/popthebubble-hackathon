"use client";

import { useState } from "react";
import { Flame, Trash2, X } from "lucide-react";
import { Dropzone, Field, Segmented, Toggle } from "@/components/studio/controls";
import { ALLERGEN_OPTIONS, SPICE_LABELS, type DraftMenuItem } from "@/lib/studio/draft";
import { fileToDownscaledDataUrl } from "@/lib/studio/image";
import type { Allergen, ExclusionPolicy } from "@/lib/types";

const SPICE_OPTIONS = SPICE_LABELS.map((label, index) => ({
  value: index as 0 | 1 | 2 | 3,
  label: index === 0 ? label : (
    <span className="spice-pips">
      {Array.from({ length: index }).map((_, pip) => (
        <Flame key={pip} size={12} />
      ))}
    </span>
  )
}));

export function ProductEditor({
  item,
  index,
  categories,
  exclusionPolicy,
  onChange,
  onRemove,
  canRemove
}: {
  item: DraftMenuItem;
  index: number;
  categories: string[];
  exclusionPolicy: ExclusionPolicy;
  onChange: (partial: Partial<DraftMenuItem>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [photoBusy, setPhotoBusy] = useState(false);

  function toggleAllergen(allergen: Allergen) {
    onChange({
      contains: item.contains.includes(allergen)
        ? item.contains.filter((entry) => entry !== allergen)
        : [...item.contains, allergen]
    });
  }

  async function handlePhoto(files: File[]) {
    const file = files[0];
    if (!file) return;
    setPhotoBusy(true);
    try {
      const dataUrl = await fileToDownscaledDataUrl(file);
      onChange({ photoDataUrl: dataUrl });
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <div className="product-editor">
      <div className="product-editor-head">
        <span className="product-index">{String(index + 1).padStart(2, "0")}</span>
        <strong>{item.name.trim() || "New dish"}</strong>
        {canRemove && (
          <button type="button" className="product-remove" onClick={onRemove} aria-label="Remove dish">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="product-grid">
        <Field label="Dish name" required>
          <input value={item.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="e.g. Spicy Tuna Roll" />
        </Field>
        <Field label="Section" required hint="Groups the dish on the menu">
          <input
            value={item.category}
            list="studio-categories"
            onChange={(event) => onChange({ category: event.target.value })}
            placeholder="e.g. Sushi"
          />
        </Field>
        <Field label="Price (£)" required>
          <input
            value={item.price}
            inputMode="decimal"
            onChange={(event) => onChange({ price: event.target.value })}
            placeholder="9.00"
          />
        </Field>
      </div>

      <datalist id="studio-categories">
        {categories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>

      <Field label="Spice level">
        <Segmented value={item.spice} options={SPICE_OPTIONS} onChange={(spice) => onChange({ spice })} />
      </Field>

      <div className="product-toggles">
        <Toggle on={item.vegetarian} label="Vegetarian" onChange={(on) => onChange({ vegetarian: on })} />
        <Toggle on={item.vegan} label="Vegan" onChange={(on) => onChange({ vegan: on, vegetarian: on ? true : item.vegetarian })} />
      </div>

      <Field label="Contains" hint="Allergens locked out for diners who flag them">
        <div className="allergen-chips">
          {ALLERGEN_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`allergen-chip ${item.contains.includes(option.key) ? "on" : ""}`}
              aria-pressed={item.contains.includes(option.key)}
              onClick={() => toggleAllergen(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Notes & exceptions" hint="Shown to diners — e.g. “can be made mild”, “contains traces of nuts”">
        <textarea
          value={item.notes}
          rows={2}
          onChange={(event) => onChange({ notes: event.target.value })}
          placeholder="Anything special about this dish…"
        />
      </Field>

      {exclusionPolicy === "some" && (
        <Toggle
          on={item.allowExclusions}
          label="Allow ingredient swaps on this dish"
          onChange={(on) => onChange({ allowExclusions: on })}
        />
      )}

      {(exclusionPolicy === "all" || (exclusionPolicy === "some" && item.allowExclusions)) && (
        <Field label="Removable on request" hint="Comma-separated — e.g. onions, garlic, chilli">
          <input
            value={item.removable}
            onChange={(event) => onChange({ removable: event.target.value })}
            placeholder="onions, garlic"
          />
        </Field>
      )}

      <Field label="Dish photo" hint="Optional — shown on the diner menu">
        {item.photoDataUrl ? (
          <div className="product-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.photoDataUrl} alt={item.name || "dish photo"} />
            <button type="button" onClick={() => onChange({ photoDataUrl: undefined })} aria-label="Remove photo">
              <X size={14} />
            </button>
          </div>
        ) : (
          <Dropzone label="Add a dish photo" hint="Drag in or tap to upload" busy={photoBusy} onFiles={handlePhoto} />
        )}
      </Field>
    </div>
  );
}
