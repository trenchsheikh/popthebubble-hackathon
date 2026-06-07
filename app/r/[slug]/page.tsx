import { notFound } from "next/navigation";
import { DinerApp } from "@/components/DinerApp";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartBar } from "@/components/cart/CartBar";
import { ServiceProvider } from "@/components/service/ServiceProvider";
import { QrWidget } from "@/components/QrWidget";
import { LanguageToggle } from "@/components/LanguageToggle";
import { CurrencyProvider } from "@/lib/currency";
import { getMenuForRestaurant, getRestaurantBySlug } from "@/lib/restaurants";

type RestaurantPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string }>;
};

export default async function RestaurantPage({ params, searchParams }: RestaurantPageProps) {
  const { slug } = await params;
  const { table } = await searchParams;
  const restaurant = await getRestaurantBySlug(slug);

  if (!restaurant) notFound();

  const tableLabel = table ? `Table ${table}` : restaurant.tableLabel;
  const menu = await getMenuForRestaurant(restaurant.id);

  return (
    <CurrencyProvider currency={restaurant.currency}>
      <CartProvider>
        <ServiceProvider slug={restaurant.slug} tableLabel={tableLabel} shortName={restaurant.shortName}>
          <DinerApp restaurant={{ ...restaurant, tableLabel }} menu={menu} />
          <CartBar slug={restaurant.slug} tableLabel={tableLabel} />
          <QrWidget />
          <LanguageToggle />
        </ServiceProvider>
      </CartProvider>
    </CurrencyProvider>
  );
}
