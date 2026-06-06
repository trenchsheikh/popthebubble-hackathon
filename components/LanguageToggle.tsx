"use client";

import { useLocale } from "@/lib/i18n";

// Compact EN / 日本語 switch pinned top-right. Switches the whole diner UI.
export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button
        type="button"
        className={locale === "en" ? "active" : ""}
        aria-pressed={locale === "en"}
        onClick={() => setLocale("en")}
      >
        EN
      </button>
      <button
        type="button"
        lang="ja"
        className={locale === "ja" ? "active" : ""}
        aria-pressed={locale === "ja"}
        onClick={() => setLocale("ja")}
      >
        日本語
      </button>
    </div>
  );
}
