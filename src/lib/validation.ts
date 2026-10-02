import { z } from 'zod';

export const projectSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug wajib diisi')
    .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan strip (-)'),
  title: z.string().min(1, 'Judul wajib diisi'),
  subtitle: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  features: z.array(z.string()).default([]),
  stack: z.array(z.string()).default([]),
  links: z.record(z.string(), z.any()).default({}),
  cover_media: z.string().uuid().optional().nullable(),
  featured: z.boolean().default(false),
  status: z.enum(['draft', 'published']).default('draft'),
  sort_order: z.number().int().default(0),
});

export const jobSchema = z.object({
  role: z.string().min(1, 'Peran / posisi wajib diisi'),
  org: z.string().min(1, 'Organisasi / instansi wajib diisi'),
  location: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  is_current: z.boolean().default(false),
  description: z.string().optional().nullable(),
  highlights: z.array(z.string()).default([]),
  logo_media: z.string().uuid().optional().nullable(),
  status: z.enum(['draft', 'published']).default('draft'),
  sort_order: z.number().int().default(0),
});

export const eventSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug wajib diisi')
    .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan strip (-)'),
  title: z.string().min(1, 'Judul event wajib diisi'),
  category_id: z.string().uuid().optional().nullable(),
  event_date: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  camera: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  cover_media: z.string().uuid().optional().nullable(),
  status: z.enum(['draft', 'published']).default('draft'),
  sort_order: z.number().int().default(0),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi'),
  sort_order: z.number().int().default(0),
});

export const mediaSchema = z.object({
  alt: z.string().min(1, 'Alt text wajib diisi untuk aksesibilitas'),
});

export const pageSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug wajib diisi')
    .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan strip (-)'),
  title: z.string().min(1, 'Judul halaman wajib diisi'),
  blocks: z.array(z.record(z.string(), z.any())).default([]),
  seo: z
    .object({
      title: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      og_image: z.string().optional().nullable(),
    })
    .default({}),
  show_in_nav: z.boolean().default(false),
  nav_order: z.number().int().default(0),
  status: z.enum(['draft', 'published']).default('draft'),
});

/**
 * Whitelist check: only YouTube and Vimeo are permitted for video embed blocks (PRD Bagian 7 poin 5 & 10)
 */
export function isValidVideoUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'youtube.com' ||
      host === 'www.youtube.com' ||
      host === 'youtu.be' ||
      host === 'm.youtube.com' ||
      host === 'vimeo.com' ||
      host === 'www.vimeo.com' ||
      host === 'player.vimeo.com'
    );
  } catch {
    return false;
  }
}

/**
 * Converts YouTube/Vimeo public URL into safe iframe embed URL
 */
export function getVideoEmbedUrl(url: string): string | null {
  if (!isValidVideoUrl(url)) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    // YouTube
    if (host.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
    }
    if (host.includes('youtu.be')) {
      const id = parsed.pathname.slice(1);
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
    }

    // Vimeo
    if (host.includes('vimeo.com')) {
      const match = parsed.pathname.match(/\/(\d+)/);
      if (match && match[1]) {
        return `https://player.vimeo.com/video/${match[1]}`;
      }
    }

    return null;
  } catch {
    return null;
  }
}
