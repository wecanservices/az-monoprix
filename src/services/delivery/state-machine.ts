/**
 * AZ MONOPRIX — Order/delivery state machine.
 *
 * Single source of truth for what transitions are legal, from where,
 * and by whom. Used by both the driver API and admin API.
 */
import { ORDER_STATUS, type OrderStatus } from "@/constants/order-status";

type ActorRole = "system" | "customer" | "driver" | "admin";

/** Allowed transitions (from → to) with the actor(s) permitted. */
const TRANSITIONS: Record<OrderStatus, Array<{ to: OrderStatus; actors: ActorRole[] }>> = {
  pending: [
    { to: "confirmed", actors: ["system", "admin"] },
    { to: "cancelled", actors: ["customer", "admin"] },
  ],
  confirmed: [
    { to: "preparing", actors: ["admin"] },
    { to: "cancelled", actors: ["customer", "admin"] },
  ],
  preparing: [
    { to: "partially_available", actors: ["admin"] },
    { to: "ready", actors: ["admin"] },
    { to: "cancelled", actors: ["admin"] },
  ],
  partially_available: [
    { to: "ready", actors: ["admin"] },
    { to: "preparing", actors: ["admin"] },
    { to: "cancelled", actors: ["admin"] },
  ],
  ready: [
    { to: "assigned", actors: ["admin", "system"] },
    { to: "cancelled", actors: ["admin"] },
  ],
  assigned: [
    { to: "accepted", actors: ["driver"] },
    { to: "ready", actors: ["driver", "admin"] }, // refuse → back to pool
    { to: "cancelled", actors: ["admin"] },
  ],
  accepted: [
    { to: "go_to_store", actors: ["driver"] },
    { to: "ready", actors: ["driver", "admin"] }, // cancel accept
  ],
  go_to_store: [{ to: "at_store", actors: ["driver"] }],
  at_store: [{ to: "picked_up", actors: ["driver"] }],
  picked_up: [{ to: "go_to_customer", actors: ["driver"] }],
  go_to_customer: [{ to: "at_customer", actors: ["driver"] }],
  at_customer: [{ to: "delivered", actors: ["driver"] }],
  delivered: [{ to: "refunded", actors: ["admin"] }],
  cancelled: [],
  refunded: [],
};

/** Verifier used by the API before writing a transition. */
export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: ActorRole,
): boolean {
  const allowed = TRANSITIONS[from] ?? [];
  return allowed.some((t) => t.to === to && t.actors.includes(actor));
}

/** Legal `next` moves for a driver on a given order — drives the UI buttons. */
export function driverNextActions(status: OrderStatus): OrderStatus[] {
  return (TRANSITIONS[status] ?? [])
    .filter((t) => t.actors.includes("driver"))
    .map((t) => t.to);
}

export const DRIVER_ACTIVE_STATUSES: OrderStatus[] = [
  ORDER_STATUS.ASSIGNED,
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.GO_TO_STORE,
  ORDER_STATUS.AT_STORE,
  ORDER_STATUS.PICKED_UP,
  ORDER_STATUS.GO_TO_CUSTOMER,
  ORDER_STATUS.AT_CUSTOMER,
];

export const DRIVER_TERMINAL_STATUSES: OrderStatus[] = [
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.CANCELLED,
];
