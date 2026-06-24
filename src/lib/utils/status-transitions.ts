export type OrderStatusKey = "DRAFT" | "CONFIRMED" | "IN_PRODUCTION" | "READY" | "DELIVERED" | "CANCELLED";

const TRANSITIONS: Record<OrderStatusKey, OrderStatusKey[]> = {
  DRAFT:         ["CONFIRMED", "CANCELLED"],
  CONFIRMED:     ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["READY", "CANCELLED"],
  READY:         ["DELIVERED", "CANCELLED"],
  DELIVERED:     [],
  CANCELLED:     [],
};

export function getAllowedTransitions(from: OrderStatusKey): OrderStatusKey[] {
  return TRANSITIONS[from] ?? [];
}

export function isValidTransition(from: OrderStatusKey, to: OrderStatusKey): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export const STATUS_LABELS: Record<OrderStatusKey, string> = {
  DRAFT:         "Draft",
  CONFIRMED:     "Confirmed",
  IN_PRODUCTION: "In Production",
  READY:         "Ready",
  DELIVERED:     "Delivered",
  CANCELLED:     "Cancelled",
};

export const STATUS_CSS: Record<OrderStatusKey, string> = {
  DRAFT:         "status-pending",
  CONFIRMED:     "status-processing",
  IN_PRODUCTION: "status-processing",
  READY:         "status-fulfilled",
  DELIVERED:     "status-fulfilled",
  CANCELLED:     "status-cancelled",
};
