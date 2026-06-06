"use client";

import { useState } from "react";
import { X } from "lucide-react";

// Small circular QR widget pinned bottom-left. Tapping it opens a centred
// pop-up with the full-size code. Image lives at /public/QR/code.jpg.
export function QrWidget({ src = "/QR/code.jpg" }: { src?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="qr-fab" onClick={() => setOpen(true)} aria-label="Show QR code">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="QR code" draggable={false} />
      </button>

      {open && (
        <div
          className="qr-modal"
          role="dialog"
          aria-modal="true"
          aria-label="QR code"
          onClick={() => setOpen(false)}
        >
          <div className="qr-modal-card" onClick={(event) => event.stopPropagation()}>
            <button className="qr-modal-close" onClick={() => setOpen(false)} aria-label="Close">
              <X size={18} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="Scan this QR code" draggable={false} />
            <p>Scan now</p>
          </div>
        </div>
      )}
    </>
  );
}
