"use client";

import { createContext, useContext, type ReactNode } from "react";
import { formatMoney } from "@/lib/format";

// Per-restaurant display currency. Mounted on the diner page from the
// restaurant record so every price renders in the menu's real currency
// (a Chinese menu shows ¥, not £). Defaults to GBP outside a provider.
const CurrencyContext = createContext<string>("GBP");

export function CurrencyProvider({ currency, children }: { currency?: string; children: ReactNode }) {
  return <CurrencyContext.Provider value={currency || "GBP"}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): string {
  return useContext(CurrencyContext);
}

// Hook returning a formatter bound to the active restaurant currency.
export function useMoney(): (amount: number) => string {
  const currency = useContext(CurrencyContext);
  return (amount: number) => formatMoney(amount, currency);
}
