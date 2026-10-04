import { useState, useEffect } from 'preact/hooks';
import { pageSchema, isValidVideoUrl, getVideoEmbedUrl } from '../../lib/validation';
import { MediaModal, type MediaItem } from './MediaModal';
import { showToast, ToastContainer } from './Toast';

export interface Block {
  id: string;
  type:
    | 'heading'
    | 'rich_text'
    | 'image'
    | 'gallery'
    | 'project_grid'
    | 'job_timeline'
    | 'video_embed'
    | 'cta'
    | 'divider';
  data: Record<string, any>;
}

export interface CustomPage {
  id: string;
  slug: string;
  title: string;
  blocks: Block[];
  seo: {
    title?: string | null;
    description?: string | null;
    og_image?: string | null;
  };
  show_in_nav: boolean;
  nav_order: number;
  status: 'draft' | 'published';
  updated_at: string;
}

export function PageBuilder() {
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'list' | 'editor'>('list');
  const [activePageId, setActivePageId] = useState<string | null>(null);

  // Editor form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [showInNav, setShowInNav] = useState(false);
  const [navOrder, setNavOrder] = useState(0);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoOgImage, setSeoOgImage] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);

  // Preview overlay state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<CustomPage | null>(null);

  // Media picker target: { type: 'og' | 'block-image' | 'block-gallery', blockIndex?: number }
  const [mediaTarget, setMediaTarget] = useState<{
    type: 'og' | 'block-image' | 'block-gallery';
    blockIndex?: number;
  } | null>(null);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pages');
      if (res.ok) {
        const data = await res.json();
        setPages(data);
      }
    } catch (err) {
      showToast('Gagal memuat daftar halaman', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const openCreatePage = () => {
    setActivePageId(null);
    setTitle('');
    setSlug('');
    setStatus('draft');
    setShowInNav(false);
    setNavOrder(pages.length + 1);
    setSeoTitle('');
    setSeoDescription('');
    setSeoOgImage('');
    setBlocks([]);
    setMode('editor');
  };

  const openEditPage = (page: CustomPage) => {
    setActivePageId(page.id);
    setTitle(page.title);
    setSlug(page.slug);
    setStatus(page.status);
    setShowInNav(Boolean(page.show_in_nav));
    setNavOrder(page.nav_order || 0);
    setSeoTitle(page.seo?.title || '');
    setSeoDescription(page.seo?.description || '');
    setSeoOgImage(page.seo?.og_image || '');
    setBlocks(page.blocks || []);
    setMode('editor');
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!activePageId && !slug) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      );
    }
  };

  // Block management
  const addBlock = (type: Block['type']) => {
    const newId = Math.random().toString(36).slice(2);
    let defaultData: Record<string, any> = {};

    switch (type) {
      case 'heading':
        defaultData = { text: 'Subjudul Halaman', level: 'h2', align: 'left' };
        break;
      case 'rich_text':
        defaultData = { content: 'Tulis paragraf naratif atau markdown di sini...' };
        break;
      case 'image':
        defaultData = { url: '', alt: '', caption: '' };
        break;
      case 'gallery':
        defaultData = { images: [], columns: 3 };
        break;
      case 'project_grid':
        defaultData = { title: 'Karya Terkait', mode: 'featured' };
        break;
      case 'job_timeline':
        defaultData = { title: 'Pengalaman Terkait' };
        break;
      case 'video_embed':
        defaultData = { url: '', caption: '' };
        break;
      case 'cta':
        defaultData = {
          title: 'Siap Berkolaborasi?',
          subtitle: 'Hubungi saya untuk diskusi lebih lanjut.',
          button_text: 'Hubungi Sekarang',
          button_url: '/#kontak',
          style: 'primary',
        };
        break;
      case 'divider':
        defaultData = { style: 'line' };
        break;
    }

    setBlocks((prev) => [...prev, { id: newId, type, data: defaultData }]);
  };

  const updateBlockData = (index: number, key: string, val: any) => {
    setBlocks((prev) =>
      prev.map((b, i) => (i === index ? { ...b, data: { ...b.data, [key]: val } } : b))
    );
  };

  const removeBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= blocks.length) return;
    const list = [...blocks];
    const temp = list[index];
    list[index] = list[target];
    list[target] = temp;
    setBlocks(list);
  };

  const handleSave = async (targetStatus?: 'draft' | 'published') => {
    const currentStatus = targetStatus || status;

    const payload = {
      title,
      slug,
      blocks,
      seo: {
        title: seoTitle || undefined,
        description: seoDescription || undefined,
        og_image: seoOgImage || undefined,
      },
      show_in_nav: showInNav,
      nav_order: navOrder,
      status: currentStatus,
    };

    const parsed = pageSchema.safeParse(payload);
    if (!parsed.success) {
      showToast(parsed.error.issues[0]?.message || 'Input tidak valid', 'error');
      return;
    }

    // Video URL validation
    for (const b of blocks) {
      if (b.type === 'video_embed' && b.data.url) {
        if (!isValidVideoUrl(b.data.url)) {
          showToast(
            'URL video hanya boleh dari YouTube atau Vimeo yang terverifikasi',
            'error'
          );
          return;
        }
      }
    }

    try {
      const url = activePageId ? `/api/admin/pages/${activePageId}` : '/api/admin/pages';
      const method = activePageId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan');

      showToast(
        currentStatus === 'published'
          ? 'Halaman berhasil dipublikasikan!'
          : 'Draf halaman berhasil disimpan!'
      );
      setStatus(currentStatus);
      if (!activePageId && data.id) {
        setActivePageId(data.id);
      }
      fetchPages();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/pages/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus');
      showToast('Halaman berhasil dihapus');
      setDeleteTarget(null);
      fetchPages();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div class="space-y-6 font-mono text-xs">
      <ToastContainer />

      {mode === 'list' ? (
        /* ==================== LIST VIEW ==================== */
        <div class="space-y-6">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E7E5E4] pb-5">
            <div>
              <h1 class="font-serif text-3xl font-bold text-[#1C1917]">Halaman Kustom (Page Builder)</h1>
              <p class="text-[#78716C] mt-1">
                Total: {pages.length} halaman • Rute dinamis /p/[slug] berbasis block modular
              </p>
            </div>
            <button
              onClick={openCreatePage}
              class="px-4 py-2.5 bg-[#EA580C] text-white uppercase tracking-wider font-bold hover:bg-[#1C1917] transition-all btn-micro"
            >
              + Buat Halaman Baru
            </button>
          </div>

          {loading ? (
            <div class="p-12 text-center text-[#78716C]">Memuat daftar halaman...</div>
          ) : pages.length === 0 ? (
            <div class="p-12 text-center border border-dashed border-[#E7E5E4] text-[#78716C]">
              Belum ada halaman kustom. Buat halaman baru dengan klik tombol di atas.
            </div>
          ) : (
            <div class="border border-[#E7E5E4] bg-white overflow-x-auto">
              <table class="w-full text-left">
                <thead class="bg-[#FBFBF9] border-b border-[#E7E5E4] uppercase tracking-wider text-[#78716C]">
                  <tr>
                    <th class="p-4">Judul &amp; URL</th>
                    <th class="p-4">Jumlah Block</th>
                    <th class="p-4">Navbar</th>
                    <th class="p-4">Status</th>
                    <th class="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#E7E5E4]">
                  {pages.map((p) => (
                    <tr key={p.id} class="hover:bg-[#FBFBF9] transition-colors">
                      <td class="p-4">
                        <div class="font-serif font-bold text-sm text-[#1C1917]">{p.title}</div>
                        <a
                          href={`/p/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="text-[#EA580C] hover:underline"
                        >
                          /p/{p.slug} ↗
                        </a>
                      </td>
                      <td class="p-4 text-[#78716C]">{(p.blocks || []).length} blocks</td>
                      <td class="p-4">
                        {p.show_in_nav ? (
                          <span class="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
                            ✓ Tampil (Urutan #{p.nav_order})
                          </span>
                        ) : (
                          <span class="text-[#78716C] text-[10px]">Tidak</span>
                        )}
                      </td>
                      <td class="p-4">
                        <span
                          class={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                            p.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td class="p-4 text-right space-x-2">
                        <button
                          onClick={() => openEditPage(p)}
                          class="px-3 py-1 bg-[#FBFBF9] border border-[#E7E5E4] hover:border-[#1C1917] text-[#1C1917]"
                        >
                          Edit Builder
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          class="px-3 py-1 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ==================== EDITOR / PAGE BUILDER VIEW ==================== */
        <div class="space-y-8">
          {/* Top Bar Navigation */}
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E7E5E4] pb-4">
            <div class="flex items-center gap-3">
              <button
                onClick={() => setMode('list')}
                class="px-3 py-1.5 border border-[#E7E5E4] hover:bg-gray-100 text-[#1C1917]"
              >
                ← Kembali
              </button>
              <h2 class="font-serif font-bold text-xl text-[#1C1917]">
                {activePageId ? `Edit Halaman: ${title || slug}` : 'Buat Halaman Kustom Baru'}
              </h2>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                class="px-4 py-2 border border-[#1C1917] bg-white text-[#1C1917] font-bold hover:bg-[#FBFBF9]"
              >
                Pratinjau
              </button>
              <button
                type="button"
                onClick={() => handleSave('draft')}
                class="px-4 py-2 bg-gray-200 text-[#1C1917] font-bold hover:bg-gray-300"
              >
                Simpan Draf
              </button>
              <button
                type="button"
                onClick={() => handleSave('published')}
                class="px-5 py-2 bg-[#EA580C] text-white font-bold uppercase hover:bg-[#1C1917]"
              >
                Publikasikan
              </button>
            </div>
          </div>

          {/* Meta & SEO Settings */}
          <div class="bg-white border border-[#E7E5E4] p-6 space-y-6">
            <h3 class="font-serif font-bold text-base text-[#1C1917] border-b border-[#E7E5E4] pb-2">
              1. Pengaturan Halaman &amp; Navigasi
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block font-semibold uppercase text-[#1C1917]">Judul Halaman *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onInput={(e) => handleTitleChange((e.target as HTMLInputElement).value)}
                  placeholder="Misal: Cerita Advokasi & Kampanye"
                  class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
                />
              </div>

              <div class="space-y-1">
                <label class="block font-semibold uppercase text-[#1C1917]">Slug URL (/p/[slug]) *</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onInput={(e) => setSlug((e.target as HTMLInputElement).value)}
                  placeholder="cerita-advokasi"
                  class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
                />
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-6 border-t border-[#E7E5E4] pt-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInNav}
                  onChange={(e) => setShowInNav((e.target as HTMLInputElement).checked)}
                  class="accent-[#EA580C]"
                />
                <span>Tampilkan di Navbar Publik</span>
              </label>

              {showInNav && (
                <div class="flex items-center gap-2">
                  <span>Urutan Nav:</span>
                  <input
                    type="number"
                    value={navOrder}
                    onInput={(e) => setNavOrder(parseInt((e.target as HTMLInputElement).value, 10) || 0)}
                    class="w-20 bg-[#FBFBF9] border border-[#E7E5E4] p-1.5"
                  />
                </div>
              )}

              <div class="flex items-center gap-2 ml-auto">
                <span>Status:</span>
                <span
                  class={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                    status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {status}
                </span>
              </div>
            </div>

            {/* SEO Collapsible */}
            <div class="border-t border-[#E7E5E4] pt-4 space-y-4">
              <h4 class="font-bold text-[#78716C] uppercase text-[10px] tracking-wider">
                Meta SEO &amp; OpenGraph (Opsional)
              </h4>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="block text-[11px] text-[#1C1917]">SEO Title Tag</label>
                  <input
                    type="text"
                    value={seoTitle}
                    onInput={(e) => setSeoTitle((e.target as HTMLInputElement).value)}
                    placeholder={title || 'Judul Halaman...'}
                    class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2 text-[#1C1917]"
                  />
                </div>

                <div class="space-y-1">
                  <label class="block text-[11px] text-[#1C1917]">OG Image URL</label>
                  <div class="flex gap-2">
                    <input
                      type="url"
                      value={seoOgImage}
                      onInput={(e) => setSeoOgImage((e.target as HTMLInputElement).value)}
                      placeholder="https://..."
                      class="flex-1 bg-[#FBFBF9] border border-[#E7E5E4] p-2 text-[#1C1917]"
                    />
                    <button
                      type="button"
                      onClick={() => setMediaTarget({ type: 'og' })}
                      class="px-2.5 py-1 border border-[#1C1917] hover:bg-gray-100"
                    >
                      Pilih
                    </button>
                  </div>
                </div>
              </div>

              <div class="space-y-1">
                <label class="block text-[11px] text-[#1C1917]">Meta Description</label>
                <textarea
                  rows={2}
                  value={seoDescription}
                  onInput={(e) => setSeoDescription((e.target as HTMLTextAreaElement).value)}
                  placeholder="Ringkasan konten untuk mesin pencari Google..."
                  class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2 text-[#1C1917]"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Block Builder Canvas */}
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-serif font-bold text-lg text-[#1C1917]">
                2. Blok Konten ({blocks.length} blok)
              </h3>
              <span class="text-[#78716C] text-[10px]">
                Gunakan tombol ▲ ▼ untuk mengatur urutan blok
              </span>
            </div>

            {/* Block Toolbar */}
            <div class="bg-[#1C1917] p-3 text-white flex flex-wrap gap-2 items-center">
              <span class="text-[10px] uppercase font-bold text-[#EA580C] mr-2">+ Tambah Blok:</span>
              <button
                type="button"
                onClick={() => addBlock('heading')}
                class="px-2.5 py-1 bg-white/10 hover:bg-[#EA580C] text-[11px] transition-colors"
              >
                H Judul
              </button>
              <button
                type="button"
                onClick={() => addBlock('rich_text')}
                class="px-2.5 py-1 bg-white/10 hover:bg-[#EA580C] text-[11px] transition-colors"
              >
                ¶ Markdown Text
              </button>
              <button
                type="button"
                onClick={() => addBlock('image')}
                class="px-2.5 py-1 bg-white/10 hover:bg-[#EA580C] text-[11px] transition-colors"
              >
                [ ] Gambar
              </button>
              <button
                type="button"
                onClick={() => addBlock('gallery')}
                class="px-2.5 py-1 bg-white/10 hover:bg-[#EA580C] text-[11px] transition-colors"
              >
                [ ] Galeri
              </button>
              <button
                type="button"
                onClick={() => addBlock('project_grid')}
                class="px-2.5 py-1 bg-white/10 hover:bg-[#EA580C] text-[11px] transition-colors"
              >
                &lt;&gt; Grid Karya
              </button>
              <button
                type="button"
                onClick={() => addBlock('job_timeline')}
                class="px-2.5 py-1 bg-white/10 hover:bg-[#EA580C] text-[11px] transition-colors"
              >
                — Timeline
              </button>
              <button
                type="button"
                onClick={() => addBlock('video_embed')}
                class="px-2.5 py-1 bg-white/10 hover:bg-[#EA580C] text-[11px] transition-colors"
              >
                ▶ Video
              </button>
              <button
                type="button"
                onClick={() => addBlock('cta')}
                class="px-2.5 py-1 bg-white/10 hover:bg-[#EA580C] text-[11px] transition-colors"
              >
                → Tombol CTA
              </button>
              <button
                type="button"
                onClick={() => addBlock('divider')}
                class="px-2.5 py-1 bg-white/10 hover:bg-[#EA580C] text-[11px] transition-colors"
              >
                ― Pembatas
              </button>
            </div>

            {/* Blocks List */}
            {blocks.length === 0 ? (
              <div class="border border-dashed border-[#E7E5E4] p-12 text-center text-[#78716C] bg-white">
                Halaman ini belum memiliki blok konten. Klik salah satu tombol di toolbar di atas untuk mulai menyusun halaman.
              </div>
            ) : (
              <div class="space-y-4">
                {blocks.map((block, idx) => (
                  <div
                    key={block.id}
                    class="bg-white border border-[#E7E5E4] p-5 shadow-xs hover:border-[#1C1917] transition-all space-y-4"
                  >
                    {/* Block Header */}
                    <div class="flex items-center justify-between border-b border-[#E7E5E4] pb-2 text-[11px]">
                      <div class="flex items-center gap-2">
                        <span class="w-5 h-5 bg-[#1C1917] text-white flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <span class="font-bold uppercase tracking-wider text-[#EA580C]">
                          Blok: {block.type.replace('_', ' ')}
                        </span>
                      </div>

                      <div class="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => moveBlock(idx, 'up')}
                          disabled={idx === 0}
                          class="px-2 py-0.5 border border-[#E7E5E4] hover:bg-gray-100 disabled:opacity-20"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => moveBlock(idx, 'down')}
                          disabled={idx === blocks.length - 1}
                          class="px-2 py-0.5 border border-[#E7E5E4] hover:bg-gray-100 disabled:opacity-20"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBlock(idx)}
                          class="text-red-500 hover:text-red-700 ml-2 font-bold"
                        >
                          Hapus Blok ✕
                        </button>
                      </div>
                    </div>

                    {/* Block Fields based on type */}
                    {block.type === 'heading' && (
                      <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div class="sm:col-span-7">
                          <input
                            type="text"
                            value={block.data.text || ''}
                            onInput={(e) =>
                              updateBlockData(idx, 'text', (e.target as HTMLInputElement).value)
                            }
                            placeholder="Tulis judul bagian..."
                            class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2 text-[#1C1917] font-serif font-bold text-lg"
                          />
                        </div>
                        <div class="sm:col-span-3">
                          <select
                            value={block.data.level || 'h2'}
                            onChange={(e) =>
                              updateBlockData(idx, 'level', (e.target as HTMLSelectElement).value)
                            }
                            class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2"
                          >
                            <option value="h1">H1 (Ukuran Terbesar)</option>
                            <option value="h2">H2 (Subjudul Utama)</option>
                            <option value="h3">H3 (Subjudul Kecil)</option>
                          </select>
                        </div>
                        <div class="sm:col-span-2">
                          <select
                            value={block.data.align || 'left'}
                            onChange={(e) =>
                              updateBlockData(idx, 'align', (e.target as HTMLSelectElement).value)
                            }
                            class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2"
                          >
                            <option value="left">Rata Kiri</option>
                            <option value="center">Tengah</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {block.type === 'rich_text' && (
                      <div class="space-y-2">
                        <textarea
                          rows={6}
                          value={block.data.content || ''}
                          onInput={(e) =>
                            updateBlockData(idx, 'content', (e.target as HTMLTextAreaElement).value)
                          }
                          placeholder="Markdown didukung: **tebal**, _miring_, [tautan](url), daftar bullet, kutipan..."
                          class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-3 text-[#1C1917] font-mono"
                        ></textarea>
                      </div>
                    )}

                    {block.type === 'image' && (
                      <div class="space-y-3">
                        <div class="flex items-center gap-4">
                          {block.data.url ? (
                            <img
                              src={block.data.url}
                              alt={block.data.alt}
                              class="w-24 h-16 object-cover border border-[#E7E5E4]"
                            />
                          ) : (
                            <div class="w-24 h-16 border border-dashed border-[#E7E5E4] flex items-center justify-center text-[10px] text-[#78716C]">
                              Belum ada
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setMediaTarget({ type: 'block-image', blockIndex: idx })}
                            class="px-3 py-2 border border-[#1C1917] hover:bg-[#1C1917] hover:text-white"
                          >
                            Pilih dari Media Library
                          </button>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={block.data.alt || ''}
                            onInput={(e) =>
                              updateBlockData(idx, 'alt', (e.target as HTMLInputElement).value)
                            }
                            placeholder="Alt text gambar (wajib untuk aksesibilitas)..."
                            class="bg-[#FBFBF9] border border-[#E7E5E4] p-2"
                          />
                          <input
                            type="text"
                            value={block.data.caption || ''}
                            onInput={(e) =>
                              updateBlockData(idx, 'caption', (e.target as HTMLInputElement).value)
                            }
                            placeholder="Keterangan gambar (caption opsional)..."
                            class="bg-[#FBFBF9] border border-[#E7E5E4] p-2"
                          />
                        </div>
                      </div>
                    )}

                    {block.type === 'gallery' && (
                      <div class="space-y-3">
                        <div class="flex items-center justify-between">
                          <span class="text-[11px] text-[#78716C]">
                            {(block.data.images || []).length} gambar dalam galeri
                          </span>
                          <button
                            type="button"
                            onClick={() => setMediaTarget({ type: 'block-gallery', blockIndex: idx })}
                            class="px-3 py-1.5 border border-[#1C1917] hover:bg-[#1C1917] hover:text-white"
                          >
                            + Tambah Foto ke Galeri
                          </button>
                        </div>

                        {(block.data.images || []).length > 0 && (
                          <div class="flex flex-wrap gap-2 p-2 bg-[#FBFBF9] border border-[#E7E5E4]">
                            {block.data.images.map((img: any, i: number) => (
                              <div key={i} class="relative w-20 h-16 border border-[#E7E5E4]">
                                <img src={img.url} alt={img.alt} class="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = block.data.images.filter((_: any, idx2: number) => idx2 !== i);
                                    updateBlockData(idx, 'images', next);
                                  }}
                                  class="absolute top-0 right-0 bg-red-600 text-white w-4 h-4 text-[9px] flex items-center justify-center"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {block.type === 'project_grid' && (
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={block.data.title || ''}
                          onInput={(e) =>
                            updateBlockData(idx, 'title', (e.target as HTMLInputElement).value)
                          }
                          placeholder="Judul bagian (misal: Karya Pilihan)"
                          class="bg-[#FBFBF9] border border-[#E7E5E4] p-2"
                        />
                        <select
                          value={block.data.mode || 'featured'}
                          onChange={(e) =>
                            updateBlockData(idx, 'mode', (e.target as HTMLSelectElement).value)
                          }
                          class="bg-[#FBFBF9] border border-[#E7E5E4] p-2"
                        >
                          <option value="featured">Hanya Project Featured</option>
                          <option value="all">Semua Project Terbit</option>
                        </select>
                      </div>
                    )}

                    {block.type === 'job_timeline' && (
                      <div>
                        <input
                          type="text"
                          value={block.data.title || ''}
                          onInput={(e) =>
                            updateBlockData(idx, 'title', (e.target as HTMLInputElement).value)
                          }
                          placeholder="Judul Bagian Timeline (misal: Riwayat Pengalaman & K3)"
                          class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2"
                        />
                      </div>
                    )}

                    {block.type === 'video_embed' && (
                      <div class="space-y-2">
                        <input
                          type="url"
                          value={block.data.url || ''}
                          onInput={(e) =>
                            updateBlockData(idx, 'url', (e.target as HTMLInputElement).value)
                          }
                          placeholder="https://www.youtube.com/watch?v=... atau https://vimeo.com/..."
                          class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2"
                        />
                        <p class="text-[10px] text-[#78716C]">
                          Whitelist keamanan PRD: Hanya URL YouTube atau Vimeo yang diizinkan.
                        </p>
                      </div>
                    )}

                    {block.type === 'cta' && (
                      <div class="space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={block.data.title || ''}
                            onInput={(e) =>
                              updateBlockData(idx, 'title', (e.target as HTMLInputElement).value)
                            }
                            placeholder="Judul Call to Action"
                            class="bg-[#FBFBF9] border border-[#E7E5E4] p-2 font-bold"
                          />
                          <input
                            type="text"
                            value={block.data.subtitle || ''}
                            onInput={(e) =>
                              updateBlockData(idx, 'subtitle', (e.target as HTMLInputElement).value)
                            }
                            placeholder="Subteks ajakan..."
                            class="bg-[#FBFBF9] border border-[#E7E5E4] p-2"
                          />
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={block.data.button_text || ''}
                            onInput={(e) =>
                              updateBlockData(idx, 'button_text', (e.target as HTMLInputElement).value)
                            }
                            placeholder="Teks Tombol (misal: Hubungi Sekarang)"
                            class="bg-[#FBFBF9] border border-[#E7E5E4] p-2"
                          />
                          <input
                            type="text"
                            value={block.data.button_url || ''}
                            onInput={(e) =>
                              updateBlockData(idx, 'button_url', (e.target as HTMLInputElement).value)
                            }
                            placeholder="URL Tujuan (misal: /#kontak atau https://wa.me/...)"
                            class="bg-[#FBFBF9] border border-[#E7E5E4] p-2"
                          />
                        </div>
                      </div>
                    )}

                    {block.type === 'divider' && (
                      <div class="flex items-center gap-4">
                        <span>Gaya Pembatas:</span>
                        <select
                          value={block.data.style || 'line'}
                          onChange={(e) =>
                            updateBlockData(idx, 'style', (e.target as HTMLSelectElement).value)
                          }
                          class="bg-[#FBFBF9] border border-[#E7E5E4] p-1.5"
                        >
                          <option value="line">Garis Tipis (#E7E5E4)</option>
                          <option value="dots">Tiga Titik Aksen (• • •)</option>
                          <option value="spacing">Spasi Kosong Ekstra</option>
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Page Confirmation Modal */}
      {deleteTarget && (
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div class="bg-white border border-red-300 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 class="font-serif text-lg font-bold text-red-600">Hapus Halaman</h3>
            <p class="text-[#1C1917]">
              Yakin ingin menghapus halaman <strong>"{deleteTarget.title}"</strong> (/p/{deleteTarget.slug})?
            </p>
            <div class="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                class="px-4 py-2 border border-[#E7E5E4] hover:bg-gray-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                class="px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700"
              >
                Hapus Halaman
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {isPreviewOpen && (
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div class="bg-[#FBFBF9] border border-[#E7E5E4] max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div class="flex items-center justify-between p-4 bg-white border-b border-[#E7E5E4]">
              <div>
                <span class="text-[10px] uppercase font-bold text-[#EA580C]">
                  Mode Pratinjau Editorial (Situs Publik)
                </span>
                <h4 class="font-serif font-bold text-sm text-[#1C1917]">/p/{slug || 'contoh-slug'}</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                class="px-3 py-1 bg-[#1C1917] text-white hover:bg-[#EA580C]"
              >
                Tutup Pratinjau ✕
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-6 md:p-12 space-y-12">
              {/* Header Page */}
              <div class="border-b border-[#E7E5E4] pb-6 space-y-2">
                <span class="text-xs font-mono uppercase tracking-widest text-[#EA580C]">Halaman</span>
                <h1 class="font-serif text-3xl md:text-5xl font-bold text-[#1C1917]">
                  {title || 'Judul Halaman'}
                </h1>
              </div>

              {/* Render Blocks */}
              <div class="space-y-10">
                {blocks.map((block) => (
                  <div key={block.id}>
                    {block.type === 'heading' && (
                      <h2
                        class={`font-serif font-bold text-[#1C1917] ${
                          block.data.level === 'h1'
                            ? 'text-3xl md:text-4xl'
                            : block.data.level === 'h3'
                            ? 'text-xl'
                            : 'text-2xl md:text-3xl'
                        } ${block.data.align === 'center' ? 'text-center' : 'text-left'}`}
                      >
                        {block.data.text}
                      </h2>
                    )}

                    {block.type === 'rich_text' && (
                      <div class="prose max-w-none text-[#78716C] leading-relaxed whitespace-pre-wrap font-sans text-sm">
                        {block.data.content}
                      </div>
                    )}

                    {block.type === 'image' && block.data.url && (
                      <figure class="space-y-2">
                        <img
                          src={block.data.url}
                          alt={block.data.alt}
                          class="w-full max-h-[500px] object-cover border border-[#E7E5E4]"
                        />
                        {block.data.caption && (
                          <figcaption class="text-center text-[11px] text-[#78716C] italic">
                            {block.data.caption}
                          </figcaption>
                        )}
                      </figure>
                    )}

                    {block.type === 'gallery' && (block.data.images || []).length > 0 && (
                      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {block.data.images.map((img: any, i: number) => (
                          <img
                            key={i}
                            src={img.url}
                            alt={img.alt}
                            class="w-full aspect-video object-cover border border-[#E7E5E4]"
                          />
                        ))}
                      </div>
                    )}

                    {block.type === 'video_embed' && block.data.url && (
                      <div class="aspect-video w-full bg-black border border-[#E7E5E4]">
                        <iframe
                          src={getVideoEmbedUrl(block.data.url) || ''}
                          class="w-full h-full"
                          allowFullScreen
                        ></iframe>
                      </div>
                    )}

                    {block.type === 'cta' && (
                      <div class="bg-[#1C1917] text-white p-8 text-center space-y-4">
                        <h3 class="font-serif text-2xl font-bold">{block.data.title}</h3>
                        <p class="text-gray-400 text-xs">{block.data.subtitle}</p>
                        <a
                          href={block.data.button_url}
                          class="inline-block px-6 py-3 bg-[#EA580C] text-white uppercase tracking-wider font-bold hover:bg-white hover:text-[#1C1917] transition-all"
                        >
                          {block.data.button_text}
                        </a>
                      </div>
                    )}

                    {block.type === 'divider' && (
                      <hr class="border-t border-[#E7E5E4] my-8" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      <MediaModal
        isOpen={Boolean(mediaTarget)}
        onClose={() => setMediaTarget(null)}
        onSelect={(media: MediaItem) => {
          if (!mediaTarget) return;
          if (mediaTarget.type === 'og') {
            setSeoOgImage(media.url);
          } else if (mediaTarget.type === 'block-image' && typeof mediaTarget.blockIndex === 'number') {
            updateBlockData(mediaTarget.blockIndex, 'url', media.url);
            updateBlockData(mediaTarget.blockIndex, 'alt', media.alt);
          } else if (mediaTarget.type === 'block-gallery' && typeof mediaTarget.blockIndex === 'number') {
            const current = blocks[mediaTarget.blockIndex]?.data.images || [];
            updateBlockData(mediaTarget.blockIndex, 'images', [
              ...current,
              { url: media.url, alt: media.alt },
            ]);
          }
          setMediaTarget(null);
        }}
      />
    </div>
  );
}
