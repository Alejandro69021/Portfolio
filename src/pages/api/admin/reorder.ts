export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

const allowedTables = ['projects', 'jobs', 'events', 'event_categories'];

export const POST: APIRoute = async (context) => {
  try {
    const { table, items } = await context.request.json();

    if (!allowedTables.includes(table)) {
      return new Response(JSON.stringify({ error: 'Tabel tidak diizinkan' }), { status: 400 });
    }

    if (!Array.isArray(items)) {
      return new Response(JSON.stringify({ error: 'Items harus berupa array' }), { status: 400 });
    }

    const supabase = createSupabaseServerClient(context);

    // Update each item's sort_order
    for (const item of items) {
      if (item.id && typeof item.sort_order === 'number') {
        await supabase
          .from(table)
          .update({ sort_order: item.sort_order, updated_at: new Date().toISOString() })
          .eq('id', item.id);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Server error' }), { status: 500 });
  }
};
