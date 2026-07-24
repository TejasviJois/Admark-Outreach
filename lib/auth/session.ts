import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuthenticationError } from "@/lib/errors/domain-error";
import {
  type AuthSessionUser,
  mapSupabaseUser,
} from "@/providers/auth/auth.provider";

/**
 * Reads the authenticated Supabase user from the current request session.
 */
export async function getSessionAuthUser(): Promise<AuthSessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return mapSupabaseUser(data.user);
}

/**
 * Requires an authenticated session or throws AuthenticationError.
 */
export async function requireSessionAuthUser(): Promise<AuthSessionUser> {
  const user = await getSessionAuthUser();

  if (!user) {
    throw new AuthenticationError();
  }

  return user;
}
