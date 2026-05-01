// Server-side Supabase client — used in Server Components, Server Actions,
// and Route Handlers. Reads/writes the auth cookie via Next's cookies() API.
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Server Components can't set cookies. We swallow this so reads
          // still work; middleware.ts handles the actual cookie refresh.
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            /* no-op in RSC */
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            /* no-op in RSC */
          }
        },
      },
    },
  );
}
