import { createClient } from "@supabase/supabase-js";
import { REALTIME_EVENTS_PER_SECOND } from "./constants";

// Cache for manually loaded env vars (fallback for Turbopack issues)
let envVarsLoaded = false;

/**
 * Manually load .env.local as fallback if Next.js didn't load it
 * This is a workaround for Turbopack sometimes not loading env vars properly
 */
function loadEnvLocalIfNeeded(): void {
  if (envVarsLoaded) return;
  
  // Only run on server-side (fs is not available in browser)
  if (typeof window !== 'undefined') {
    return;
  }
  
  // Only try to load if we're missing the required vars
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const fs = require('fs');
      const path = require('path');
      const envLocalPath = path.join(process.cwd(), '.env.local');
      
      if (fs.existsSync(envLocalPath)) {
        // Read file as buffer to detect encoding
        let envContent: string;
        const buffer = fs.readFileSync(envLocalPath);
        
        // Check for UTF-16 BOM (FE FF for LE, FF FE for BE)
        let isUTF16 = false;
        if (buffer.length >= 2) {
          const bomLE = buffer.readUInt16LE(0);
          const bomBE = buffer.readUInt16BE(0);
          
          if (bomLE === 0xFEFF) {
            // UTF-16 LE with BOM
            envContent = buffer.toString('utf16le').slice(1); // Remove BOM
            isUTF16 = true;
          } else if (bomBE === 0xFEFF) {
            // UTF-16 BE with BOM
            envContent = buffer.toString('utf16be').slice(1); // Remove BOM
            isUTF16 = true;
          } else {
            // No BOM - check if it's UTF-16 by looking for null bytes
            // UTF-16 files have null bytes between ASCII characters
            let nullByteCount = 0;
            for (let i = 0; i < Math.min(100, buffer.length); i += 2) {
              if (buffer[i + 1] === 0 && buffer[i] !== 0 && buffer[i] < 128) {
                nullByteCount++;
              }
            }
            // If more than 50% of checked bytes are null bytes in odd positions, it's likely UTF-16
            if (nullByteCount > 10) {
              // Try UTF-16 LE (most common on Windows)
              envContent = buffer.toString('utf16le');
              isUTF16 = true;
            } else {
              // Try UTF-8
              envContent = buffer.toString('utf-8');
            }
          }
        } else {
          envContent = buffer.toString('utf-8');
        }
        
        // If we read as UTF-8 but there are null bytes, it might be UTF-16 without BOM
        if (!isUTF16 && envContent.includes('\0')) {
          // Retry as UTF-16 LE
          envContent = buffer.toString('utf16le');
          isUTF16 = true;
        }
        
        // Remove any remaining BOM characters and non-printable chars
        envContent = envContent.replace(/^[\uFEFF\u200B\u200C\u200D\u2060\u00A0]+/, '');
        // Remove null bytes (shouldn't be needed if UTF-16 was detected, but just in case)
        envContent = envContent.replace(/\0/g, '');
        
        const lines = envContent.split(/\r?\n/); // Handle both \n and \r\n
        
        let loadedCount = 0;
        for (const line of lines) {
          // Remove BOM, null bytes, and non-printable chars from each line, then trim
          let cleanedLine = line
            .replace(/\0/g, '') // Remove null bytes
            .replace(/^[\uFEFF\u200B\u200C\u200D\u2060\u00A0]+/, '') // Remove BOM/non-printable from start
            .trim();
          
          // Skip comments and empty lines
          if (!cleanedLine || cleanedLine.startsWith('#')) continue;
          
          // Match KEY=VALUE format - handle any remaining invisible chars
          const match = cleanedLine.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
          if (match) {
            // Clean the key of any remaining non-printable characters
            const key = match[1]
              .replace(/[\uFEFF\u200B\u200C\u200D\u2060\0]/g, '')
              .trim();
            let value = match[2]
              .replace(/[\uFEFF\u200B\u200C\u200D\u2060\0]/g, '')
              .trim();
            
            // Remove quotes if present (both single and double)
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            
            // Set in process.env (even if already exists, to ensure it's loaded)
            if (key && value) {
              process.env[key] = value;
              loadedCount++;
              // Log for debugging
              if (key.includes('SUPABASE')) {
                console.log(`[db.ts] Loaded ${key} = ${value.substring(0, 30)}...`);
              }
            }
          } else {
            // Debug: log lines that don't match (for troubleshooting)
            if (cleanedLine.length > 0 && !cleanedLine.startsWith('#')) {
              const firstChars = cleanedLine.substring(0, 20);
              const charCodes = cleanedLine.split('').slice(0, 10).map(c => c.charCodeAt(0)).join(', ');
              console.warn(`[db.ts] Could not parse line: "${firstChars}..." (char codes: ${charCodes})`);
            }
          }
        }
        
        envVarsLoaded = true;
        if (loadedCount > 0) {
          console.log(`[db.ts] Manually loaded ${loadedCount} env vars from .env.local (Turbopack workaround)`);
        } else {
          console.warn(`[db.ts] Attempted to load .env.local but parsed 0 variables. File content length: ${envContent.length}`);
        }
      }
    } catch (error) {
      // Log the error for debugging
      console.error('[db.ts] Failed to manually load .env.local:', error);
    }
  } else {
    envVarsLoaded = true;
  }
}

/**
 * Get environment variable with validation
 * Throws error if required variable is missing
 * Note: On client-side, NEXT_PUBLIC_* vars should be available via process.env
 * but they're replaced at build time by Next.js
 */
function getRequiredEnvVar(key: string): string {
  // On client-side, NEXT_PUBLIC_* vars should already be in process.env (replaced at build time)
  // On server-side, try to load .env.local manually if needed
  if (typeof window === 'undefined') {
    // Server-side: Try to load .env.local manually if needed (fallback for Turbopack)
    loadEnvLocalIfNeeded();
  }
  
  // In Next.js, environment variables are available via process.env
  // For server-side code, both NEXT_PUBLIC_* and regular env vars work
  // For client-side, only NEXT_PUBLIC_* vars are available (replaced at build time)
  let value = process.env[key];
  
  if (!value && typeof window === 'undefined') {
    // Server-side: Reset the cache and try loading again (in case of race condition)
    envVarsLoaded = false;
    loadEnvLocalIfNeeded();
    value = process.env[key];
  }
  
  if (!value) {
    
    // Debug: Log available env vars (without values for security)
    const allEnvKeys = Object.keys(process.env);
    const availableKeys = allEnvKeys.filter(k => 
      k.includes('SUPABASE') || k.includes('NEXT_PUBLIC')
    );
    
    // Check if .env.local exists and try to read it (server-side only)
    let envLocalExists = false;
    let envFileContent = '';
    let envLocalPath = '.env.local';
    
    if (typeof window === 'undefined') {
      try {
        const fs = require('fs');
        const path = require('path');
        envLocalPath = path.join(process.cwd(), '.env.local');
        envLocalExists = fs.existsSync(envLocalPath);
        
        if (envLocalExists) {
          try {
            envFileContent = fs.readFileSync(envLocalPath, 'utf-8');
          } catch (e) {
            envFileContent = `(Could not read file: ${e})`;
          }
        }
      } catch (e) {
        // fs not available (client-side)
        envFileContent = `(fs not available: ${e})`;
      }
    }
    
    throw new Error(
      `Missing required environment variable: ${key}\n\n` +
      `Please ensure your .env.local file contains:\n` +
      `- NEXT_PUBLIC_SUPABASE_URL\n` +
      `- NEXT_PUBLIC_SUPABASE_ANON_KEY\n\n` +
      `After updating .env.local, restart your Next.js dev server.\n\n` +
      `Debug info:\n` +
      `- .env.local exists: ${envLocalExists}\n` +
      `- .env.local path: ${envLocalPath}\n` +
      `- Found ${availableKeys.length} related env vars: ${availableKeys.join(', ') || 'none'}\n` +
      `- Total env vars: ${allEnvKeys.length}\n` +
      `- Manual load attempted: ${envVarsLoaded}\n` +
      `- .env.local first 200 chars: ${envFileContent.substring(0, 200)}\n\n` +
      `If .env.local exists but vars aren't loading, try:\n` +
      `1. Ensure no spaces around the = sign in .env.local\n` +
      `2. Ensure no quotes around values unless they contain spaces\n` +
      `3. Restart your dev server completely (stop and start again)\n` +
      `4. Check for typos in variable names\n` +
      `5. Clear .next cache: Remove-Item -Recurse -Force .next`
    );
  }
  
  return value;
}

/**
 * Get Supabase URL from environment variables
 * Throws error if not found (no fallback defaults)
 */
function getSupabaseUrl(): string {
  const url = getRequiredEnvVar("NEXT_PUBLIC_SUPABASE_URL");
  
  // Validate URL format
  if (!url.startsWith("https://") || !url.includes(".supabase.co")) {
    console.warn(`Warning: Supabase URL format may be incorrect: ${url}`);
  }
  
  return url;
}

/**
 * Get Supabase anonymous key from environment variables
 * Throws error if not found (no fallback defaults)
 */
function getSupabaseAnonKey(): string {
  return getRequiredEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

/**
 * Create a Supabase client for server-side usage
 * This ensures a fresh client is used for each server action call
 * It reads env vars fresh each time to ensure they're loaded
 */
export function getSupabaseClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Function to create a Supabase client for client-side usage (with realtime support)
// This should only be called from client components
// Note: NEXT_PUBLIC_* vars should be available on client-side (replaced at build time by Next.js)
// However, due to Turbopack issues, we include a fallback that reads from .env.local values
export function getSupabaseClientForRealtime() {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseClientForRealtime can only be called from client components');
  }
  
  // On client-side, NEXT_PUBLIC_* vars are replaced at build time by Next.js
  // However, Turbopack sometimes doesn't inject them properly
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Fallback: If env vars aren't available (Turbopack issue), use values from .env.local
  // This is a workaround for the known Turbopack env var loading issue
  // TODO: Remove this fallback once Turbopack properly loads NEXT_PUBLIC_* vars
  if (!url || !key) {
    // These values should match your .env.local file
    // This is a temporary workaround for Turbopack not loading env vars
    const fallbackUrl = "https://lfmqhoijffrbmvadzamg.supabase.co";
    const fallbackKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmbXFob2lqZmZyYm12YWR6YW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMzg0MTIsImV4cCI6MjA4MDkxNDQxMn0.jmeEgaZb9OTv4M4mgporOBaqRkefr2fyl-rwZ8lPboY";
    
    console.warn(
      '[db.ts] NEXT_PUBLIC_* env vars not found in client bundle. ' +
      'Using fallback values (Turbopack workaround). ' +
      'This should be fixed by restarting the dev server or updating .env.local.'
    );
    
    url = fallbackUrl;
    key = fallbackKey;
  }
  
  if (!url || !key) {
    throw new Error(
      `Missing Supabase environment variables on client-side.\n\n` +
      `NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY should be available ` +
      `in the client bundle (they're replaced at build time by Next.js).\n\n` +
      `Please ensure:\n` +
      `1. Your .env.local file contains NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY\n` +
      `2. You have restarted your Next.js dev server after adding/updating .env.local\n` +
      `3. The variables are prefixed with NEXT_PUBLIC_ (required for client-side access)\n\n` +
      `Note: This is a known issue with Turbopack not loading env vars properly. ` +
      `The fallback values are being used as a temporary workaround.`
    );
  }
  
  return createClient(url, key, {
    realtime: {
      params: {
        eventsPerSecond: REALTIME_EVENTS_PER_SECOND,
      },
    },
  });
}
