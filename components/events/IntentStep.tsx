"use client";

import { useState } from "react";
import { Disc3, Film, Laugh, Mic, Music, Palette, Sparkles, Trophy } from "lucide-react";
import type { ComponentType } from "react";
import { useVoiceInput } from "@/lib/useVoiceInput";
import { useT } from "@/lib/i18n";
import type { BudgetTier, EventIntent, EventKindTag, GroupType } from "@/lib/events/types";

const GROUPS: { key: GroupType; label: string }[] = [
  { key: "solo", label: "Just me" },
  { key: "couple", label: "Date night" },
  { key: "group", label: "With friends" }
];

const VIBES: { key: EventKindTag; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { key: "comedy", label: "Comedy", Icon: Laugh },
  { key: "music", label: "Live music", Icon: Music },
  { key: "nightlife", label: "Nightlife", Icon: Disc3 },
  { key: "arts", label: "Arts", Icon: Palette },
  { key: "film", label: "Film", Icon: Film },
  { key: "sports", label: "Sport", Icon: Trophy }
];

const BUDGETS: { key: BudgetTier; label: string }[] = [
  { key: "low", label: "Easy" },
  { key: "mid", label: "Standard" },
  { key: "high", label: "Treat" }
];

export function IntentStep({
  initialVibes,
  onSubmit,
  busy
}: {
  initialVibes: EventKindTag[];
  onSubmit: (intent: EventIntent) => void;
  busy: boolean;
}) {
  const [group, setGroup] = useState<GroupType>("couple");
  const [vibes, setVibes] = useState<EventKindTag[]>(initialVibes);
  const [budget, setBudget] = useState<BudgetTier>("mid");
  const [showText, setShowText] = useState(false);
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const t = useT();

  const { supported, listening, toggle } = useVoiceInput((transcript) => setText(transcript));

  const toggleVibe = (key: EventKindTag) =>
    setVibes((current) => (current.includes(key) ? current.filter((vibe) => vibe !== key) : [...current, key]));

  async function submitText() {
    if (!text.trim()) return;
    setParsing(true);
    try {
      const response = await fetch("/api/events/parse-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const data = (await response.json()) as { ok: boolean; intent?: EventIntent };
      if (data.ok && data.intent) {
        onSubmit(data.intent);
        return;
      }
    } catch {
      // fall through to tap selection
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="intent-step">
      <div className="question-block">
        <p className="eyebrow">{t("After dinner")}</p>
        <h2>{t("Make a night of it?")}</h2>
      </div>

      <section className="intent-group">
        <p className="intent-label">{t("Who's coming?")}</p>
        <div className="choice-grid">
          {GROUPS.map((option) => (
            <button
              key={option.key}
              className={`choice ${group === option.key ? "selected" : ""}`}
              onClick={() => setGroup(option.key)}
            >
              {t(option.label)}
            </button>
          ))}
        </div>
      </section>

      <section className="intent-group">
        <p className="intent-label">{t("What sounds good?")}</p>
        <div className="choice-grid intent-vibes">
          {VIBES.map(({ key, label, Icon }) => (
            <button
              key={key}
              className={`choice ${vibes.includes(key) ? "selected" : ""}`}
              onClick={() => toggleVibe(key)}
            >
              <Icon size={15} />
              {t(label)}
            </button>
          ))}
        </div>
      </section>

      <section className="intent-group">
        <p className="intent-label">{t("Budget")}</p>
        <div className="studio-seg intent-budget">
          {BUDGETS.map((option) => (
            <button
              key={option.key}
              className={budget === option.key ? "active" : ""}
              onClick={() => setBudget(option.key)}
            >
              {t(option.label)}
            </button>
          ))}
        </div>
      </section>

      {showText ? (
        <section className="intent-group intent-text">
          <p className="intent-label">{t("Tell us in your words")}</p>
          <div className="intent-text-row">
            {supported && (
              <button
                type="button"
                className={`mic-button ${listening ? "live" : ""}`}
                onClick={toggle}
                aria-pressed={listening}
                aria-label={listening ? "Stop voice input" : "Start voice input"}
              >
                <Mic size={18} />
              </button>
            )}
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("e.g. something funny and low-key for two…")}
              rows={2}
            />
          </div>
          <button className="ghost-button" onClick={submitText} disabled={parsing || !text.trim()}>
            {parsing ? t("Reading…") : t("Use this")}
          </button>
        </section>
      ) : (
        <button className="intent-text-toggle" onClick={() => setShowText(true)}>
          <Sparkles size={14} /> {t("Or just tell us →")}
        </button>
      )}

      <button
        className="primary-button docked-button"
        onClick={() => onSubmit({ group, vibes, budget })}
        disabled={busy || parsing}
      >
        {busy ? t("Finding events…") : t("Find tonight's events")}
      </button>
    </div>
  );
}
