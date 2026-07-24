import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

import type { AuthUserId } from "@/types/ids";

export type AuthSessionUser = {
  authUserId: AuthUserId;
  email: string | null;
  fullName: string | null;
};

export interface AuthProvider {
  getCurrentUser(): Promise<AuthSessionUser | null>;
  signInWithPassword(email: string, password: string): Promise<AuthSessionUser>;
  signOut(): Promise<void>;
}

export function mapSupabaseUser(user: SupabaseAuthUser): AuthSessionUser {
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null;

  return {
    authUserId: user.id,
    email: user.email ?? null,
    fullName,
  };
}
