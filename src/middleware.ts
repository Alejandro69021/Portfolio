import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from './lib/supabase/server';

// PUBLIC_SUPABASE_URL host for CSP
const supabaseHost = (import.meta.env.PUBLIC_SUPABASE_URL ?? '')
  .replace(/^https?:\/\//, '')
  .split('/')[0];

const CSP = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'`,           // Astro inline hydration
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' https://fonts.gstatic.com`,
  `img-src 'self' data: blob: https://${supabaseHost} https://storage.googleapis.com`,
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}`,
  `frame-src https://www.youtube.com https://player.vimeo.com`,
  `media-src 'self' https://${supabaseHost}`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
].join('; ');

function addSecurityHeaders(res: Response): Response {
  res.headers.set('Content-Security-Policy', CSP);
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return res;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, request, redirect } = context;
  const pathname = url.pathname;

  const isLoginPage = pathname === '/admin/login' || pathname === '/admin/login/';
  const isAdminRoute = pathname.startsWith('/admin') && !isLoginPage;
  const isAdminApiRoute = pathname.startsWith('/api/admin');

  // Skip middleware for public routes (but still add security headers)
  if (!isAdminRoute && !isAdminApiRoute && !isLoginPage) {
    const res = await next();
    return addSecurityHeaders(res);
  }

  try {
    const supabase = createSupabaseServerClient(context);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // If already logged in and visiting login page, redirect to dashboard
    if (isLoginPage) {
      if (user) {
        const { data: adminRecord } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (adminRecord) {
          return addSecurityHeaders(redirect('/admin'));
        }
      }
      return addSecurityHeaders(await next());
    }

    // Unauthorized check for admin routes
    if (authError || !user) {
      if (isAdminApiRoute) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Sesi tidak ditemukan' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return redirect('/admin/login');
    }

    // Verify membership in admin_users
    const { data: adminRecord, error: adminError } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminError || !adminRecord) {
      if (isAdminApiRoute) {
        return new Response(JSON.stringify({ error: 'Forbidden: Bukan akun administrator' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      await supabase.auth.signOut();
      return redirect('/admin/login?error=unauthorized');
    }

    context.locals.user = user;
    const res = await next();
    return addSecurityHeaders(res);
  } catch (err) {
    if (isAdminApiRoute) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Autentikasi gagal' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return redirect('/admin/login');
  }
});
