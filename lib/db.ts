import { createClient } from "@supabase/supabase-js";

// Default values (fallback)
// Updated to match .env.local values
const DEFAULT_SUPABASE_URL = "https://lfmqhoijffrbmvadzamg.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmbXFob2lqZmZyYm12YWR6YW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMzg0MTIsImV4cCI6MjA4MDkxNDQxMn0.jmeEgaZb9OTv4M4mgporOBaqRkefr2fyl-rwZ8lPboY";

// Function to get environment variables (reads fresh each time)
function getEnvVar(key: string, defaultValue: string): string {
  // In Next.js, process.env is available at runtime
  const value = process.env[key];
  return value || defaultValue;
}

// Validate that we have values
const supabaseUrl = getEnvVar("NEXT_PUBLIC_SUPABASE_URL", DEFAULT_SUPABASE_URL);
const supabaseAnonKey = getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY", DEFAULT_SUPABASE_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Validate URL format
if (!supabaseUrl.startsWith("https://") || !supabaseUrl.includes(".supabase.co")) {
  console.warn(`Warning: Supabase URL may be incorrect: ${supabaseUrl}`);
}

// Function to create a Supabase client for server-side usage
// This ensures a fresh client is used for each server action call
// It reads env vars fresh each time to ensure they're loaded
export function getSupabaseClient() {
  // Read environment variables fresh each time (important for server actions)
  const currentUrl = getEnvVar("NEXT_PUBLIC_SUPABASE_URL", DEFAULT_SUPABASE_URL);
  const currentKey = getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY", DEFAULT_SUPABASE_KEY);
  
  // Check if env vars are loaded (in development)
  if (process.env.NODE_ENV === "development") {
    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const usingEnvUrl = !!envUrl;
    const usingEnvKey = !!envKey;
    
    if (!usingEnvUrl || !usingEnvKey) {
      console.warn("⚠️  Environment variables not loaded from .env.local");
      console.warn("⚠️  Using hardcoded defaults. Please restart your Next.js dev server!");
      console.warn("⚠️  Expected URL from .env.local: https://lfmqhoijffrbmvadzamg.supabase.co");
      console.warn("⚠️  Currently using: " + currentUrl);
      console.warn("⚠️  All env vars:", Object.keys(process.env).filter(k => k.includes("SUPABASE")).join(", "));
    } else {
      console.log("✅ Using Supabase URL from .env.local:", currentUrl.substring(0, 30) + "...");
    }
  }
  
  return createClient(currentUrl, currentKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Function to create a Supabase client for client-side usage (with realtime support)
// This should only be called from client components
export function getSupabaseClientForRealtime() {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseClientForRealtime can only be called from client components');
  }
  
  const currentUrl = getEnvVar("NEXT_PUBLIC_SUPABASE_URL", DEFAULT_SUPABASE_URL);
  const currentKey = getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY", DEFAULT_SUPABASE_KEY);
  
  return createClient(currentUrl, currentKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}

// Default export for backward compatibility
export const supabase = getSupabaseClient();

export default supabase;
