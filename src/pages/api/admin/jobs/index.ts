export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { jobSchema } from '../../../../lib/validation';

export const GET: APIRoute = async (context) => {
  const supabase = createSupabaseServerClient(context);
  const { data, error } = await supabase
    .from('jobs')
    .select('*, logo:media(id, url, alt)')
    .order('sort_order', { ascending: true })
    .order('start_date', { ascending: false });

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
    const parsed = jobSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message || 'Input tidak valid' }), {
        status: 400,
      });
    }

    const supabase = createSupabaseServerClient(context);
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
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
