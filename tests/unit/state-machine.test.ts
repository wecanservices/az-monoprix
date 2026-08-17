/**
 * Order state-machine transitions.
 * Run with: `pnpm tsx tests/unit/state-machine.test.ts`
 */
import { canTransition } from "../../src/services/delivery/state-machine";

function assert(name: string, cond: boolean) {
  const marker = cond ? "✅" : "❌";
  // eslint-disable-next-line no-console
  console.log(`${marker} ${name}`);
  if (!cond) process.exitCode = 1;
}

assert("customer can cancel a pending order",
  canTransition("pending", "cancelled", "customer"));

assert("customer cannot cancel a picked_up order",
  !canTransition("picked_up", "cancelled", "customer"));

assert("driver can advance accepted → go_to_store",
  canTransition("accepted", "go_to_store", "driver"));

assert("driver cannot jump accepted → delivered",
  !canTransition("accepted", "delivered", "driver"));

assert("admin can finish preparing → ready",
  canTransition("preparing", "ready", "admin"));

assert("driver can transition at_customer → delivered",
  canTransition("at_customer", "delivered", "driver"));

assert("no transition out of delivered (except admin refund)",
  canTransition("delivered", "refunded", "admin"));

assert("customer cannot refund",
  !canTransition("delivered", "refunded", "customer"));
