import { useState, useEffect } from 'preact/hooks';
import { jobSchema } from '../../lib/validation';
import { showToast, ToastContainer } from './Toast';

interface Job {
  id: string;
  role: string;
  org: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current: boolean;
  description?: string | null;
  highlights: string[];
  status: 'draft' | 'published';
  sort_order: number;
}

export function JobManager() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);

  const [form, setForm] = useState({
    role: '',
    org: '',
    location: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: '',
    highlightsText: '',
    status: 'draft' as 'draft' | 'published',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/jobs');
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (err) {
      showToast('Gagal memuat data pekerjaan', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const openCreateModal = () => {
    setEditingJob(null);
    setForm({
      role: '',
      org: '',
      location: '',
      start_date: '',
      end_date: '',
      is_current: false,
      description: '',
      highlightsText: '',
      status: 'draft',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (j: Job) => {
    setEditingJob(j);
    setForm({
      role: j.role,
      org: j.org,
      location: j.location || '',
      start_date: j.start_date || '',
      end_date: j.end_date || '',
      is_current: Boolean(j.is_current),
      description: j.description || '',
      highlightsText: (j.highlights || []).join('\n'),
      status: j.status,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    const highlights = form.highlightsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      role: form.role,
      org: form.org,
      location: form.location || null,
      start_date: form.start_date || null,
      end_date: form.is_current ? null : (form.end_date || null),
      is_current: form.is_current,
      description: form.description || null,
      highlights,
      status: form.status,
    };

    const parsed = jobSchema.safeParse(payload);
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
      const url = editingJob ? `/api/admin/jobs/${editingJob.id}` : '/api/admin/jobs';
      const method = editingJob ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan');

      showToast(editingJob ? 'Pekerjaan berhasil diperbarui!' : 'Pekerjaan baru berhasil dibuat!');
      setIsModalOpen(false);
      fetchJobs();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const toggleStatus = async (j: Job) => {
    const nextStatus = j.status === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch(`/api/admin/jobs/${j.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error('Gagal mengubah status');
      showToast(`Status diubah menjadi ${nextStatus}`);
      setJobs((prev) =>
        prev.map((item) => (item.id === j.id ? { ...item, status: nextStatus } : item))
      );
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const moveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= jobs.length) return;

    const list = [...jobs];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const updated = list.map((item, idx) => ({ id: item.id, sort_order: idx + 1 }));
    setJobs(list);

    try {
      await fetch('/api/admin/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'jobs', items: updated }),
      });
      showToast('Urutan diperbarui');
    } catch (err) {
      showToast('Gagal menyimpan urutan', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/jobs/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal menghapus');
      showToast('Pekerjaan berhasil dihapus');
      setDeleteTarget(null);
      fetchJobs();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div class="space-y-6">
      <ToastContainer />

      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E7E5E4] pb-5">
        <div>
          <h1 class="font-serif text-3xl font-bold text-[#1C1917]">Kelola Pengalaman / Jobs</h1>
          <p class="text-xs font-mono text-[#78716C] mt-1">
            Total: {jobs.length} riwayat • {jobs.filter((j) => j.status === 'published').length} terbit
          </p>
        </div>
        <button
          onClick={openCreateModal}
          class="px-4 py-2.5 bg-[#EA580C] text-white text-xs font-mono uppercase tracking-wider font-bold hover:bg-[#1C1917] transition-all btn-micro"
        >
          + Tambah Pengalaman
        </button>
      </div>

      {loading ? (
        <div class="p-12 text-center text-[#78716C] font-mono text-xs">Memuat data pengalaman...</div>
      ) : jobs.length === 0 ? (
        <div class="p-12 text-center border border-dashed border-[#E7E5E4] text-[#78716C] font-mono text-xs">
          Belum ada riwayat pekerjaan/pengalaman.
        </div>
      ) : (
        <div class="border border-[#E7E5E4] bg-white overflow-x-auto">
          <table class="w-full text-left font-mono text-xs">
            <thead class="bg-[#FBFBF9] border-b border-[#E7E5E4] uppercase tracking-wider text-[#78716C]">
              <tr>
                <th class="p-4 w-12 text-center">Urutan</th>
                <th class="p-4">Peran &amp; Organisasi</th>
                <th class="p-4">Lokasi &amp; Periode</th>
                <th class="p-4">Status</th>
                <th class="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E7E5E4]">
              {jobs.map((j, idx) => (
                <tr key={j.id} class="hover:bg-[#FBFBF9] transition-colors">
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
                        disabled={idx === jobs.length - 1}
                        class="text-[#78716C] hover:text-[#EA580C] disabled:opacity-20 text-[10px]"
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td class="p-4">
                    <div class="font-serif font-bold text-sm text-[#1C1917]">{j.role}</div>
                    <div class="text-[11px] text-[#78716C]">{j.org}</div>
                  </td>
                  <td class="p-4 text-[11px] text-[#78716C]">
                    <div>{j.location || '-'}</div>
                    <div class="text-[10px]">
                      {j.is_current ? 'Aktif Saat Ini' : `${j.start_date || ''} s/d ${j.end_date || ''}`}
                    </div>
                  </td>
                  <td class="p-4">
                    <button
                      onClick={() => toggleStatus(j)}
                      class={`px-2.5 py-1 text-[10px] font-bold uppercase transition-all ${
                        j.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      }`}
                    >
                      {j.status === 'published' ? '● Published' : '○ Draft'}
                    </button>
                  </td>
                  <td class="p-4 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(j)}
                      class="px-3 py-1 bg-[#FBFBF9] border border-[#E7E5E4] hover:border-[#1C1917] text-[#1C1917]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(j)}
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

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono text-xs">
          <div class="bg-white border border-[#E7E5E4] max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div class="flex items-center justify-between p-4 border-b border-[#E7E5E4]">
              <h2 class="font-serif font-bold text-lg text-[#1C1917]">
                {editingJob ? 'Edit Pengalaman' : 'Tambah Pengalaman Baru'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} class="text-base text-[#78716C] hover:text-[#1C1917]">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} class="flex-1 overflow-y-auto p-6 space-y-4">
              <div class="space-y-1">
                <label class="block font-semibold uppercase text-[#1C1917]">Peran / Jabatan *</label>
                <input
                  type="text"
                  required
                  value={form.role}
                  onInput={(e) => setForm({ ...form, role: (e.target as HTMLInputElement).value })}
                  placeholder="Misal: Internship Promotor K3 & AI Trainer"
                  class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
                />
                {errors.role && <p class="text-red-500 text-[10px]">{errors.role}</p>}
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="block font-semibold uppercase text-[#1C1917]">Instansi / Organisasi *</label>
                  <input
                    type="text"
                    required
                    value={form.org}
                    onInput={(e) => setForm({ ...form, org: (e.target as HTMLInputElement).value })}
                    placeholder="Dinkes Kulon Progo"
                    class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
                  />
                  {errors.org && <p class="text-red-500 text-[10px]">{errors.org}</p>}
                </div>

                <div class="space-y-1">
                  <label class="block font-semibold uppercase text-[#1C1917]">Lokasi</label>
                  <input
                    type="text"
                    value={form.location}
                    onInput={(e) => setForm({ ...form, location: (e.target as HTMLInputElement).value })}
                    placeholder="Kulon Progo, DIY"
                    class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
                  />
                </div>
              </div>

              <div class="space-y-2 border-t border-[#E7E5E4] pt-3">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_current}
                    onChange={(e) => setForm({ ...form, is_current: (e.target as HTMLInputElement).checked })}
                    class="accent-[#EA580C]"
                  />
                  <span>Masih berlangsung hingga saat ini (Current Job)</span>
                </label>

                {!form.is_current && (
                  <div class="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <label class="block text-[10px] uppercase text-[#78716C]">Tanggal Mulai</label>
                      <input
                        type="date"
                        value={form.start_date}
                        onInput={(e) => setForm({ ...form, start_date: (e.target as HTMLInputElement).value })}
                        class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2 text-[#1C1917]"
                      />
                    </div>
                    <div>
                      <label class="block text-[10px] uppercase text-[#78716C]">Tanggal Selesai</label>
                      <input
                        type="date"
                        value={form.end_date}
                        onInput={(e) => setForm({ ...form, end_date: (e.target as HTMLInputElement).value })}
                        class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2 text-[#1C1917]"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div class="space-y-1">
                <label class="block font-semibold uppercase text-[#1C1917]">Deskripsi Peran</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onInput={(e) => setForm({ ...form, description: (e.target as HTMLTextAreaElement).value })}
                  class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
                ></textarea>
              </div>

              <div class="space-y-1">
                <label class="block font-semibold uppercase text-[#1C1917]">Poin Sorotan / Highlights (1 baris per poin)</label>
                <textarea
                  rows={3}
                  value={form.highlightsText}
                  onInput={(e) => setForm({ ...form, highlightsText: (e.target as HTMLTextAreaElement).value })}
                  placeholder="Mengembangkan draf laporan surveilans resmi&#10;Melatih staf puskesmas..."
                  class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
                ></textarea>
              </div>

              <div class="flex items-center gap-2 border-t border-[#E7E5E4] pt-4">
                <span>Status Publikasi:</span>
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
                  onClick={() => setIsModalOpen(false)}
                  class="px-4 py-2 border border-[#E7E5E4] hover:bg-gray-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  class="px-5 py-2 bg-[#EA580C] text-white font-bold uppercase hover:bg-[#1C1917] transition-colors"
                >
                  Simpan Pengalaman
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
            <h3 class="font-serif text-lg font-bold text-red-600">Konfirmasi Hapus Pengalaman</h3>
            <p class="text-[#1C1917]">
              Yakin ingin menghapus <strong>"{deleteTarget.role}"</strong> di <strong>{deleteTarget.org}</strong>?
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
    </div>
  );
}
