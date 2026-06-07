"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, Plus } from "lucide-react";
import { ProductEditor } from "@/components/studio/ProductEditor";
import type { DraftMenuItem } from "@/lib/studio/draft";
import type { ExclusionPolicy, MenuPhoto } from "@/lib/types";

export function ProductsStep({
  items,
  menuPhotos,
  categories,
  exclusionPolicy,
  currency,
  onUpdateItem,
  onAddItem,
  onRemoveItem
}: {
  items: DraftMenuItem[];
  menuPhotos: MenuPhoto[];
  categories: string[];
  exclusionPolicy: ExclusionPolicy;
  currency: string;
  onUpdateItem: (id: string, partial: Partial<DraftMenuItem>) => void;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
}) {
  const [showReference, setShowReference] = useState(true);
  // Review one dish at a time rather than a long wall of forms.
  const [current, setCurrent] = useState(0);

  // Keep the cursor in range as dishes are added/removed.
  useEffect(() => {
    if (current > items.length - 1) setCurrent(Math.max(0, items.length - 1));
  }, [items.length, current]);

  const index = Math.min(current, items.length - 1);
  const item = items[index];

  function addAndShow() {
    onAddItem();
    setCurrent(items.length); // jump to the new (last) dish
  }

  function removeCurrent() {
    onRemoveItem(item.id);
    setCurrent((value) => Math.max(0, Math.min(value, items.length - 2)));
  }

  return (
    <div className="studio-form">
      {menuPhotos.length > 0 && (
        <div className="reference-strip">
          <button type="button" className="reference-toggle" onClick={() => setShowReference((value) => !value)}>
            <ImageIcon size={15} />
            {showReference ? "Hide" : "Show"} menu reference ({menuPhotos.length})
          </button>
          {showReference && (
            <div className="reference-thumbs">
              {menuPhotos.map((photo) => (
                <a key={photo.id} href={photo.dataUrl} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.dataUrl} alt={photo.name} />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="product-pager">
        <button type="button" className="icon-button" onClick={() => setCurrent((v) => Math.max(0, v - 1))} disabled={index === 0} aria-label="Previous dish">
          <ChevronLeft size={18} />
        </button>
        <span className="product-pager-count">Dish {index + 1} of {items.length}</span>
        <button type="button" className="icon-button" onClick={() => setCurrent((v) => Math.min(items.length - 1, v + 1))} disabled={index >= items.length - 1} aria-label="Next dish">
          <ChevronRight size={18} />
        </button>
      </div>

      {item && (
        <ProductEditor
          key={item.id}
          item={item}
          index={index}
          categories={categories}
          exclusionPolicy={exclusionPolicy}
          currency={currency}
          onChange={(partial) => onUpdateItem(item.id, partial)}
          onRemove={removeCurrent}
          canRemove={items.length > 1}
        />
      )}

      <div className="product-pager-actions">
        {index < items.length - 1 ? (
          <button type="button" className="ghost-button" onClick={() => setCurrent((v) => v + 1)}>
            Next dish
            <ChevronRight size={16} />
          </button>
        ) : (
          <button type="button" className="studio-add" onClick={addAndShow}>
            <Plus size={16} />
            Add another dish
          </button>
        )}
      </div>
    </div>
  );
}
