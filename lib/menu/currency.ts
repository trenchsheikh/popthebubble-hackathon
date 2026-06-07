// Best-guess currency for a cuisine, so a Chinese menu prices in ¥ not £ by
// default. Owner can override in onboarding. Client- and server-safe.
export function currencyForCuisine(cuisine: string | undefined): string {
  const c = (cuisine ?? "").toLowerCase();
  if (/chinese|sichuan|szechuan|cantonese|dim ?sum|hot ?pot|wok|szechwan/.test(c)) return "CNY";
  if (/japanese|izakaya|sushi|ramen|teppan|yakitori/.test(c)) return "JPY";
  if (/korean/.test(c)) return "KRW";
  if (/thai/.test(c)) return "THB";
  if (/vietnamese/.test(c)) return "VND";
  if (/indian|pakistani|nepalese/.test(c)) return "INR";
  if (/italian|french|spanish|greek|german|portuguese|european/.test(c)) return "EUR";
  if (/american|mexican|burger|bbq|diner|tex-?mex/.test(c)) return "USD";
  return "GBP";
}

const SYMBOLS: Record<string, string> = {
  GBP: "£", USD: "$", EUR: "€", CNY: "¥", JPY: "¥", KRW: "₩", THB: "฿", INR: "₹", VND: "₫"
};

export function currencySymbol(code: string | undefined): string {
  return SYMBOLS[(code ?? "GBP").toUpperCase()] ?? (code ?? "£");
}

// Common menu currencies offered in the onboarding selector.
export const CURRENCY_OPTIONS: { code: string; label: string }[] = [
  { code: "GBP", label: "£ GBP" },
  { code: "USD", label: "$ USD" },
  { code: "EUR", label: "€ EUR" },
  { code: "CNY", label: "¥ CNY (RMB)" },
  { code: "JPY", label: "¥ JPY" },
  { code: "KRW", label: "₩ KRW" },
  { code: "THB", label: "฿ THB" },
  { code: "INR", label: "₹ INR" },
  { code: "VND", label: "₫ VND" }
];
