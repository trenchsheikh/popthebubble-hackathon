import type { ServiceCall } from "@/lib/service/types";

// A deliberately simple, transparent "joy" signal for the dashboard. This is a
// HEURISTIC from observable activity, not a real sentiment measurement — label
// it as such in the UI. Real sentiment would need explicit diner ratings.

export type JoyLevel = "low" | "ok" | "great";

export type JoySignal = {
  level: JoyLevel;
  score: number;
  reasons: string[];
};

export function joyFor(input: { serviceCalls: ServiceCall[]; returning: boolean }): JoySignal {
  const reasons: string[] = [];
  let score = 0;

  if (input.serviceCalls.some((call) => call.kind === "order")) {
    score += 2;
    reasons.push("placing an order");
  }
  if (input.returning) {
    score += 1;
    reasons.push("returning guest");
  }
  // Only a general help request that's still open reads as friction; an "order"
  // call is a positive signal, not someone left waiting.
  if (input.serviceCalls.some((call) => call.kind === "help" && call.status === "open")) {
    score -= 1;
    reasons.push("waiting on staff");
  }

  const level: JoyLevel = score <= 0 ? "low" : score >= 3 ? "great" : "ok";
  return { level, score, reasons };
}
