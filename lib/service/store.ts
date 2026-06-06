import type { ServiceCall, ServiceCallStatus } from "@/lib/service/types";

// In-memory waiter-call store (MVP stub, mirrors the orders store).
const globalStore = globalThis as unknown as { __hinokiServiceCalls?: ServiceCall[] };
if (!globalStore.__hinokiServiceCalls) globalStore.__hinokiServiceCalls = [];

function calls(): ServiceCall[] {
  return globalStore.__hinokiServiceCalls!;
}

export function addServiceCall(call: ServiceCall): ServiceCall {
  calls().unshift(call);
  return call;
}

export function listServiceCalls(slug?: string): ServiceCall[] {
  const all = calls();
  return slug ? all.filter((call) => call.slug === slug) : all;
}

export function getServiceCall(id: string): ServiceCall | null {
  return calls().find((call) => call.id === id) ?? null;
}

export function updateServiceCallStatus(id: string, status: ServiceCallStatus): ServiceCall | null {
  const call = calls().find((candidate) => candidate.id === id);
  if (!call) return null;
  call.status = status;
  return call;
}
