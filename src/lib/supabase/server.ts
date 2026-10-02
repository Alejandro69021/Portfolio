import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

const supabaseUrl = import.meta.env?.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = import.meta.env?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Creates a scoped Supabase server client for SSR requests with HttpOnly cookie handling.
 */
export function createSupabaseServerClient(
  contextOrCookies: { cookies: AstroCookies; request?: Request } | AstroCookies,
  optionalRequest?: Request
): SupabaseClient {
  const cookies = 'cookies' in contextOrCookies ? contextOrCookies.cookies : contextOrCookies;
  const request = 'request' in contextOrCookies ? contextOrCookies.request : optionalRequest;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieHeader = request?.headers.get('cookie') ?? '';
        if (!cookieHeader) return [];
        return cookieHeader
          .split(';')
          .map(c => {
            const [rawName, ...rest] = c.trim().split('=');
            return {
              name: rawName || '',
              value: decodeURIComponent(rest.join('=') || ''),
            };
          })
          .filter(c => Boolean(c.name));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options as any);
        });
      },
    },
  });
}

/**
 * Public Supabase client for reading published data on server-side without user cookies.
 */
let publicServerClient: SupabaseClient | null = null;
export function getPublicSupabase(): SupabaseClient {
  if (!publicServerClient) {
    publicServerClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return publicServerClient;
}

/**
 * Service Role client for administrative tasks and seed scripts.
 * MUST NEVER be bundled or exposed to client-side.
 */
let adminClient: SupabaseClient | null = null;
export function getAdminSupabase(): SupabaseClient {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables.');
  }
  if (!adminClient) {
    adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return adminClient;
}
