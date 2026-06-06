import { notFound } from "next/navigation";
import { DinerApp } from "@/components/DinerApp";
import { getMenuForRestaurant, getRestaurantBySlug } from "@/lib/restaurants";

type RestaurantPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string }>;
};

export default async function RestaurantPage({ params, searchParams }: RestaurantPageProps) {
  const { slug } = await params;
  const { table } = await searchParams;
  const restaurant = getRestaurantBySlug(slug);

  if (!restaurant) notFound();

  return (
    <DinerApp
      restaurant={{ ...restaurant, tableLabel: table ? `Table ${table}` : restaurant.tableLabel }}
      menu={getMenuForRestaurant(restaurant.id)}
    />
  );
}
