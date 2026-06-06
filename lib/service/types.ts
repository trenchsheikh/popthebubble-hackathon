export type ServiceCallStatus = "open" | "acknowledged" | "resolved";

// "help" = general assistance; "order" = the table is ready to order and the
// waiter takes it in person (carries the basket so they know what's wanted).
export type ServiceCallKind = "help" | "order";

export type ServiceCallItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  requests?: string[];
};

// A diner's request for a human at their table — distinct from an order.
export type ServiceCall = {
  id: string;
  slug: string;
  tableLabel: string;
  dinerId: string;
  reason: string; // free or one of the quick reasons; "" = general assistance
  kind: ServiceCallKind;
  items?: ServiceCallItem[]; // basket the waiter should take, when kind === "order"
  basketTotal?: number; // sum of item.price * qty
  status: ServiceCallStatus;
  channel: string;
  channelDetail: string;
  createdAt: number;
};
