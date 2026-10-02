export const prerender = false;

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Email atau kata sandi tidak valid.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { email, password } = parsed.data;
    const supabase = createSupabaseServerClient(context);

    // Sign in with password
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      // Generic error message - does not reveal if email is registered
      return new Response(
        JSON.stringify({ error: 'Email atau kata sandi tidak valid.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is an admin
    const { data: adminRecord, error: adminCheckError } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (adminCheckError || !adminRecord) {
      // Sign out unauthorized user
      await supabase.auth.signOut();
      return new Response(
        JSON.stringify({ error: 'Akses ditolak: Akun Anda bukan administrator.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, redirect: '/admin' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Terjadi kesalahan sistem. Silakan coba lagi.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
