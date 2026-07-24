import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/config/env";

/**
 * Browser Supabase client for Client Components.
 */
export function createSupabaseBrowserClient() {
  const env = getPublicEnv();

  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
