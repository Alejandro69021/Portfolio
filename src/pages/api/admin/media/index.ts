export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';

export const GET: APIRoute = async (context) => {
  const supabase = createSupabaseServerClient(context);
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .order('created_at', { ascending: false });

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
    const formData = await context.request.formData();
    const file = formData.get('file') as File | null;
    const alt = (formData.get('alt') as string)?.trim();
    const widthStr = formData.get('width') as string | null;
    const heightStr = formData.get('height') as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'File gambar wajib diunggah' }), { status: 400 });
    }

    if (!alt) {
      return new Response(JSON.stringify({ error: 'Deskripsi alternatif (alt text) wajib diisi' }), { status: 400 });
    }

    // Verify file size limit (2MB)
    if (file.size > 2 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Ukuran file melebihi batas 2MB' }), { status: 400 });
    }

    const supabase = createSupabaseServerClient(context);

    // Generate safe unique filename
    const ext = file.name.split('.').pop() || 'webp';
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    const fileName = `${Date.now()}-${cleanName}.${ext}`;
    const storagePath = `uploads/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage bucket 'portfolio-media'
    const { error: uploadError } = await supabase.storage
      .from('portfolio-media')
      .upload(storagePath, buffer, {
        contentType: file.type || 'image/webp',
        upsert: false,
      });

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), { status: 400 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('portfolio-media')
      .getPublicUrl(storagePath);

    // Insert record in media table
    const { data: mediaRow, error: dbError } = await supabase
      .from('media')
      .insert({
        path: storagePath,
        url: publicUrl,
        alt,
        width: widthStr ? parseInt(widthStr, 10) : null,
        height: heightStr ? parseInt(heightStr, 10) : null,
      })
      .select()
      .single();

    if (dbError) {
      return new Response(JSON.stringify({ error: dbError.message }), { status: 400 });
    }

    return new Response(JSON.stringify(mediaRow), {
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
  const force = url.searchParams.get('force') === 'true';

  if (!id) return new Response(JSON.stringify({ error: 'ID media tidak ditemukan' }), { status: 400 });

  const supabase = createSupabaseServerClient(context);

  // Check if media is currently used in projects, jobs, events, or event_media
  const [projRes, jobRes, eventRes, eventMediaRes] = await Promise.all([
    supabase.from('projects').select('title').eq('cover_media', id),
    supabase.from('jobs').select('role').eq('logo_media', id),
    supabase.from('events').select('title').eq('cover_media', id),
    supabase.from('event_media').select('event_id').eq('media_id', id),
  ]);

  const usages: string[] = [];
  projRes.data?.forEach(p => usages.push(`Project: ${p.title}`));
  jobRes.data?.forEach(j => usages.push(`Job: ${j.role}`));
  eventRes.data?.forEach(e => usages.push(`Event: ${e.title}`));
  if (eventMediaRes.data && eventMediaRes.data.length > 0) {
    usages.push(`Galeri Event (${eventMediaRes.data.length} gambar)`);
  }

  if (usages.length > 0 && !force) {
    return new Response(
      JSON.stringify({
        warning: true,
        message: `Media ini sedang digunakan di: ${usages.join(', ')}. Tetap hapus?`,
        usages,
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Get media record to obtain path
  const { data: mediaRecord } = await supabase.from('media').select('path').eq('id', id).maybeSingle();

  // Delete from DB
  const { error: dbError } = await supabase.from('media').delete().eq('id', id);
  if (dbError) {
    return new Response(JSON.stringify({ error: dbError.message }), { status: 400 });
  }

  // Delete from storage if path exists
  if (mediaRecord?.path) {
    await supabase.storage.from('portfolio-media').remove([mediaRecord.path]);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
