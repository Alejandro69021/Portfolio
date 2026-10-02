import { useState, useEffect } from 'preact/hooks';
import { eventSchema, categorySchema } from '../../lib/validation';
import { MediaModal, type MediaItem } from './MediaModal';
import { showToast, ToastContainer } from './Toast';

interface EventCategory {
  id: string;
  name: string;
  sort_order: number;
}

interface EventItem {
  id: string;
  slug: string;
  title: string;
  category_id?: string | null;
  category?: { id: string; name: string } | null;
  event_date?: string | null;
  role?: string | null;
  camera?: string | null;
  description?: string | null;
  cover_media?: string | null;
  cover?: { id: string; url: string; alt: string } | null;
  status: 'draft' | 'published';
  sort_order: number;
}

export function EventManager() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'events' | 'categories'>('events');

  // Event modal state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [deleteEventTarget, setDeleteEventTarget] = useState<EventItem | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  // Category modal state
  const [newCatName, setNewCatName] = useState('');
  const [deleteCatTarget, setDeleteCatTarget] = useState<EventCategory | null>(null);

  // Event form
  const [form, setForm] = useState({
    title: '',
    slug: '',
    category_id: '',
    event_date: '',
    role: '',
    camera: '',
    description: '',
    cover_media: null as string | null,
    cover_url: '',
    cover_alt: '',
    status: 'draft' as 'draft' | 'published',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [evRes, catRes] = await Promise.all([
        fetch('/api/admin/events'),
        fetch('/api/admin/categories'),
      ]);
      if (evRes.ok) setEvents(await evRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (err) {
      showToast('Gagal memuat data galeri event', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateEventModal = () => {
    setEditingEvent(null);
    setForm({
      title: '',
      slug: '',
      category_id: categories[0]?.id || '',
      event_date: '',
      role: '',
      camera: '',
      description: '',
      cover_media: null,
      cover_url: '',
      cover_alt: '',
      status: 'draft',
    });
    setErrors({});
    setIsEventModalOpen(true);
  };

  const openEditEventModal = (ev: EventItem) => {
    setEditingEvent(ev);
    setForm({
      title: ev.title,
      slug: ev.slug,
      category_id: ev.category_id || '',
      event_date: ev.event_date || '',
      role: ev.role || '',
      camera: ev.camera || '',
      description: ev.description || '',
      cover_media: ev.cover_media || null,
      cover_url: ev.cover?.url || '',
      cover_alt: ev.cover?.alt || '',
      status: ev.status,
    });
    setErrors({});
    setIsEventModalOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setForm((prev) => {
      const next = { ...prev, title: val };
      if (!editingEvent && !prev.slug) {
        next.slug = val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }
      return next;
    });
  };

  const handleEventSubmit = async (e: Event) => {
    e.preventDefault();

    const payload = {
      title: form.title,
      slug: form.slug,
      category_id: form.category_id || null,
      event_date: form.event_date || null,
      role: form.role || null,
      camera: form.camera || null,
      description: form.description || null,
      cover_media: form.cover_media || null,
      status: form.status,
    };

    const parsed = eventSchema.safeParse(payload);
    if (!parsed.success) {
      const errMap: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        errMap[issue.path[0] as string] = issue.message;
      });
      setErrors(errMap);
      showToast('Harap periksa form kembali', 'error');
      return;
    }

    try {
      const url = editingEvent ? `/api/admin/events/${editingEvent.id}` : '/api/admin/events';
      const method = editingEvent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan');

      showToast(editingEvent ? 'Event berhasil diperbarui!' : 'Event baru berhasil dibuat!');
      setIsEventModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const toggleEventStatus = async (ev: EventItem) => {
    const nextStatus = ev.status === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch(`/api/admin/events/${ev.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error('Gagal mengubah status');
      showToast(`Status diubah menjadi ${nextStatus}`);
      setEvents((prev) =>
        prev.map((item) => (item.id === ev.id ? { ...item, status: nextStatus } : item))
      );
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const moveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= events.length) return;

    const list = [...events];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const updated = list.map((item, idx) => ({ id: item.id, sort_order: idx + 1 }));
    setEvents(list);

    try {
      await fetch('/api/admin/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'events', items: updated }),
      });
      showToast('Urutan event diperbarui');
    } catch (err) {
      showToast('Gagal menyimpan urutan', 'error');
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteEventTarget) return;
    try {
      const res = await fetch(`/api/admin/events/${deleteEventTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal menghapus');
      showToast('Event berhasil dihapus');
      setDeleteEventTarget(null);
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Add category
  const handleAddCategory = async (e: Event) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const parsed = categorySchema.safeParse({ name: newCatName.trim() });
    if (!parsed.success) {
      showToast(parsed.error.issues[0]?.message || 'Nama tidak valid', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim(), sort_order: categories.length + 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menambah kategori');

      showToast(`Kategori "${newCatName}" berhasil ditambahkan`);
      setNewCatName('');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Delete category
  const handleDeleteCategory = async () => {
    if (!deleteCatTarget) return;
    try {
      const res = await fetch(`/api/admin/categories?id=${deleteCatTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal menghapus');
      showToast(`Kategori "${deleteCatTarget.name}" dihapus`);
      setDeleteCatTarget(null);
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div class="space-y-6">
      <ToastContainer />

      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E7E5E4] pb-5">
        <div>
          <h1 class="font-serif text-3xl font-bold text-[#1C1917]">Kelola Galeri Event</h1>
          <p class="text-xs font-mono text-[#78716C] mt-1">
            Total: {events.length} event • {categories.length} kategori liputan
          </p>
        </div>

        <div class="flex gap-2 font-mono text-xs">
          <button
            onClick={() => setActiveTab('events')}
            class={`px-3 py-2 uppercase tracking-wider border transition-colors ${
              activeTab === 'events'
                ? 'bg-[#1C1917] text-white border-[#1C1917]'
                : 'bg-white text-[#78716C] border-[#E7E5E4]'
            }`}
          >
            Daftar Event
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            class={`px-3 py-2 uppercase tracking-wider border transition-colors ${
              activeTab === 'categories'
                ? 'bg-[#1C1917] text-white border-[#1C1917]'
                : 'bg-white text-[#78716C] border-[#E7E5E4]'
            }`}
          >
            Kelola Kategori
          </button>
        </div>
      </div>

      {activeTab === 'events' ? (
        <div class="space-y-4">
          <div class="flex justify-end">
            <button
              onClick={openCreateEventModal}
              class="px-4 py-2.5 bg-[#EA580C] text-white text-xs font-mono uppercase tracking-wider font-bold hover:bg-[#1C1917] transition-all btn-micro"
            >
              + Tambah Event Baru
            </button>
          </div>

          {loading ? (
            <div class="p-12 text-center text-[#78716C] font-mono text-xs">Memuat galeri event...</div>
          ) : events.length === 0 ? (
            <div class="p-12 text-center border border-dashed border-[#E7E5E4] text-[#78716C] font-mono text-xs">
              Belum ada event terdaftar.
            </div>
          ) : (
            <div class="border border-[#E7E5E4] bg-white overflow-x-auto">
              <table class="w-full text-left font-mono text-xs">
                <thead class="bg-[#FBFBF9] border-b border-[#E7E5E4] uppercase tracking-wider text-[#78716C]">
                  <tr>
                    <th class="p-4 w-12 text-center">Urutan</th>
                    <th class="p-4">Event</th>
                    <th class="p-4">Kategori</th>
                    <th class="p-4">Peran &amp; Gear</th>
                    <th class="p-4">Status</th>
                    <th class="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#E7E5E4]">
                  {events.map((ev, idx) => (
                    <tr key={ev.id} class="hover:bg-[#FBFBF9] transition-colors">
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
                            disabled={idx === events.length - 1}
                            class="text-[#78716C] hover:text-[#EA580C] disabled:opacity-20 text-[10px]"
                          >
                            ▼
                          </button>
                        </div>
                      </td>
                      <td class="p-4">
                        <div class="font-serif font-bold text-sm text-[#1C1917]">{ev.title}</div>
                        <div class="text-[11px] text-[#78716C]">/{ev.slug}</div>
                      </td>
                      <td class="p-4">
                        <span class="px-2 py-0.5 bg-[#EA580C]/10 text-[#EA580C] text-[10px] font-semibold uppercase">
                          {ev.category?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td class="p-4 text-[11px] text-[#78716C]">
                        <div>{ev.role || '-'}</div>
                        <div class="text-[10px] text-[#1C1917]">📷 {ev.camera || '-'}</div>
                      </td>
                      <td class="p-4">
                        <button
                          onClick={() => toggleEventStatus(ev)}
                          class={`px-2.5 py-1 text-[10px] font-bold uppercase transition-all ${
                            ev.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                        >
                          {ev.status === 'published' ? '● Published' : '○ Draft'}
                        </button>
                      </td>
                      <td class="p-4 text-right space-x-2">
                        <button
                          onClick={() => openEditEventModal(ev)}
                          class="px-3 py-1 bg-[#FBFBF9] border border-[#E7E5E4] hover:border-[#1C1917] text-[#1C1917]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteEventTarget(ev)}
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
        /* Categories Tab */
        <div class="space-y-6 max-w-xl">
          <form onSubmit={handleAddCategory} class="flex gap-2">
            <input
              type="text"
              required
              placeholder="Nama Kategori Baru (misal: Olahraga / Race)"
              value={newCatName}
              onInput={(e) => setNewCatName((e.target as HTMLInputElement).value)}
              class="flex-1 bg-white border border-[#E7E5E4] p-2.5 font-mono text-xs focus:border-[#EA580C] focus:outline-none"
            />
            <button
              type="submit"
              class="px-4 py-2.5 bg-[#1C1917] text-white text-xs font-mono uppercase font-bold hover:bg-[#EA580C] transition-colors"
            >
              + Tambah
            </button>
          </form>

          <div class="border border-[#E7E5E4] bg-white divide-y divide-[#E7E5E4] font-mono text-xs">
            {categories.map((c) => (
              <div key={c.id} class="p-3 flex items-center justify-between hover:bg-[#FBFBF9]">
                <span class="font-bold text-[#1C1917]">{c.name}</span>
                <button
                  type="button"
                  onClick={() => setDeleteCatTarget(c)}
                  class="text-red-600 hover:underline text-[11px]"
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Add / Edit Event */}
      {isEventModalOpen && (
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono text-xs">
          <div class="bg-white border border-[#E7E5E4] max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div class="flex items-center justify-between p-4 border-b border-[#E7E5E4]">
              <h2 class="font-serif font-bold text-lg text-[#1C1917]">
                {editingEvent ? 'Edit Event' : 'Tambah Event Baru'}
              </h2>
              <button onClick={() => setIsEventModalOpen(false)} class="text-base text-[#78716C] hover:text-[#1C1917]">
                ✕
              </button>
            </div>

            <form onSubmit={handleEventSubmit} class="flex-1 overflow-y-auto p-6 space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="block font-semibold uppercase text-[#1C1917]">Judul Event *</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onInput={(e) => handleTitleChange((e.target as HTMLInputElement).value)}
                    placeholder="Dieng Caldera Race Trail Run 2024"
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
                  <label class="block font-semibold uppercase text-[#1C1917]">Kategori Liputan</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: (e.target as HTMLSelectElement).value })}
                    class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div class="space-y-1">
                  <label class="block font-semibold uppercase text-[#1C1917]">Tanggal Event</label>
                  <input
                    type="date"
                    value={form.event_date}
                    onInput={(e) => setForm({ ...form, event_date: (e.target as HTMLInputElement).value })}
                    class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917]"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="block font-semibold uppercase text-[#1C1917]">Peran di Lapangan</label>
                  <input
                    type="text"
                    value={form.role}
                    onInput={(e) => setForm({ ...form, role: (e.target as HTMLInputElement).value })}
                    placeholder="Assistant Videographer & Photographer"
                    class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
                  />
                </div>

                <div class="space-y-1">
                  <label class="block font-semibold uppercase text-[#1C1917]">Kamera &amp; Lensa</label>
                  <input
                    type="text"
                    value={form.camera}
                    onInput={(e) => setForm({ ...form, camera: (e.target as HTMLInputElement).value })}
                    placeholder="Sony A6400, Fujifilm XA-3"
                    class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
                  />
                </div>
              </div>

              <div class="space-y-1">
                <label class="block font-semibold uppercase text-[#1C1917]">Deskripsi Singkat</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onInput={(e) => setForm({ ...form, description: (e.target as HTMLTextAreaElement).value })}
                  placeholder="Dokumentasi pelari trail run medan ekstrem di dataran tinggi Dieng..."
                  class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
                ></textarea>
              </div>

              {/* Cover Media Picker */}
              <div class="space-y-2 border-t border-[#E7E5E4] pt-4">
                <span class="block font-semibold uppercase text-[#1C1917]">Gambar Sampul Event</span>
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

              <div class="flex items-center gap-2 border-t border-[#E7E5E4] pt-4">
                <span>Status:</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: (e.target as HTMLSelectElement).value as any })}
                  class="border border-[#E7E5E4] p-1.5 bg-[#FBFBF9] text-[#1C1917]"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>

              <div class="flex justify-end gap-3 pt-4 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  class="px-4 py-2 border border-[#E7E5E4] hover:bg-gray-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  class="px-5 py-2 bg-[#EA580C] text-white font-bold uppercase hover:bg-[#1C1917] transition-colors"
                >
                  Simpan Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Event Modal */}
      {deleteEventTarget && (
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono text-xs">
          <div class="bg-white border border-red-300 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 class="font-serif text-lg font-bold text-red-600">Konfirmasi Hapus Event</h3>
            <p class="text-[#1C1917]">
              Yakin ingin menghapus <strong>"{deleteEventTarget.title}"</strong>?
            </p>
            <div class="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteEventTarget(null)}
                class="px-4 py-2 border border-[#E7E5E4] hover:bg-gray-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteEvent}
                class="px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700"
              >
                Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Modal */}
      {deleteCatTarget && (
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono text-xs">
          <div class="bg-white border border-red-300 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 class="font-serif text-lg font-bold text-red-600">Hapus Kategori</h3>
            <p class="text-[#1C1917]">
              Yakin ingin menghapus kategori <strong>"{deleteCatTarget.name}"</strong>?
            </p>
            <div class="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCatTarget(null)}
                class="px-4 py-2 border border-[#E7E5E4] hover:bg-gray-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                class="px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700"
              >
                Hapus Kategori
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
