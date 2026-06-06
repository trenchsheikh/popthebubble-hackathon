export type ServiceCallStatus = "open" | "acknowledged" | "resolved";

// A diner's request for a human at their table — distinct from an order.
export type ServiceCall = {
  id: string;
  slug: string;
  tableLabel: string;
  dinerId: string;
  reason: string; // free or one of the quick reasons; "" = general assistance
  status: ServiceCallStatus;
  channel: string;
  channelDetail: string;
  createdAt: number;
};
