import { useState, useEffect } from 'preact/hooks';
import { projectSchema } from '../../lib/validation';
import { MediaModal, type MediaItem } from './MediaModal';
import { showToast, ToastContainer } from './Toast';

interface Project {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  category?: string | null;
  description?: string | null;
  features: string[];
  stack: string[];
  links: Record<string, any>;
  cover_media?: string | null;
  cover?: { id: string; url: string; alt: string } | null;
  featured: boolean;
  status: 'draft' | 'published';
  sort_order: number;
}

export function ProjectManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    slug: '',
    subtitle: '',
    category: '',
    description: '',
    featuresText: '',
    stackText: '',
    client: '',
    url: '',
    interactiveSimulator: false,
    badge: '',
    cover_media: null as string | null,
    cover_url: '',
    cover_alt: '',
    featured: false,
    status: 'draft' as 'draft' | 'published',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      showToast('Gagal memuat data projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const openCreateModal = () => {
    setEditingProject(null);
    setForm({
      title: '',
      slug: '',
      subtitle: '',
      category: '',
      description: '',
      featuresText: '',
      stackText: '',
      client: '',
      url: '',
      interactiveSimulator: false,
      badge: '',
      cover_media: null,
      cover_url: '',
      cover_alt: '',
      featured: false,
      status: 'draft',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (p: Project) => {
    setEditingProject(p);
    setForm({
      title: p.title,
      slug: p.slug,
      subtitle: p.subtitle || '',
      category: p.category || '',
      description: p.description || '',
      featuresText: (p.features || []).join('\n'),
      stackText: (p.stack || []).join(', '),
      client: p.links?.client || '',
      url: p.links?.url || '',
      interactiveSimulator: Boolean(p.links?.interactiveSimulator),
      badge: p.links?.badge || '',
      cover_media: p.cover_media || null,
      cover_url: p.cover?.url || '',
      cover_alt: p.cover?.alt || '',
      featured: Boolean(p.featured),
      status: p.status,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setForm((prev) => {
      const next = { ...prev, title: val };
      if (!editingProject && !prev.slug) {
        next.slug = val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }
      return next;
    });
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    const features = form.featuresText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const stack = form.stackText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      title: form.title,
      slug: form.slug,
      subtitle: form.subtitle || null,
      category: form.category || null,
      description: form.description || null,
      features,
      stack,
      links: {
        client: form.client || undefined,
        url: form.url || undefined,
        interactiveSimulator: form.interactiveSimulator,
        badge: form.badge || undefined,
      },
      cover_media: form.cover_media || null,
      featured: form.featured,
      status: form.status,
    };

    // Client-side Zod validation
    const parsed = projectSchema.safeParse(payload);
    if (!parsed.success) {
      const errMap: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0] as string;
        errMap[key] = issue.message;
      });
      setErrors(errMap);
      showToast('Harap periksa form kembali', 'error');
      return;
    }

    try {
      const url = editingProject
        ? `/api/admin/projects/${editingProject.id}`
        : '/api/admin/projects';
      const method = editingProject ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan');

      showToast(editingProject ? 'Project berhasil diperbarui!' : 'Project baru berhasil dibuat!');
      setIsModalOpen(false);
      fetchProjects();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const toggleStatus = async (p: Project) => {
    const nextStatus = p.status === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch(`/api/admin/projects/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error('Gagal mengubah status');
      showToast(`Status diubah menjadi ${nextStatus}`);
      setProjects((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, status: nextStatus } : item))
      );
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const moveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= projects.length) return;

    const list = [...projects];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const updated = list.map((item, idx) => ({ id: item.id, sort_order: idx + 1 }));
    setProjects(list);

    try {
      await fetch('/api/admin/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'projects', items: updated }),
      });
      showToast('Urutan project diperbarui');
    } catch (err) {
      showToast('Gagal menyimpan urutan', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/projects/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal menghapus');
      showToast('Project berhasil dihapus');
      setDeleteTarget(null);
      fetchProjects();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div class="space-y-6">
      <ToastContainer />

      {/* Header */}
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E7E5E4] pb-5">
        <div>
          <h1 class="font-serif text-3xl font-bold text-[#1C1917]">Kelola Karya / Projects</h1>
          <p class="text-xs font-mono text-[#78716C] mt-1">
            Total: {projects.length} project • {projects.filter((p) => p.status === 'published').length} terbit
          </p>
        </div>
        <button
          onClick={openCreateModal}
          class="px-4 py-2.5 bg-[#EA580C] text-white text-xs font-mono uppercase tracking-wider font-bold hover:bg-[#1C1917] transition-all btn-micro"
        >
          + Tambah Project
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div class="p-12 text-center text-[#78716C] font-mono text-xs">Memuat daftar karya...</div>
      ) : projects.length === 0 ? (
        <div class="p-12 text-center border border-dashed border-[#E7E5E4] text-[#78716C] font-mono text-xs">
          Belum ada data project. Klik tombol "+ Tambah Project" di atas.
        </div>
      ) : (
        <div class="border border-[#E7E5E4] bg-white overflow-x-auto">
          <table class="w-full text-left font-mono text-xs">
            <thead class="bg-[#FBFBF9] border-b border-[#E7E5E4] uppercase tracking-wider text-[#78716C]">
              <tr>
                <th class="p-4 w-12 text-center">Urutan</th>
                <th class="p-4">Judul &amp; Slug</th>
                <th class="p-4">Kategori / Badge</th>
                <th class="p-4">Status</th>
                <th class="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E7E5E4]">
              {projects.map((p, idx) => (
                <tr key={p.id} class="hover:bg-[#FBFBF9] transition-colors">
                  <td class="p-4 text-center">
                    <div class="flex flex-col gap-1 items-center">
                      <button
                        onClick={() => moveOrder(idx, 'up')}
                        disabled={idx === 0}
                        class="text-[#78716C] hover:text-[#EA580C] disabled:opacity-20 text-[10px]"
                      >
                        ▲
                      </button>
                      <span class="text-xs font-bold">{idx + 1}</span>
                      <button
                        onClick={() => moveOrder(idx, 'down')}
                        disabled={idx === projects.length - 1}
                        class="text-[#78716C] hover:text-[#EA580C] disabled:opacity-20 text-[10px]"
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td class="p-4">
                    <div class="font-serif font-bold text-sm text-[#1C1917]">{p.title}</div>
                    <div class="text-[11px] text-[#78716C]">/{p.slug}</div>
                    {p.subtitle && <div class="text-[10px] text-[#78716C] italic">{p.subtitle}</div>}
                  </td>
                  <td class="p-4 text-[11px]">
                    <span class="px-2 py-0.5 bg-[#E7E5E4] text-[#1C1917] inline-block">
                      {p.category || 'General'}
                    </span>
                    {p.featured && (
                      <span class="ml-1.5 px-2 py-0.5 bg-[#EA580C]/10 text-[#EA580C] inline-block font-semibold">
                        ★ Featured
                      </span>
                    )}
                  </td>
                  <td class="p-4">
                    <button
                      onClick={() => toggleStatus(p)}
                      class={`px-2.5 py-1 text-[10px] font-bold uppercase transition-all ${
                        p.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      }`}
                    >
                      {p.status === 'published' ? '● Published' : '○ Draft'}
                    </button>
                  </td>
                  <td class="p-4 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(p)}
                      class="px-3 py-1 bg-[#FBFBF9] border border-[#E7E5E4] hover:border-[#1C1917] text-[#1C1917]"
                    >
                      Edit
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

      {/* Modal Add / Edit Form */}
      {isModalOpen && (
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono text-xs">
          <div class="bg-white border border-[#E7E5E4] max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div class="flex items-center justify-between p-4 border-b border-[#E7E5E4]">
              <h2 class="font-serif font-bold text-lg text-[#1C1917]">
                {editingProject ? 'Edit Project' : 'Tambah Project Baru'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} class="text-base text-[#78716C] hover:text-[#1C1917]">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} class="flex-1 overflow-y-auto p-6 space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="block font-semibold uppercase text-[#1C1917]">Judul Project *</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onInput={(e) => handleTitleChange((e.target as HTMLInputElement).value)}
                    class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
                  />
                  {errors.title && <p class="text-red-500 text-[10px]">{errors.title}</p>}
                </div>

                <div class="space-y-1">
                  <label class="block font-semibold uppercase text-[#1C1917]">Slug (URL) *</label>
                  <input
                    type="text"
                    required
                    value={form.slug}
                    onInput={(e) => setForm({ ...form, slug: (e.target as HTMLInputElement).value })}
                    class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
                  />
                  {errors.slug && <p class="text-red-500 text-[10px]">{errors.slug}</p>}
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="block font-semibold uppercase text-[#1C1917]">Subjudul / Tagline Singkat</label>
                  <input
                    type="text"
                    value={form.subtitle}
                    onInput={(e) => setForm({ ...form, subtitle: (e.target as HTMLInputElement).value })}
                    class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
                  />
                </div>

                <div class="space-y-1">
                  <label class="block font-semibold uppercase text-[#1C1917]">Kategori / Badge</label>
                  <input
                    type="text"
                    value={form.category}
                    onInput={(e) => setForm({ ...form, category: (e.target as HTMLInputElement).value })}
                    placeholder="Misal: Enterprise Health-Tech"
                    class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
                  />
                </div>
              </div>

              <div class="space-y-1">
                <label class="block font-semibold uppercase text-[#1C1917]">Deskripsi Lengkap (Markdown didukung)</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onInput={(e) => setForm({ ...form, description: (e.target as HTMLTextAreaElement).value })}
                  class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
                ></textarea>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="block font-semibold uppercase text-[#1C1917]">Fitur Utama (1 baris per fitur)</label>
                  <textarea
                    rows={3}
                    value={form.featuresText}
                    onInput={(e) => setForm({ ...form, featuresText: (e.target as HTMLTextAreaElement).value })}
                    placeholder="Otomatisasi Laporan Bab I-V&#10;Parsing spreadsheet Puskesmas"
                    class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
                  ></textarea>
                </div>

                <div class="space-y-1">
                  <label class="block font-semibold uppercase text-[#1C1917]">Tech Stack (pisahkan koma)</label>
                  <textarea
                    rows={3}
                    value={form.stackText}
                    onInput={(e) => setForm({ ...form, stackText: (e.target as HTMLTextAreaElement).value })}
                    placeholder="Python, Astro, Tailwind CSS, JavaScript"
                    class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
                  ></textarea>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="block font-semibold uppercase text-[#1C1917]">Klien / Instansi</label>
                  <input
                    type="text"
                    value={form.client}
                    onInput={(e) => setForm({ ...form, client: (e.target as HTMLInputElement).value })}
                    class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
                  />
                </div>

                <div class="space-y-1">
                  <label class="block font-semibold uppercase text-[#1C1917]">URL Live App</label>
                  <input
                    type="url"
                    value={form.url}
                    onInput={(e) => setForm({ ...form, url: (e.target as HTMLInputElement).value })}
                    placeholder="https://..."
                    class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
                  />
                </div>
              </div>

              {/* Cover Media Picker */}
              <div class="space-y-2 border-t border-[#E7E5E4] pt-4">
                <span class="block font-semibold uppercase text-[#1C1917]">Gambar Sampul / Media</span>
                <div class="flex items-center gap-4">
                  {form.cover_url ? (
                    <div class="relative w-24 h-16 border border-[#E7E5E4] bg-gray-100 overflow-hidden">
                      <img src={form.cover_url} alt={form.cover_alt} class="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, cover_media: null, cover_url: '', cover_alt: '' })}
                        class="absolute top-1 right-1 bg-red-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div class="w-24 h-16 border border-dashed border-[#E7E5E4] flex items-center justify-center text-[10px] text-[#78716C]">
                      Tanpa cover
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsMediaModalOpen(true)}
                    class="px-3 py-2 border border-[#1C1917] hover:bg-[#1C1917] hover:text-white transition-colors"
                  >
                    {form.cover_media ? 'Ganti Cover' : 'Pilih dari Media Library'}
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <div class="flex flex-wrap items-center gap-6 border-t border-[#E7E5E4] pt-4">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.interactiveSimulator}
                    onChange={(e) =>
                      setForm({ ...form, interactiveSimulator: (e.target as HTMLInputElement).checked })
                    }
                    class="accent-[#EA580C]"
                  />
                  <span>Tampilkan Simulator SISE v2.4</span>
                </label>

                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: (e.target as HTMLInputElement).checked })}
                    class="accent-[#EA580C]"
                  />
                  <span>Featured Project (Studi Kasus Utama)</span>
                </label>

                <div class="flex items-center gap-2">
                  <span>Status:</span>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: (e.target as HTMLSelectElement).value as any })
                    }
                    class="border border-[#E7E5E4] p-1.5 bg-[#FBFBF9] text-[#1C1917]"
                  >
                    <option value="draft">Draft (Hanya Admin)</option>
                    <option value="published">Published (Tampil di Publik)</option>
                  </select>
                </div>
              </div>

              <div class="flex justify-end gap-3 pt-4 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  class="px-4 py-2 border border-[#E7E5E4] hover:bg-[#E7E5E4] text-[#1C1917]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  class="px-5 py-2 bg-[#EA580C] text-white font-bold uppercase hover:bg-[#1C1917] transition-colors"
                >
                  Simpan Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono text-xs">
          <div class="bg-white border border-red-300 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 class="font-serif text-lg font-bold text-red-600">Konfirmasi Hapus Project</h3>
            <p class="text-[#1C1917]">
              Yakin ingin menghapus project <strong>"{deleteTarget.title}"</strong>? Data yang dihapus tidak dapat dipulihkan.
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
                Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      <MediaModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelect={(media: MediaItem) => {
          setForm((prev) => ({
            ...prev,
            cover_media: media.id,
            cover_url: media.url,
            cover_alt: media.alt,
          }));
        }}
      />
    </div>
  );
}
