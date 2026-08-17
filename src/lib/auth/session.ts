/**
 * Session helpers server-side.
 * Encapsule la récupération de l'utilisateur + profil (role, store_id…).
 */
import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { ROLES, type Role } from "@/constants/roles";

export interface SessionProfile {
  id: string;
  email: string | null;
  role: Role;
  full_name: string | null;
  store_id: string | null;
  phone: string | null;
  avatar_url: string | null;
}

/**
 * Renvoie l'utilisateur courant + son profil enrichi.
 * Mémoïsé par requête (React `cache`) → un seul appel Supabase même
 * si plusieurs Server Components l'utilisent dans la même page.
 */
export const getSession = cache(async (): Promise<SessionProfile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role, full_name, store_id, phone, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // User exists in auth but no profile row yet — treat as guest.
    return {
      id: user.id,
      email: user.email ?? null,
      role: ROLES.GUEST,
      full_name: null,
      store_id: null,
      phone: user.phone ?? null,
      avatar_url: null,
    };
  }

  return profile as SessionProfile;
});
