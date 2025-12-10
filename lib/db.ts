import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ribiqulxucsgbgfujcgc.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpYmlxdWx4dWNzZ2JnZnVqY2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMzU0MzksImV4cCI6MjA4MDkxMTQzOX0.CYZ9BSV-TprwTm7IaqA3nkB7SWzwsD5ONYbHZnNovuQ";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
