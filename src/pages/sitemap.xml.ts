export const prerender = false;

import type { APIRoute } from 'astro';
import { getPublicSupabase } from '../lib/supabase/server';

export const GET: APIRoute = async (context) => {
  const origin = context.url.origin;
  let customPages: Array<{ slug: string; updated_at?: string }> = [];

  try {
    const supabase = getPublicSupabase();
    const { data } = await supabase
      .from('pages')
      .select('slug, updated_at')
      .eq('status', 'published');

    if (data) {
      customPages = data;
    }
  } catch (err) {
    console.error('Error generating sitemap:', err);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${origin}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Published Custom Pages -->
  ${customPages
    .map(
      (p) => `
  <url>
    <loc>${origin}/p/${p.slug}</loc>
    <lastmod>${p.updated_at ? new Date(p.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join('')}
</urlset>`;

  return new Response(sitemap.trim(), {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
