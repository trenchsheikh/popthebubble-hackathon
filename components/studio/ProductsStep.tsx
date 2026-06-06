"use client";

import { useState } from "react";
import { ImageIcon, Plus } from "lucide-react";
import { ProductEditor } from "@/components/studio/ProductEditor";
import type { DraftMenuItem } from "@/lib/studio/draft";
import type { ExclusionPolicy, MenuPhoto } from "@/lib/types";

export function ProductsStep({
  items,
  menuPhotos,
  categories,
  exclusionPolicy,
  onUpdateItem,
  onAddItem,
  onRemoveItem
}: {
  items: DraftMenuItem[];
  menuPhotos: MenuPhoto[];
  categories: string[];
  exclusionPolicy: ExclusionPolicy;
  onUpdateItem: (id: string, partial: Partial<DraftMenuItem>) => void;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
}) {
  const [showReference, setShowReference] = useState(true);

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

      <div className="product-list">
        {items.map((item, index) => (
          <ProductEditor
            key={item.id}
            item={item}
            index={index}
            categories={categories}
            exclusionPolicy={exclusionPolicy}
            onChange={(partial) => onUpdateItem(item.id, partial)}
            onRemove={() => onRemoveItem(item.id)}
            canRemove={items.length > 1}
          />
        ))}
      </div>

      <button type="button" className="studio-add" onClick={onAddItem}>
        <Plus size={16} />
        Add another dish
      </button>
    </div>
  );
}
