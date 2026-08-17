/**
 * Order lifecycle statuses. Mirrored on the DB as `order_status` enum.
 * See docs/workflows/order.md for the state machine.
 */
export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  PARTIALLY_AVAILABLE: "partially_available",
  READY: "ready",
  ASSIGNED: "assigned",
  ACCEPTED: "accepted",
  GO_TO_STORE: "go_to_store",
  AT_STORE: "at_store",
  PICKED_UP: "picked_up",
  GO_TO_CUSTOMER: "go_to_customer",
  AT_CUSTOMER: "at_customer",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const TERMINAL_STATUSES: readonly OrderStatus[] = [
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.REFUNDED,
];

export const FULFILLMENT_MODES = {
  DELIVERY: "delivery",
  DRIVE: "drive",
  PICKUP: "pickup",
} as const;
export type FulfillmentMode =
  (typeof FULFILLMENT_MODES)[keyof typeof FULFILLMENT_MODES];
