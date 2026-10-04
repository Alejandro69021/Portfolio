import { useState, useEffect } from 'preact/hooks';
import { compressImageToWebP } from '../../lib/image-compression';
import { showToast } from './Toast';

export interface MediaItem {
  id: string;
  url: string;
  alt: string;
  width?: number | null;
  height?: number | null;
}

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: MediaItem) => void;
}

export function MediaModal({ isOpen, onClose, onSelect }: MediaModalProps) {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  
  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [altText, setAltText] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/media');
      if (res.ok) {
        const data = await res.json();
        setMediaList(data);
      }
    } catch (err) {
      console.error('Failed to load media', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
    }
  }, [isOpen]);

  const handleFileChange = (file: File) => {
    setUploadFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    if (!altText) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setAltText(cleanName);
    }
  };

  const handleUpload = async (e: Event) => {
    e.preventDefault();
    if (!uploadFile) {
      showToast('Pilih file gambar terlebih dahulu', 'error');
      return;
    }
    if (!altText.trim()) {
      showToast('Alt text wajib diisi untuk aksesibilitas', 'error');
      return;
    }

    setUploading(true);
    try {
      // 1. Compress to WebP on client side (max 1600px, quality 0.82)
      const { blob, width, height } = await compressImageToWebP(uploadFile, 1600, 0.82);

      const formData = new FormData();
      formData.append('file', blob, `${uploadFile.name.replace(/\.[^/.]+$/, '')}.webp`);
      formData.append('alt', altText.trim());
      formData.append('width', width.toString());
      formData.append('height', height.toString());

      const res = await fetch('/api/admin/media', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload gagal');

      showToast('Gambar berhasil diunggah!');
      onSelect(data);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Gagal mengunggah gambar', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono text-xs">
      <div class="bg-white border border-[#E7E5E4] max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div class="flex items-center justify-between p-4 border-b border-[#E7E5E4]">
          <div class="flex items-center gap-4">
            <span class="font-serif font-bold text-base text-[#1C1917]">Pilih Media</span>
            <div class="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('library')}
                class={`px-3 py-1 uppercase tracking-wider text-[11px] border transition-colors ${
                  activeTab === 'library'
                    ? 'bg-[#1C1917] text-white border-[#1C1917]'
                    : 'bg-[#FBFBF9] text-[#78716C] border-[#E7E5E4] hover:text-[#1C1917]'
                }`}
              >
                Media Library
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                class={`px-3 py-1 uppercase tracking-wider text-[11px] border transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-[#1C1917] text-white border-[#1C1917]'
                    : 'bg-[#FBFBF9] text-[#78716C] border-[#E7E5E4] hover:text-[#1C1917]'
                }`}
              >
                + Upload Baru
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            class="text-[#78716C] hover:text-[#1C1917] text-base font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div class="flex-1 overflow-y-auto p-4 min-h-[300px]">
          {activeTab === 'library' ? (
            loading ? (
              <div class="flex items-center justify-center h-48 text-[#78716C]">
                Memuat berkas media...
              </div>
            ) : mediaList.length === 0 ? (
              <div class="flex flex-col items-center justify-center h-48 text-[#78716C] space-y-2">
                <p>Belum ada media di library.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  class="text-[#EA580C] underline hover:text-[#1C1917]"
                >
                  Upload gambar pertama
                </button>
              </div>
            ) : (
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {mediaList.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      onSelect(m);
                      onClose();
                    }}
                    class="group relative border border-[#E7E5E4] bg-[#FBFBF9] cursor-pointer hover:border-[#EA580C] transition-all p-2 flex flex-col justify-between"
                  >
                    <div class="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden mb-2">
                      <img
                        src={m.url}
                        alt={m.alt}
                        class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </div>
                    <span class="text-[10px] text-[#78716C] line-clamp-1 group-hover:text-[#1C1917]">
                      {m.alt || 'No alt text'}
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : (
            <form onSubmit={handleUpload} class="space-y-4 max-w-lg mx-auto py-4">
              <div
                class="border-2 border-dashed border-[#E7E5E4] hover:border-[#EA580C] p-6 text-center cursor-pointer bg-[#FBFBF9] transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer?.files?.[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => document.getElementById('modal-file-input')?.click()}
              >
                <input
                  type="file"
                  id="modal-file-input"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  class="hidden"
                  onChange={(e) => {
                    const target = e.target as HTMLInputElement;
                    if (target.files?.[0]) handleFileChange(target.files[0]);
                  }}
                />
                {previewUrl ? (
                  <div class="space-y-2">
                    <img src={previewUrl} alt="Preview" class="max-h-36 mx-auto object-contain" />
                    <p class="text-[10px] text-[#78716C]">{uploadFile?.name}</p>
                    <p class="text-[10px] text-[#EA580C]">Klik atau drop untuk ganti gambar</p>
                  </div>
                ) : (
                  <div class="space-y-2">
                    <span class="font-mono text-[10px] uppercase tracking-widest text-[#78716C]">↑ Pilih File</span>
                    <p class="font-semibold text-[#1C1917]">Klik untuk pilih gambar atau seret file ke sini</p>
                    <p class="text-[10px] text-[#78716C]">PNG, JPG, WebP (Otomatis dikompres ke WebP &lt; 400KB)</p>
                  </div>
                )}
              </div>

              <div class="space-y-1">
                <label class="block uppercase tracking-wider text-[#1C1917] font-semibold">
                  Alt Text (Deskripsi Gambar) *
                </label>
                <input
                  type="text"
                  required
                  value={altText}
                  onInput={(e) => setAltText((e.target as HTMLInputElement).value)}
                  placeholder="Misal: Dokumentasi Peserta Trail Run Dieng Caldera"
                  class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={uploading}
                class="w-full py-3 bg-[#1C1917] text-white uppercase font-bold tracking-wider hover:bg-[#EA580C] transition-colors disabled:opacity-50"
              >
                {uploading ? 'Mengompresi & Mengunggah...' : 'Kompres WebP & Gunakan'}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
