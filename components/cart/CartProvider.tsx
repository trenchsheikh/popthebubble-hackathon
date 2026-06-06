"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { MenuItem } from "@/lib/types";

export type CartLine = { dish: MenuItem; qty: number; requests: string[] };

type CartContextValue = {
  lines: CartLine[];
  count: number;
  total: number;
  add: (dish: MenuItem, requests?: string[]) => void;
  setQty: (dishId: string, qty: number) => void;
  toggleRequest: (dishId: string, request: string) => void;
  remove: (dishId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function unionRequests(existing: string[], incoming: string[]): string[] {
  return [...new Set([...existing, ...incoming])];
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, line) => sum + line.qty, 0);
    const total = lines.reduce((sum, line) => sum + line.qty * line.dish.price, 0);

    return {
      lines,
      count,
      total,
      add: (dish, requests = []) =>
        setLines((current) => {
          const existing = current.find((line) => line.dish.id === dish.id);
          if (existing) {
            return current.map((line) =>
              line.dish.id === dish.id
                ? { ...line, qty: line.qty + 1, requests: unionRequests(line.requests, requests) }
                : line
            );
          }
          return [...current, { dish, qty: 1, requests }];
        }),
      setQty: (dishId, qty) =>
        setLines((current) =>
          qty <= 0
            ? current.filter((line) => line.dish.id !== dishId)
            : current.map((line) => (line.dish.id === dishId ? { ...line, qty } : line))
        ),
      toggleRequest: (dishId, request) =>
        setLines((current) =>
          current.map((line) =>
            line.dish.id === dishId
              ? {
                  ...line,
                  requests: line.requests.includes(request)
                    ? line.requests.filter((item) => item !== request)
                    : [...line.requests, request]
                }
              : line
          )
        ),
      remove: (dishId) => setLines((current) => current.filter((line) => line.dish.id !== dishId)),
      clear: () => setLines([])
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
