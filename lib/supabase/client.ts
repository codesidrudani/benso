import { createBrowserClient } from "@supabase/ssr"

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
      console.warn("[v0] Supabase environment variables not configured")
      return createBrowserClient("https://placeholder.supabase.co", "placeholder-key")
    }

    supabaseClient = createBrowserClient(url, key)
  }
  return supabaseClient
}
