import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables")
}

const browserClientKey = Symbol.for("bakimono.supabase-client")
const browserWindow = typeof window === "undefined" ? null : window
export const supabase = browserWindow
  ? (browserWindow[browserClientKey] ??= createClient(supabaseUrl, supabaseKey))
  : createClient(supabaseUrl, supabaseKey)