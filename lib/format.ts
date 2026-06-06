export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(price);
}
