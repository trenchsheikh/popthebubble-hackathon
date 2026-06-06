import type { Allergen } from "@/lib/types";
import type { Order } from "@/lib/orders/types";

const ALLERGEN_LABEL: Record<Allergen, string> = {
  gluten: "Gluten",
  shellfish: "Shellfish",
  fish: "Fish",
  dairy: "Dairy",
  egg: "Egg",
  nuts: "Nuts"
};

function money(value: number): string {
  return `£${value.toFixed(2)}`;
}

// Plain-text order summary for messaging channels (WhatsApp/SMS).
export function formatOrderMessage(order: Order): string {
  const lines: string[] = [];
  lines.push(`🍱 New order — ${order.restaurantName}`);
  lines.push(`${order.tableLabel}`);
  lines.push("");
  for (const item of order.items) {
    lines.push(`${item.qty}× ${item.name} — ${money(item.price * item.qty)}`);
    for (const request of item.requests ?? []) {
      lines.push(`   ↳ ${request}`);
    }
  }
  lines.push(`Total: ${money(order.total)}`);

  const card = order.dinerCard;
  if (card.allergies.length > 0 || card.diet !== "none") {
    lines.push("");
    lines.push("⚠️ Diner safety:");
    if (card.allergies.length > 0) {
      lines.push(`Allergies: ${card.allergies.map((allergen) => ALLERGEN_LABEL[allergen]).join(", ")}`);
    }
    if (card.diet !== "none") lines.push(`Diet: ${card.diet}`);
  }
  if (card.conflicts.length > 0) {
    lines.push("Flagged dishes:");
    for (const conflict of card.conflicts) {
      lines.push(`• ${conflict.itemName}: ${conflict.flags.join(", ")}`);
    }
  }

  if (card.softPrefs) {
    lines.push("");
    lines.push("Preferences (shared):");
    lines.push(`Spice ${card.softPrefs.spice}/3 · appetite ${card.softPrefs.appetite}`);
    if (card.softPrefs.likes.length > 0) lines.push(`Likes: ${card.softPrefs.likes.join(", ")}`);
    if (card.softPrefs.dislikes.length > 0) lines.push(`Avoids: ${card.softPrefs.dislikes.join(", ")}`);
  }

  if (order.note) {
    lines.push("");
    lines.push(`Note: ${order.note}`);
  }

  return lines.join("\n");
}
