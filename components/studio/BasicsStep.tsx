"use client";

import { Field } from "@/components/studio/controls";
import { slugify, type RestaurantDraft } from "@/lib/studio/draft";
import { CURRENCY_OPTIONS, currencyForCuisine } from "@/lib/menu/currency";

export function BasicsStep({
  draft,
  patch
}: {
  draft: RestaurantDraft;
  patch: (partial: Partial<RestaurantDraft>) => void;
}) {
  const previewSlug = slugify(draft.name) || "your-restaurant";

  return (
    <div className="studio-form">
      <div className="product-grid">
        <Field label="Restaurant name" required>
          <input value={draft.name} onChange={(event) => patch({ name: event.target.value })} placeholder="e.g. Hinoki" />
        </Field>
        <Field label="Owner username" required hint="How you sign in to manage this menu">
          <input
            value={draft.username}
            onChange={(event) => patch({ username: event.target.value })}
            placeholder="e.g. hinoki-team"
          />
        </Field>
      </div>

      <div className="product-grid">
        <Field label="Cuisine">
          <input
            value={draft.cuisine}
            onChange={(event) => patch({ cuisine: event.target.value, currency: currencyForCuisine(event.target.value) })}
            placeholder="e.g. Tokyo Izakaya"
          />
        </Field>
        <Field label="Menu currency" hint="What prices on your menu are in">
          <select value={draft.currency} onChange={(event) => patch({ currency: event.target.value })}>
            {CURRENCY_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="City">
          <input value={draft.city} onChange={(event) => patch({ city: event.target.value })} placeholder="e.g. London" />
        </Field>
        <Field label="Service style">
          <input
            value={draft.serviceStyle}
            onChange={(event) => patch({ serviceStyle: event.target.value })}
            placeholder="e.g. Charcoal & sushi counter"
          />
        </Field>
      </div>

      <Field label="Welcome line" hint="The first thing diners read when they scan the table">
        <input
          value={draft.welcomeLine}
          onChange={(event) => patch({ welcomeLine: event.target.value })}
          placeholder="Charcoal, sushi, and a bowl that remembers you."
        />
      </Field>

      <p className="studio-slug-preview">
        Diner link will be <strong>/r/{previewSlug}</strong>
      </p>
    </div>
  );
}
