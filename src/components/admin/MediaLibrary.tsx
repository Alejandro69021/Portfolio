import { useState, useEffect } from 'preact/hooks';
import { compressImageToWebP } from '../../lib/image-compression';
import { showToast, ToastContainer } from './Toast';

interface MediaItem {
  id: string;
  path: string;
  url: string;
  alt: string;
  width?: number | null;
  height?: number | null;
  created_at: string;
}

interface PendingUpload {
  id: string;
  file: File;
  previewUrl: string;
  alt: string;
  status: 'idle' | 'uploading' | 'done' | 'error';
  error?: string;
}

export function MediaLibrary() {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [uploadingAll, setUploadingAll] = useState(false);

  // Warning modal for in-use deletion
  const [usageWarning, setUsageWarning] = useState<{
    id: string;
    message: string;
    usages: string[];
  } | null>(null);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/media');
      if (res.ok) {
        const data = await res.json();
        setMediaList(data);
      }
    } catch (err) {
      showToast('Gagal memuat media', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleFilesAdded = (files: FileList | null) => {
    if (!files) return;
    const newItems: PendingUpload[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      newItems.push({
        id: Math.random().toString(36).slice(2),
        file,
        previewUrl: URL.createObjectURL(file),
        alt: cleanName,
        status: 'idle',
      });
    }
    setPendingUploads((prev) => [...prev, ...newItems]);
  };

  const removePending = (id: string) => {
    setPendingUploads((prev) => prev.filter((p) => p.id !== id));
  };

  const updateAlt = (id: string, alt: string) => {
    setPendingUploads((prev) =>
      prev.map((p) => (p.id === id ? { ...p, alt } : p))
    );
  };

  const uploadAll = async () => {
    const toUpload = pendingUploads.filter((p) => p.status === 'idle' || p.status === 'error');
    if (toUpload.length === 0) return;

    // Check all have alt text
    const missingAlt = toUpload.find((p) => !p.alt.trim());
    if (missingAlt) {
      showToast('Semua gambar wajib memiliki alt text sebelum diunggah', 'error');
      return;
    }

    setUploadingAll(true);

    for (const item of toUpload) {
      setPendingUploads((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, status: 'uploading' } : p))
      );

      try {
        // Compress client-side to WebP (max 1600px, <400KB target)
        const { blob, width, height } = await compressImageToWebP(item.file, 1600, 0.82);

        const formData = new FormData();
        formData.append('file', blob, `${item.file.name.replace(/\.[^/.]+$/, '')}.webp`);
        formData.append('alt', item.alt.trim());
        formData.append('width', width.toString());
        formData.append('height', height.toString());

        const res = await fetch('/api/admin/media', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload gagal');

        setPendingUploads((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, status: 'done' } : p))
        );
      } catch (err: any) {
        setPendingUploads((prev) =>
          prev.map((p) =>
            p.id === item.id ? { ...p, status: 'error', error: err.message } : p
          )
        );
      }
    }

    setUploadingAll(false);
    showToast('Proses upload selesai!');
    // Remove completed uploads after delay
    setTimeout(() => {
      setPendingUploads((prev) => prev.filter((p) => p.status !== 'done'));
    }, 1500);
    fetchMedia();
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('Tautan URL disalin ke papan klip');
  };

  const handleDelete = async (id: string, force = false) => {
    try {
      const res = await fetch(`/api/admin/media?id=${id}${force ? '&force=true' : ''}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.status === 409 && data.warning) {
        // Warning: media is in use!
        setUsageWarning({
          id,
          message: data.message,
          usages: data.usages || [],
        });
        return;
      }

      if (!res.ok) throw new Error(data.error || 'Gagal menghapus');

      showToast('Media berhasil dihapus');
      setUsageWarning(null);
      fetchMedia();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div class="space-y-8 font-mono text-xs">
      <ToastContainer />

      <div class="border-b border-[#E7E5E4] pb-5">
        <h1 class="font-serif text-3xl font-bold text-[#1C1917]">Media Library</h1>
        <p class="text-[#78716C] mt-1">
          Total: {mediaList.length} media tersimpan • Kompresi WebP otomatis (maks 1600px, &lt; 400KB)
        </p>
      </div>

      {/* Upload Dropzone */}
      <div class="bg-white border border-[#E7E5E4] p-6 space-y-4">
        <h2 class="font-serif font-bold text-base text-[#1C1917]">Unggah Berkas Baru</h2>

        <div
          class="border-2 border-dashed border-[#E7E5E4] hover:border-[#EA580C] p-8 text-center cursor-pointer bg-[#FBFBF9] transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFilesAdded(e.dataTransfer?.files || null);
          }}
          onClick={() => document.getElementById('multi-file-input')?.click()}
        >
          <input
            type="file"
            id="multi-file-input"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            class="hidden"
            onChange={(e) => handleFilesAdded((e.target as HTMLInputElement).files)}
          />
          <div class="space-y-2">
            <span class="font-mono text-[10px] uppercase tracking-widest text-[#78716C]">↑ Upload</span>
            <p class="font-bold text-[#1C1917]">Seret banyak gambar ke sini, atau klik untuk memilih berkas</p>
            <p class="text-[11px] text-[#78716C]">
              JPG, PNG, WebP • Dikonversi otomatis ke format WebP teroptimasi sebelum diunggah
            </p>
          </div>
        </div>

        {/* Pending Upload List */}
        {pendingUploads.length > 0 && (
          <div class="space-y-3 pt-4 border-t border-[#E7E5E4]">
            <div class="flex items-center justify-between">
              <span class="font-bold text-[#1C1917]">
                {pendingUploads.length} gambar siap diunggah:
              </span>
              <button
                type="button"
                onClick={uploadAll}
                disabled={uploadingAll}
                class="px-4 py-2 bg-[#EA580C] text-white uppercase font-bold hover:bg-[#1C1917] transition-colors disabled:opacity-50"
              >
                {uploadingAll ? 'Sedang Mengunggah...' : `Unggah Semua (${pendingUploads.length})`}
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-2 bg-[#FBFBF9] border border-[#E7E5E4]">
              {pendingUploads.map((item) => (
                <div key={item.id} class="flex items-center gap-3 p-2 bg-white border border-[#E7E5E4]">
                  <img src={item.previewUrl} alt="Preview" class="w-16 h-12 object-cover shrink-0" />
                  <div class="flex-1 min-w-0 space-y-1">
                    <p class="text-[10px] text-[#78716C] truncate">{item.file.name}</p>
                    <input
                      type="text"
                      placeholder="Alt text wajib..."
                      value={item.alt}
                      onInput={(e) => updateAlt(item.id, (e.target as HTMLInputElement).value)}
                      class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-1 text-[11px] focus:border-[#EA580C] focus:outline-none"
                    />
                  </div>
                  <div class="shrink-0 flex items-center gap-2">
                    {item.status === 'uploading' && <span class="text-amber-600 text-[10px]">⏳</span>}
                    {item.status === 'done' && <span class="text-emerald-600 text-[10px]">✓</span>}
                    {item.status === 'error' && <span class="text-red-600 text-[10px]">✕</span>}
                    <button
                      type="button"
                      onClick={() => removePending(item.id)}
                      class="text-red-500 hover:text-red-700 text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Media Grid */}
      <div class="space-y-4">
        <h2 class="font-serif font-bold text-base text-[#1C1917]">Pustaka Media ({mediaList.length})</h2>

        {loading ? (
          <div class="p-12 text-center text-[#78716C]">Memuat pustaka media...</div>
        ) : mediaList.length === 0 ? (
          <div class="p-12 text-center border border-dashed border-[#E7E5E4] text-[#78716C]">
            Belum ada berkas media. Unggah gambar di atas.
          </div>
        ) : (
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {mediaList.map((m) => (
              <div
                key={m.id}
                class="group bg-white border border-[#E7E5E4] hover:border-[#EA580C] transition-all p-3 flex flex-col justify-between"
              >
                <div class="aspect-square bg-gray-100 overflow-hidden mb-2 relative">
                  <img
                    src={m.url}
                    alt={m.alt}
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  {m.width && m.height && (
                    <span class="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 py-0.5">
                      {m.width}×{m.height}
                    </span>
                  )}
                </div>

                <div class="space-y-2">
                  <p class="text-[11px] text-[#1C1917] line-clamp-2 font-medium" title={m.alt}>
                    {m.alt || '(Tanpa alt text)'}
                  </p>

                  <div class="flex items-center justify-between pt-2 border-t border-[#E7E5E4] text-[10px]">
                    <button
                      type="button"
                      onClick={() => copyUrl(m.url)}
                      class="text-[#EA580C] hover:underline"
                    >
                      Salin URL
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id)}
                      class="text-red-600 hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Warning Modal (if media is in use) */}
      {usageWarning && (
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div class="bg-white border border-amber-400 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 class="font-serif text-lg font-bold text-amber-700">Peringatan: Media Sedang Digunakan</h3>
            <p class="text-[#1C1917]">{usageWarning.message}</p>
            <div class="bg-amber-50 p-3 border border-amber-200 text-[11px] space-y-1">
              {usageWarning.usages.map((u, i) => (
                <div key={i}>• {u}</div>
              ))}
            </div>
            <p class="text-xs text-red-600 font-semibold">
              Menghapus media ini dapat merusak tampilan cover pada halaman publik.
            </p>
            <div class="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUsageWarning(null)}
                class="px-4 py-2 border border-[#E7E5E4] hover:bg-gray-100"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={() => handleDelete(usageWarning.id, true)}
                class="px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700"
              >
                Tetap Hapus Paksa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
