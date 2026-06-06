export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(price);
}

// Currency-aware money formatter (events can be priced in GBP, USD, etc.).
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
