import type { Metadata } from "next";
import { RestaurantStudio } from "@/components/studio/RestaurantStudio";

export const metadata: Metadata = {
  title: "Restaurant studio · Bubble",
  description: "Upload your menu, add dishes, and go live for diners in minutes."
};

export default function StudioPage() {
  return (
    <main className="app-shell studio-shell">
      <RestaurantStudio />
    </main>
  );
}
