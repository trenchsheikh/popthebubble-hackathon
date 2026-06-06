"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Dropzone } from "@/components/studio/controls";
import { draftId } from "@/lib/studio/draft";
import { fileToDownscaledDataUrl } from "@/lib/studio/image";
import type { MenuPhoto } from "@/lib/types";

export function MenuPhotosStep({
  photos,
  onChange
}: {
  photos: MenuPhoto[];
  onChange: (photos: MenuPhoto[]) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: File[]) {
    setBusy(true);
    try {
      const added: MenuPhoto[] = [];
      for (const file of files) {
        const dataUrl = await fileToDownscaledDataUrl(file);
        added.push({ id: draftId("photo"), name: file.name, dataUrl });
      }
      onChange([...photos, ...added].slice(0, 8));
    } finally {
      setBusy(false);
    }
  }

  function remove(id: string) {
    onChange(photos.filter((photo) => photo.id !== id));
  }

  return (
    <div className="studio-form">
      <Dropzone
        label="Upload photos of your menu"
        hint="Snap your printed or written menu — drag in or tap. Up to 8."
        multiple
        busy={busy}
        onFiles={handleFiles}
      />

      {photos.length > 0 && (
        <div className="menu-photo-grid">
          {photos.map((photo) => (
            <div key={photo.id} className="menu-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.dataUrl} alt={photo.name} />
              <button type="button" onClick={() => remove(photo.id)} aria-label={`Remove ${photo.name}`}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="studio-hint-line">
        These stay as a reference for your team while you add dishes in the next step. You can skip this and add dishes
        directly.
      </p>
    </div>
  );
}
