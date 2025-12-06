import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

let supabaseServer: ReturnType<typeof createServerClient> | null = null

export async function getSupabaseServer() {
  if (!supabaseServer) {
    const cookieStore = await cookies()
    supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {
              // Handle cookie errors
            }
          },
        },
      },
    )
  }
  return supabaseServer
}
