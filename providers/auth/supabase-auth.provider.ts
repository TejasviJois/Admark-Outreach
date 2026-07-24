import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuthenticationError } from "@/lib/errors/domain-error";
import {
  type AuthProvider,
  type AuthSessionUser,
  mapSupabaseUser,
} from "@/providers/auth/auth.provider";

export class SupabaseAuthProvider implements AuthProvider {
  async getCurrentUser(): Promise<AuthSessionUser | null> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return mapSupabaseUser(data.user);
  }

  async signInWithPassword(
    email: string,
    password: string,
  ): Promise<AuthSessionUser> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      throw new AuthenticationError(error?.message ?? "Invalid credentials");
    }

    return mapSupabaseUser(data.user);
  }

  async signOut(): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new AuthenticationError(error.message);
    }
  }
}

export function createAuthProvider(): AuthProvider {
  return new SupabaseAuthProvider();
}
