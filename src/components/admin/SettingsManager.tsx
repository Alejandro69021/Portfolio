import { useState, useEffect } from 'preact/hooks';
import { showToast, ToastContainer } from './Toast';

export function SettingsManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>({});

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      showToast('Gagal memuat pengaturan', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: Event) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Gagal menyimpan pengaturan');
      showToast('Pengaturan situs berhasil diperbarui!');
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div class="p-12 text-center text-[#78716C] font-mono text-xs">Memuat pengaturan...</div>;
  }

  const profile = data.profile || {};
  const contacts = profile.contacts || {};

  return (
    <div class="space-y-8 font-mono text-xs max-w-4xl">
      <ToastContainer />

      <div class="border-b border-[#E7E5E4] pb-5">
        <h1 class="font-serif text-3xl font-bold text-[#1C1917]">Pengaturan Situs</h1>
        <p class="text-[#78716C] mt-1">
          Kelola profil publik, tagline hero, headline, dan kontak editorial.
        </p>
      </div>

      <form onSubmit={handleSave} class="space-y-8">
        
        {/* Profile Card */}
        <div class="bg-white border border-[#E7E5E4] p-6 space-y-6">
          <h2 class="font-serif font-bold text-lg text-[#1C1917] border-b border-[#E7E5E4] pb-3">
            Informasi Profil &amp; Hero
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="block font-semibold uppercase text-[#1C1917]">Nama Lengkap</label>
              <input
                type="text"
                value={profile.fullName || ''}
                onInput={(e) =>
                  setData({
                    ...data,
                    profile: { ...profile, fullName: (e.target as HTMLInputElement).value },
                  })
                }
                class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
              />
            </div>

            <div class="space-y-1">
              <label class="block font-semibold uppercase text-[#1C1917]">Nama Panggilan / Brand</label>
              <input
                type="text"
                value={profile.nickname || ''}
                onInput={(e) =>
                  setData({
                    ...data,
                    profile: { ...profile, nickname: (e.target as HTMLInputElement).value },
                  })
                }
                class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
              />
            </div>
          </div>

          <div class="space-y-1">
            <label class="block font-semibold uppercase text-[#1C1917]">Lokasi Basis Operasional</label>
            <input
              type="text"
              value={profile.location || ''}
              onInput={(e) =>
                setData({
                  ...data,
                  profile: { ...profile, location: (e.target as HTMLInputElement).value },
                })
              }
              class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
            />
          </div>

          <div class="space-y-1">
            <label class="block font-semibold uppercase text-[#1C1917]">Tagline Hero</label>
            <input
              type="text"
              value={profile.tagline || ''}
              onInput={(e) =>
                setData({
                  ...data,
                  profile: { ...profile, tagline: (e.target as HTMLInputElement).value },
                })
              }
              class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
            />
          </div>

          <div class="space-y-1">
            <label class="block font-semibold uppercase text-[#1C1917]">Headline Panjang</label>
            <textarea
              rows={3}
              value={profile.headline || ''}
              onInput={(e) =>
                setData({
                  ...data,
                  profile: { ...profile, headline: (e.target as HTMLTextAreaElement).value },
                })
              }
              class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
            ></textarea>
          </div>
        </div>

        {/* Contacts Card */}
        <div class="bg-white border border-[#E7E5E4] p-6 space-y-6">
          <h2 class="font-serif font-bold text-lg text-[#1C1917] border-b border-[#E7E5E4] pb-3">
            Tautan Sosial &amp; Kontak
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="block font-semibold uppercase text-[#1C1917]">Nomor WhatsApp</label>
              <input
                type="text"
                value={contacts.phone || ''}
                onInput={(e) =>
                  setData({
                    ...data,
                    profile: {
                      ...profile,
                      contacts: { ...contacts, phone: (e.target as HTMLInputElement).value },
                    },
                  })
                }
                class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
              />
            </div>

            <div class="space-y-1">
              <label class="block font-semibold uppercase text-[#1C1917]">Instagram Personal</label>
              <input
                type="url"
                value={contacts.instagramPersonal || ''}
                onInput={(e) =>
                  setData({
                    ...data,
                    profile: {
                      ...profile,
                      contacts: { ...contacts, instagramPersonal: (e.target as HTMLInputElement).value },
                    },
                  })
                }
                class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="block font-semibold uppercase text-[#1C1917]">Instagram Portfolio</label>
              <input
                type="url"
                value={contacts.instagramPortfolio || ''}
                onInput={(e) =>
                  setData({
                    ...data,
                    profile: {
                      ...profile,
                      contacts: { ...contacts, instagramPortfolio: (e.target as HTMLInputElement).value },
                    },
                  })
                }
                class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
              />
            </div>

            <div class="space-y-1">
              <label class="block font-semibold uppercase text-[#1C1917]">Lynk.id</label>
              <input
                type="url"
                value={contacts.lynkId || ''}
                onInput={(e) =>
                  setData({
                    ...data,
                    profile: {
                      ...profile,
                      contacts: { ...contacts, lynkId: (e.target as HTMLInputElement).value },
                    },
                  })
                }
                class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
              />
            </div>
          </div>

          <div class="space-y-1">
            <label class="block font-semibold uppercase text-[#1C1917]">Canva Portfolio</label>
            <input
              type="url"
              value={contacts.canva || ''}
              onInput={(e) =>
                setData({
                  ...data,
                  profile: {
                    ...profile,
                    contacts: { ...contacts, canva: (e.target as HTMLInputElement).value },
                  },
                })
              }
              class="w-full bg-[#FBFBF9] border border-[#E7E5E4] p-2.5 text-[#1C1917] focus:border-[#EA580C] focus:outline-none"
            />
          </div>
        </div>

        <div class="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            class="px-8 py-3 bg-[#EA580C] text-white font-bold uppercase tracking-wider hover:bg-[#1C1917] transition-colors disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
          </button>
        </div>

      </form>
    </div>
  );
}
