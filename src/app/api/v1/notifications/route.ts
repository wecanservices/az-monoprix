import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { countUnread, listUserNotifications, markRead } from "@/services/notifications";
import { ok, fail } from "@/lib/api/response";

export async function GET() {
  const session = await getSession();
  if (!session || session.role === "guest") {
    // Silent no-op for guests — the notification bell polls this on
    // every page load; a 401 would fire misleading console errors.
    return ok({ items: [], unread: 0 });
  }
  try {
    const sb = await createClient();
    const [items, unread] = await Promise.all([
      listUserNotifications(sb, session.id),
      countUnread(sb, session.id),
    ]);
    return ok({ items, unread });
  } catch (e) {
    return fail("notif_error", (e as Error).message, 500);
  }
}

export async function POST() {
  const session = await getSession();
  if (!session || session.role === "guest") return ok({ ok: true });
  try {
    await markRead(await createClient(), session.id);
    return ok({ ok: true });
  } catch (e) {
    return fail("mark_read_error", (e as Error).message, 400);
  }
}
