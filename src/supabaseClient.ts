import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "./supabaseConfig";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
