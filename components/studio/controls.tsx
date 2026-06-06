"use client";

import { useRef, useState, type ReactNode } from "react";
import { UploadCloud } from "lucide-react";

export function Field({
  label,
  hint,
  required,
  children
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="studio-field">
      <span className="studio-field-label">
        {label}
        {required && <em> *</em>}
      </span>
      {children}
      {hint && <span className="studio-field-hint">{hint}</span>}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button type="button" className={`studio-toggle ${on ? "on" : ""}`} onClick={() => onChange(!on)} aria-pressed={on}>
      <span>{label}</span>
      <span className="studio-toggle-track" aria-hidden>
        <span className="studio-toggle-dot" />
      </span>
    </button>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="studio-seg" role="group">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          className={value === option.value ? "active" : ""}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Dropzone({
  label,
  hint,
  multiple,
  busy,
  onFiles
}: {
  label: string;
  hint: string;
  multiple?: boolean;
  busy?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [over, setOver] = useState(false);

  function handle(list: FileList | null) {
    if (!list) return;
    const files = [...list].filter((file) => file.type.startsWith("image/"));
    if (files.length) onFiles(files);
  }

  return (
    <div
      className={`dropzone ${over ? "over" : ""} ${busy ? "busy" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        handle(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={(event) => {
          handle(event.target.files);
          event.target.value = "";
        }}
      />
      <UploadCloud size={20} />
      <strong>{busy ? "Processing…" : label}</strong>
      <span>{hint}</span>
    </div>
  );
}
