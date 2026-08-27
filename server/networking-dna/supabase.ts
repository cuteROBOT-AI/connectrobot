import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { NetworkingDnaEnv } from "./env";

export function createNetworkingDnaSupabaseClient(env: NetworkingDnaEnv): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
