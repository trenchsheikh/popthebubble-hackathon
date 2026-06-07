import { NextResponse } from "next/server";
import { getMenuForRestaurant, getRestaurantBySlug } from "@/lib/restaurants";
import { buildDinerCard, buildOrderItems } from "@/lib/orders/diner-card";
import { addOrder, getOrder, listOrders, updateOrderStatus } from "@/lib/orders/store";
import { notifyRestaurant } from "@/lib/notify/whatsapp";
import type { Order, OrderStatus } from "@/lib/orders/types";
import type { DinerProfile } from "@/lib/types";

const VALID_STATUS: OrderStatus[] = ["new", "seen", "preparing", "done"];

type PlaceOrderBody = {
  slug?: string;
  tableLabel?: string;
  dinerId?: string;
  items?: { id: string; qty: number; requests?: string[] }[];
  profile?: DinerProfile;
  shareSoftPrefs?: boolean;
  note?: string;
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `order_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
}

export async function POST(request: Request) {
  let body: PlaceOrderBody;
  try {
    body = (await request.json()) as PlaceOrderBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { slug, dinerId, items, profile } = body;
  if (!slug || !dinerId || !profile || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ok: false, error: "Missing slug, dinerId, profile, or items" }, { status: 400 });
  }

  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return NextResponse.json({ ok: false, error: "Unknown restaurant" }, { status: 404 });

  const menu = await getMenuForRestaurant(restaurant.id);
  const quantities: Record<string, number> = {};
  const requestsByDish: Record<string, string[]> = {};
  const orderedDishes = [];
  for (const line of items) {
    const dish = menu.find((candidate) => candidate.id === line.id);
    if (!dish) return NextResponse.json({ ok: false, error: `Unknown dish: ${line.id}` }, { status: 400 });
    quantities[dish.id] = Math.max(1, Math.min(20, Math.floor(line.qty || 1)));
    requestsByDish[dish.id] = Array.isArray(line.requests) ? line.requests.map((request) => String(request).slice(0, 80)) : [];
    orderedDishes.push(dish);
  }

  const orderItems = buildOrderItems(orderedDishes, quantities, requestsByDish, profile);
  const total = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const dinerCard = buildDinerCard(profile, orderedDishes, Boolean(body.shareSoftPrefs));

  const order: Order = {
    id: newId(),
    slug,
    restaurantName: restaurant.name,
    tableLabel: body.tableLabel || restaurant.tableLabel,
    dinerId,
    items: orderItems,
    total,
    note: body.note?.slice(0, 280),
    dinerCard,
    status: "new",
    channel: "pending",
    channelDetail: "",
    messages: [],
    createdAt: Date.now()
  };

  const notify = await notifyRestaurant(order);
  order.channel = notify.channel;
  order.channelDetail = notify.detail;
  addOrder(order);

  return NextResponse.json({ ok: true, orderId: order.id, channel: notify.channel, detail: notify.detail });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  if (id) {
    const order = getOrder(id);
    return NextResponse.json({ order });
  }
  const slug = params.get("slug") ?? undefined;
  return NextResponse.json({ orders: listOrders(slug) });
}

export async function PATCH(request: Request) {
  let body: { id?: string; status?: OrderStatus };
  try {
    body = (await request.json()) as { id?: string; status?: OrderStatus };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.id || !body.status || !VALID_STATUS.includes(body.status)) {
    return NextResponse.json({ ok: false, error: "Missing or invalid id/status" }, { status: 400 });
  }
  const updated = updateOrderStatus(body.id, body.status);
  if (!updated) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  return NextResponse.json({ ok: true, order: updated });
}
