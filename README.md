# Walex Portfolio v2

Portfolio pribadi Muhammad Fadhil Al Wafie (Walex) — **Astro + Tailwind CSS v4 + Supabase CMS**.

## Stack

| Layer | Teknologi |
|---|---|
| Framework | [Astro](https://astro.build) v7 (SSR via @astrojs/netlify) |
| Styling | Tailwind CSS v4 (token di `@theme` dalam `global.css`) |
| Database + Auth | [Supabase](https://supabase.com) (Postgres + Storage) |
| Admin UI | Preact islands (`/admin/*`) |
| Deploy | Netlify |

---

## Setup Lokal

### 1. Prasyarat

- Node.js ≥ 22.12
- Akun [Supabase](https://supabase.com) (tier gratis cukup)

### 2. Kloning & instal dependensi

```bash
git clone <repo-url>
cd Portfolio
npm install
```

### 3. Variabel Lingkungan

Salin template:

```bash
cp .env.example .env
```

Isi nilai di `.env`:

| Variabel | Dari mana | Keterangan |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | URL project |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Kunci publik (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API | **Jangan expose ke klien** — hanya untuk seed & backup lokal |

> **Penting:** File `.env` sudah masuk `.gitignore`. Jangan pernah commit file ini.

### 4. Jalankan migrasi SQL

Di Supabase → **SQL Editor**, tempelkan dan jalankan isi file:

```
supabase/migrations/0001_init.sql
```

Ini akan membuat semua tabel, fungsi `is_admin()`, RLS, dan bucket storage.

### 5. Seed konten awal

```bash
npm run seed
```

Skrip akan mengimpor semua konten dari `walex_profile_data.json` ke database Supabase.

### 6. Jalankan dev server

```bash
npm run dev
```

Buka `http://localhost:4321`.

---

## Menambah Admin

1. Di **Supabase → Authentication → Users**, buat user baru dengan email & password.
2. Salin `User UID` (UUID) dari user tersebut.
3. Di **SQL Editor**, jalankan:

```sql
INSERT INTO admin_users (user_id) VALUES ('<UUID-user>');
```

4. Login di `http://localhost:4321/admin/login` dengan email & password tadi.

> Registrasi publik **dimatikan**. Admin pertama harus dibuat manual seperti di atas.

---

## Deploy ke Netlify

### Otomatis (GitHub)

1. Push repo ke GitHub.
2. Di Netlify → **Add new site → Import from Git**.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Di **Environment variables**, tambahkan:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   - (Jangan tambahkan `SUPABASE_SERVICE_ROLE_KEY` — tidak diperlukan di produksi)

### Manual

```bash
npm run build
# Lalu deploy folder dist/ via Netlify CLI atau drag-drop di UI
```

---

## Backup Database

Ekspor semua tabel konten ke JSON:

```bash
npm run backup
```

Output tersimpan di:
- `backups/backup-<timestamp>.json` — arsip bernama waktu
- `backups/latest.json` — selalu overwrite, untuk restore cepat

Folder `backups/` sudah ada di `.gitignore` — jangan commit data backup ke repo.

> Jalankan secara berkala atau sebelum migrasi besar.

---

## Struktur Proyek

```
src/
  layouts/      Layout.astro, AdminLayout.astro
  pages/
    index.astro           Halaman publik utama
    p/[slug].astro        Rute halaman kustom
    admin/                Dashboard admin (SSR)
    api/admin/            Endpoint CRUD (server-only)
  scripts/
    motion.ts             Animasi publik (vanilla JS)
  lib/supabase/
    server.ts             Klien SSR (cookie-based)
    browser.ts            Klien browser (anon key saja)
  components/admin/       Preact islands
  styles/
    global.css            Token desain + utility classes
scripts/
  seed.ts                 Seed konten awal ke Supabase
  backup.ts               Export DB ke JSON
supabase/
  migrations/0001_init.sql  Skema lengkap + RLS
```

---

## Keamanan

- **RLS aktif** di semua tabel: anon hanya `SELECT` baris `published`.
- **Service Role Key** tidak pernah dikirim ke klien — hanya digunakan di `scripts/` lokal.
- **CSP** dikonfigurasi di `src/middleware.ts` (Supabase, Google Fonts, YouTube, Vimeo).
- Sanitasi markdown via `rehype-sanitize` sebelum render.
- Whitelist domain `video_embed` (YouTube + Vimeo saja).
