export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { pageSchema } from '../../../../lib/validation';

export const GET: APIRoute = async (context) => {
  const id = context.params.id;
  if (!id) return new Response(JSON.stringify({ error: 'ID tidak ditemukan' }), { status: 400 });

  const supabase = createSupabaseServerClient(context);
  const { data, error } = await supabase.from('pages').select('*').eq('id', id).maybeSingle();

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Halaman tidak ditemukan' }), { status: 404 });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async (context) => {
  const id = context.params.id;
  if (!id) return new Response(JSON.stringify({ error: 'ID tidak ditemukan' }), { status: 400 });

  try {
    const body = await context.request.json();
    const parsed = pageSchema.partial().safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message || 'Input tidak valid' }),
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient(context);
    const { data, error } = await supabase
      .from('pages')
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Server error' }), { status: 500 });
  }
};

export const DELETE: APIRoute = async (context) => {
  const id = context.params.id;
  if (!id) return new Response(JSON.stringify({ error: 'ID tidak ditemukan' }), { status: 400 });

  const supabase = createSupabaseServerClient(context);
  const { error } = await supabase.from('pages').delete().eq('id', id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
