export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { categorySchema } from '../../../../lib/validation';

export const GET: APIRoute = async (context) => {
  const supabase = createSupabaseServerClient(context);
  const { data, error } = await supabase
    .from('event_categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const parsed = categorySchema.safeParse(body);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message || 'Input tidak valid' }), {
        status: 400,
      });
    }

    const supabase = createSupabaseServerClient(context);
    const { data, error } = await supabase
      .from('event_categories')
      .insert(parsed.data)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Server error' }), { status: 500 });
  }
};

export const DELETE: APIRoute = async (context) => {
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'ID tidak ditemukan' }), { status: 400 });

  const supabase = createSupabaseServerClient(context);
  const { error } = await supabase.from('event_categories').delete().eq('id', id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
