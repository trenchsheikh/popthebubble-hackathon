import { conflicts } from "@/lib/conflicts";
import type { DinerProfile, MenuItem } from "@/lib/types";

export type NudgeTone = "info" | "warn" | "good";

// An optional one-tap action that attaches a kitchen request to the cart line.
export type NudgeAction = { label: string; request: string };

export type Nudge = {
  id: string;
  tone: NudgeTone;
  message: string;
  action?: NudgeAction;
};

const SPICE_WORD = ["mild", "medium", "hot", "fiery"];

// Memory-aware nudges: compares a dish against the diner's saved profile and
// surfaces gentle prompts at add-to-cart time. Safety conflicts come from the
// deterministic filter (never the model). Actionable nudges produce a request
// the kitchen receives with the order.
export function getNudges(dish: MenuItem, profile: DinerProfile): Nudge[] {
  const nudges: Nudge[] = [];

  // Safety / diet conflict — reinforce the deterministic flag at the moment of ordering.
  const dishConflicts = conflicts(dish, profile);
  if (dishConflicts.length > 0) {
    nudges.push({
      id: "conflict",
      tone: "warn",
      message: `Heads up — ${dishConflicts.join(", ").toLowerCase()}. This clashes with your saved profile.`
    });
  }

  // Spice hotter than they usually go → offer to dial it down.
  if (dish.spice > profile.spice && dish.spice > 0) {
    nudges.push({
      id: "spice-down",
      tone: "info",
      message: `This runs ${SPICE_WORD[dish.spice]} — hotter than your usual ${SPICE_WORD[profile.spice]}.`,
      action: { label: "Request less spice", request: "Less spice, please" }
    });
  }

  // They like it hot but this dish is mild → offer extra heat.
  if (profile.spice >= 2 && dish.spice > 0 && dish.spice < profile.spice) {
    nudges.push({
      id: "spice-up",
      tone: "info",
      message: `Milder than you usually like. Want it with more kick?`,
      action: { label: "Ask for extra heat", request: "Extra spicy, please" }
    });
  }

  // Previously disliked.
  if (profile.dislikes.includes(dish.id)) {
    nudges.push({
      id: "disliked",
      tone: "warn",
      message: "You weren't keen on this last time — sure you want it again?"
    });
  }

  // A known favourite — positive reinforcement.
  if (profile.likes.includes(dish.id)) {
    nudges.push({ id: "liked", tone: "good", message: "One of your favourites — nice choice." });
  }

  // Low adventure meeting an adventurous dish.
  if (profile.adventure === 0 && dish.tags.includes("adventurous")) {
    nudges.push({
      id: "adventurous",
      tone: "info",
      message: `${dish.name} is a bold, less-familiar pick. The concierge can talk you through it.`
    });
  }

  return nudges;
}
