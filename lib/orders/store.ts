import type { Order, OrderMessage, OrderStatus } from "@/lib/orders/types";

// In-memory order store (MVP stub — no POS/DB, per spec §4). Survives Next.js
// hot-reload in dev by hanging off globalThis. Resets on a full server restart.
const globalStore = globalThis as unknown as { __hinokiOrders?: Order[] };
if (!globalStore.__hinokiOrders) globalStore.__hinokiOrders = [];

function orders(): Order[] {
  return globalStore.__hinokiOrders!;
}

export function addOrder(order: Order): Order {
  orders().unshift(order);
  return order;
}

export function listOrders(slug?: string): Order[] {
  const all = orders();
  return slug ? all.filter((order) => order.slug === slug) : all;
}

export function getOrder(id: string): Order | null {
  return orders().find((order) => order.id === id) ?? null;
}

export function appendOrderMessage(id: string, message: OrderMessage): Order | null {
  const order = orders().find((candidate) => candidate.id === id);
  if (!order) return null;
  order.messages.push(message);
  return order;
}

export function updateOrderStatus(id: string, status: OrderStatus): Order | null {
  const order = orders().find((candidate) => candidate.id === id);
  if (!order) return null;
  order.status = status;
  return order;
}
