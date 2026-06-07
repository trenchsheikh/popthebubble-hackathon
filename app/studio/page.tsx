import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RestaurantStudio } from "@/components/studio/RestaurantStudio";
import { getRestaurantSession } from "@/lib/auth";
import { getRestaurantByOwner } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Restaurant studio · Bubble",
  description: "Upload your menu, add dishes, and go live for diners in minutes."
};

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  // Middleware already guarantees a session here, but resolve it for the owner id
  // and route owners who've already onboarded straight to their dashboard.
  const user = await getRestaurantSession();
  if (!user) redirect("/login?next=/studio");

  const existing = await getRestaurantByOwner(user.id);
  if (existing) redirect(`/dashboard?slug=${existing.slug}`);

  return (
    <main className="app-shell studio-shell">
      <RestaurantStudio ownerEmail={user.email ?? undefined} />
    </main>
  );
}
