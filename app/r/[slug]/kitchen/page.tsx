import { notFound } from "next/navigation";
import { KitchenView } from "@/components/KitchenView";
import { getRestaurantBySlug } from "@/lib/restaurants";

type KitchenPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function KitchenPage({ params }: KitchenPageProps) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  return <KitchenView slug={slug} restaurantName={restaurant.name} />;
}
