PRD — Walex Portfolio v2: Motion + Admin CMS
> Letakkan file ini di root proyek (`/PRD.md`). Semua prompt di `ANTIGRAVITY_PROMPTS.md` merujuk ke dokumen ini.
1. Ringkasan
Portfolio pribadi "walex." yang sekarang statis dan kontennya tertanam di kode. Versi 2 punya dua tujuan:
Terasa hidup: animasi, transisi antar-halaman, dan micro-interaction yang halus tanpa mengorbankan kecepatan.
Bisa dikelola sendiri: pemilik login ke `/admin` untuk menambah dan mengedit project, pengalaman kerja (jobs), galeri event, gambar, dan halaman baru, tanpa menyentuh kode.
2. Kondisi saat ini (jangan dirusak)
Framework: Astro + Tailwind CSS v4 (token di `@theme` pada `src/styles/global.css`). Dev server `localhost:4321`.
Struktur: `src/layouts/Layout.astro`, `src/pages/index.astro`, `src/styles/global.css`. Ada juga `walex_profile_data.json` (sumber data profil, dipakai untuk seed).
Desain: kertas krem + tinta hitam + aksen terracotta (`--color-paper`, `--color-ink`, `--color-terracotta`, `--color-subtle`, `--color-line`). Font: Playfair Display (judul), Plus Jakarta Sans (isi), Fira Code (label mono).
Bagian halaman: Hero + statistik, Karya (SISE v2.4, HyPrevent), Peran & Skill, Tentang & Gear, Galeri Event (carousel horizontal + grid dengan filter Semua / Olahraga-Race / Kampus UNY / Medis), Kontak (form Netlify).
Bahasa konten: Indonesia. Gaya visual editorial-minimal. Pertahankan identitas ini; animasi harus memperkuatnya, bukan menggantinya.
3. Tujuan dan non-tujuan
Tujuan
G1. Semua bagian punya animasi masuk, hover, dan transisi halaman yang konsisten.
G2. Pemilik bisa login dan mengelola: Projects, Jobs/Pengalaman, Galeri Event, Media, Halaman kustom, Pengaturan situs.
G3. Perubahan di admin tampil di situs publik dalam ≤ 60 detik tanpa deploy ulang.
G4. Skor Lighthouse mobile tetap ≥ 90 (Performance, Accessibility, SEO).
Bukan tujuan (v2)
Registrasi publik, komentar, multi-user, multi-bahasa, e-commerce, blog penuh.
4. Pengguna
Peran	Hak
Pengunjung	Baca konten yang berstatus published, kirim form kontak.
Admin (pemilik, 1 orang)	Login, CRUD semua konten, upload media, draft/publish.
5. Fitur A — Motion dan transisi
Prinsip: hanya animasikan `transform` dan `opacity`; durasi 200–700 ms; easing `cubic-bezier(0.22, 1, 0.36, 1)`; wajib menghormati `prefers-reduced-motion` (matikan semua gerak, pertahankan fade singkat). Tambahan JS publik ≤ 40 KB gzip.
ID	Kebutuhan
M1	Transisi halaman memakai Astro View Transitions (`ClientRouter`): fade + slide halus, elemen bersama (judul project, gambar sampul) berpindah mulus lewat `transition:name`.
M2	Scroll reveal: setiap section dan kartu muncul dengan fade-up + stagger 60–80 ms, memakai `IntersectionObserver` (sekali jalan, tanpa library berat).
M3	Hero: judul masuk per baris/kata (split reveal), statistik angka menghitung naik saat terlihat (count-up), indikator scroll kecil.
M4	Navbar: efek blur/shrink saat scroll, indikator aktif yang bergeser mengikuti section (scrollspy), progress bar tipis di atas halaman.
M5	Kartu project/event: hover mengangkat (translateY + bayangan lembut), gambar zoom 1.04, label aksen terracotta bergeser; fokus keyboard punya efek setara.
M6	Carousel galeri: drag-to-scroll dengan inersia, snap, indikator posisi, kursor "geser" di desktop.
M7	Filter galeri: saat ganti filter, kartu keluar/masuk dengan animasi FLIP (bukan lompat).
M8	Lightbox gambar: klik gambar → buka dengan transisi shared-element, navigasi panah/swipe, `Esc` untuk tutup, fokus terkunci (a11y).
M9	Tombol & form: tombol dengan micro-interaction (magnetic ringan, ripple/underline), input dengan label mengambang dan validasi animasi, status kirim (loading → sukses).
M10	Gambar: blur-up / skeleton saat memuat, `loading="lazy"`, `decoding="async"`, ukuran eksplisit (cegah CLS).
M11	Detail kecil: kursor kustom halus (desktop saja, opsional), efek parallax sangat ringan pada hero, marquee teknologi/tools yang bisa dijeda saat hover.
M12	Loader awal singkat (≤ 600 ms) hanya pada kunjungan pertama sesi; tidak boleh menahan konten.
6. Fitur B — Autentikasi
Backend: Supabase (Auth + Postgres + Storage). Alasan: login, database, dan penyimpanan gambar dalam satu layanan dengan tier gratis, dan konten berubah tanpa rebuild.
Login di `/admin/login` dengan email + password (opsional magic link). Registrasi publik dimatikan. Admin pertama dibuat manual oleh pemilik.
Sesi memakai cookie HttpOnly lewat `@supabase/ssr`; middleware Astro memblokir semua `/admin/*` dan `/api/admin/*` bila belum login atau bukan admin.
Logout, redirect ke login saat sesi habis, rate-limit percobaan login (andalkan pengaturan Supabase + pesan error generik).
7. Fitur C — Manajemen konten
Semua entitas punya status draft / published, urutan manual (drag-and-drop), dan `updated_at`.
Projects (Karya): judul, slug, subjudul, kategori, deskripsi (markdown), fitur (list), tech stack (tag), gambar sampul + galeri, tautan (demo/repo), tanda featured.
Jobs / Pengalaman (Recent Jobs): peran, organisasi, lokasi, tanggal mulai/selesai atau "sekarang", deskripsi, highlight (list), logo opsional.
Galeri Event: judul, kategori (Olahraga/Race, Kampus UNY, Medis, dll.), tahun/tanggal, peran, kamera, deskripsi, kumpulan gambar. Kategori bisa ditambah dari admin.
Media library: upload banyak gambar (drag-drop), kompres otomatis ke WebP (sisi klien, maks 1600 px, target < 400 KB), isi alt text wajib, pakai ulang di entitas mana pun, hapus aman (peringatan jika sedang dipakai).
Halaman kustom (Page builder): slug (`/p/[slug]`), judul, SEO (title, description, og:image), toggle "tampilkan di navbar" + urutan. Isi berupa block yang bisa diurutkan: `heading`, `rich_text` (markdown), `image`, `gallery`, `project_grid`, `job_timeline`, `video_embed` (hanya YouTube/Vimeo), `cta`, `divider`. Ada pratinjau sebelum publish.
Pengaturan situs: teks hero, statistik, kontak, tautan sosial, daftar gear, favicon, meta default.
Admin UI: dashboard ringkas (jumlah konten, draft terbaru), tabel + form, toast notifikasi, validasi inline, konfirmasi sebelum hapus, responsif di HP. Tampilan memakai token desain yang sama dengan situs publik.
8. Arsitektur teknis
Astro dengan adapter `@astrojs/netlify`. Rute publik konten dinamis dan semua `/admin` dirender on-demand (SSR); halaman yang bisa tetap statis, tetap `prerender = true`. Respons publik memakai `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.
Island interaktif untuk admin (Preact atau React kecil). Situs publik tidak memuat framework itu; animasi publik memakai CSS + JS vanilla.
Klien Supabase: `src/lib/supabase/{server,browser}.ts`. Kunci `service_role` hanya untuk skrip seed lokal, tidak pernah masuk bundle klien.
Validasi input dengan Zod di setiap endpoint `/api/admin/*`.
Markdown dirender lalu disanitasi (`rehype-sanitize`) agar aman dari XSS.
Form kontak: pertahankan Netlify Forms (honeypot + reCAPTCHA/Turnstile opsional); pesan tetap dikelola di dashboard Netlify.
Environment variables (`.env`, jangan di-commit; sediakan `.env.example`): `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (hanya lokal untuk seed).
9. Model data (Postgres / Supabase)
```sql
create table admin_users (user_id uuid primary key references auth.users on delete cascade);

create function is_admin() returns boolean language sql stable as
$$ select exists (select 1 from admin_users where user_id = auth.uid()) $$;

create table media (
  id uuid primary key default gen_random_uuid(),
  path text not null, url text not null, alt text not null default '',
  width int, height int, created_at timestamptz default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, title text not null, subtitle text,
  category text, description text, features text[] default '{}',
  stack text[] default '{}', links jsonb default '{}',
  cover_media uuid references media(id), featured boolean default false,
  status text not null default 'draft' check (status in ('draft','published')),
  sort_order int default 0, created_at timestamptz default now(), updated_at timestamptz default now()
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  role text not null, org text not null, location text,
  start_date date, end_date date, is_current boolean default false,
  description text, highlights text[] default '{}', logo_media uuid references media(id),
  status text not null default 'draft' check (status in ('draft','published')),
  sort_order int default 0, updated_at timestamptz default now()
);

create table event_categories (id uuid primary key default gen_random_uuid(), name text unique not null, sort_order int default 0);

create table events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, title text not null,
  category_id uuid references event_categories(id),
  event_date date, role text, camera text, description text,
  cover_media uuid references media(id),
  status text not null default 'draft' check (status in ('draft','published')),
  sort_order int default 0, updated_at timestamptz default now()
);

create table event_media (event_id uuid references events on delete cascade, media_id uuid references media on delete cascade, sort_order int default 0, primary key (event_id, media_id));

create table pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, title text not null,
  blocks jsonb not null default '[]', seo jsonb default '{}',
  show_in_nav boolean default false, nav_order int default 0,
  status text not null default 'draft' check (status in ('draft','published')),
  updated_at timestamptz default now()
);

create table site_settings (id int primary key default 1 check (id = 1), data jsonb not null default '{}');
```
RLS (aktifkan di semua tabel): `anon` boleh `select` hanya baris `status = 'published'` (dan `media`, `event_categories`, `site_settings` untuk dibaca); `insert/update/delete` hanya jika `is_admin()`. Storage bucket `portfolio-media`: baca publik, tulis hanya admin; batasi tipe `image/webp|jpeg|png|avif` dan ukuran ≤ 2 MB.
10. Keamanan
RLS wajib; uji bahwa pengguna anonim tidak bisa menulis dan tidak bisa membaca draft.
Tidak ada secret di kode klien atau repo. `.env` masuk `.gitignore`.
Sanitasi markdown, whitelist domain `video_embed`, validasi slug (`[a-z0-9-]`), validasi upload (tipe + ukuran).
Header keamanan dasar (CSP yang sesuai, `X-Content-Type-Options`, `Referrer-Policy`).
Pesan error login generik; tidak membocorkan apakah email terdaftar.
11. Kriteria penerimaan
[ ] Semua M1–M12 berfungsi; dengan `prefers-reduced-motion` tidak ada gerakan besar.
[ ] Navigasi antar halaman memakai transisi tanpa full reload dan tanpa flash putih.
[ ] Lighthouse mobile ≥ 90, CLS < 0.1, LCP < 2.5 s di halaman utama.
[ ] Pengguna anonim tidak bisa membuka `/admin` (redirect ke login) dan tidak bisa menulis data.
[ ] Admin bisa menambah project, job, event + gambar, dan halaman baru; setelah Publish, muncul di situs publik ≤ 60 detik.
[ ] Draft tidak pernah tampil di situs publik.
[ ] Konten yang sekarang (SISE v2.4, HyPrevent, daftar event, gear, profil) berhasil dipindah ke database lewat seed dan tampilannya sama seperti sebelumnya.
[ ] Semua gambar punya alt text; semua fitur interaktif bisa dipakai dengan keyboard.
[ ] `npm run build` lulus tanpa error; tidak ada error di konsol.
12. Fase pengerjaan
Fase 1 — Motion (tanpa backend): M1–M12.
Fase 2 — Fondasi data: Supabase, skema + RLS, adapter Netlify, seed dari data yang ada, halaman publik membaca dari database.
Fase 3 — Auth + Admin inti: login, middleware, CRUD Projects, Jobs, Events, Media, Settings.
Fase 4 — Page builder: halaman kustom berbasis block + pratinjau + navbar dinamis.
Fase 5 — Polish & QA: aksesibilitas, performa, SEO (sitemap, og:image), uji keamanan, dokumentasi `README`.
13. Langkah manual oleh pemilik (tidak bisa dikerjakan agent)
Buat project di supabase.com; salin URL dan anon key ke `.env`.
Di Supabase: Authentication → matikan Allow new users to sign up; buat satu user (email kamu) lewat dashboard.
Jalankan SQL skema (agent akan membuatkan file migrasi), lalu masukkan `user_id` kamu ke tabel `admin_users`.
Di Netlify: tambahkan environment variables yang sama, lalu deploy.
14. Risiko
Risiko	Mitigasi
Animasi membuat situs berat di HP	Hanya `transform/opacity`, budget JS, uji di perangkat sungguhan.
Konten lama rusak saat migrasi	Seed dari `walex_profile_data.json`, bandingkan visual sebelum/sesudah.
Ketergantungan pada layanan eksternal	Ekspor data berkala (skrip `npm run backup` ke JSON).
Agent mengerjakan terlalu banyak sekaligus	Kerjakan per fase, review diff sebelum lanjut.
# PRD — Walex Portfolio v2: Motion + Admin CMS

> Letakkan file ini di root proyek (`/PRD.md`). Semua prompt di `ANTIGRAVITY_PROMPTS.md` merujuk ke dokumen ini.

## 1. Ringkasan

Portfolio pribadi "walex." yang sekarang statis dan kontennya tertanam di kode. Versi 2 punya dua tujuan:

1. **Terasa hidup**: animasi, transisi antar-halaman, dan micro-interaction yang halus tanpa mengorbankan kecepatan.
2. **Bisa dikelola sendiri**: pemilik login ke `/admin` untuk menambah dan mengedit project, pengalaman kerja (jobs), galeri event, gambar, dan halaman baru, tanpa menyentuh kode.

## 2. Kondisi saat ini (jangan dirusak)

- Framework: **Astro** + **Tailwind CSS v4** (token di `@theme` pada `src/styles/global.css`). Dev server `localhost:4321`.
- Struktur: `src/layouts/Layout.astro`, `src/pages/index.astro`, `src/styles/global.css`. Ada juga `walex_profile_data.json` (sumber data profil, dipakai untuk seed).
- Desain: kertas krem + tinta hitam + aksen terracotta (`--color-paper`, `--color-ink`, `--color-terracotta`, `--color-subtle`, `--color-line`). Font: Playfair Display (judul), Plus Jakarta Sans (isi), Fira Code (label mono).
- Bagian halaman: Hero + statistik, **Karya** (SISE v2.4, HyPrevent), **Peran & Skill**, **Tentang & Gear**, **Galeri Event** (carousel horizontal + grid dengan filter Semua / Olahraga-Race / Kampus UNY / Medis), **Kontak** (form Netlify).
- Bahasa konten: Indonesia. Gaya visual editorial-minimal. **Pertahankan identitas ini**; animasi harus memperkuatnya, bukan menggantinya.

## 3. Tujuan dan non-tujuan

**Tujuan**
- G1. Semua bagian punya animasi masuk, hover, dan transisi halaman yang konsisten.
- G2. Pemilik bisa login dan mengelola: Projects, Jobs/Pengalaman, Galeri Event, Media, Halaman kustom, Pengaturan situs.
- G3. Perubahan di admin tampil di situs publik dalam ≤ 60 detik tanpa deploy ulang.
- G4. Skor Lighthouse mobile tetap ≥ 90 (Performance, Accessibility, SEO).

**Bukan tujuan (v2)**
- Registrasi publik, komentar, multi-user, multi-bahasa, e-commerce, blog penuh.

## 4. Pengguna

| Peran | Hak |
|---|---|
| Pengunjung | Baca konten yang berstatus *published*, kirim form kontak. |
| Admin (pemilik, 1 orang) | Login, CRUD semua konten, upload media, draft/publish. |

## 5. Fitur A — Motion dan transisi

Prinsip: hanya animasikan `transform` dan `opacity`; durasi 200–700 ms; easing `cubic-bezier(0.22, 1, 0.36, 1)`; **wajib menghormati `prefers-reduced-motion`** (matikan semua gerak, pertahankan fade singkat). Tambahan JS publik ≤ 40 KB gzip.

| ID | Kebutuhan |
|---|---|
| M1 | **Satu halaman, scroll ke bawah** (keputusan pemilik): Karya, Peran & Skill, Tentang & Gear, Galeri Event, dan Kontak tetap berupa section dalam satu halaman. Klik menu navbar = *smooth scroll* ke section (offset tinggi navbar), URL ikut berubah ke `#section` tanpa reload. Tidak ada pergantian halaman. Transisi antar-halaman (View Transitions) hanya dipakai untuk halaman kustom `/p/[slug]` dari admin, bukan untuk section utama. Detail koreografi animasi per section ada di `SCROLL_ANIMATION_GUIDE.md`. |
| M2 | **Scroll reveal**: setiap section dan kartu muncul dengan fade-up + stagger 60–80 ms, memakai `IntersectionObserver` (sekali jalan, tanpa library berat). |
| M3 | **Hero**: judul masuk per baris/kata (split reveal), statistik angka menghitung naik saat terlihat (count-up), indikator scroll kecil. |
| M4 | **Navbar**: efek blur/shrink saat scroll, indikator aktif yang bergeser mengikuti section (scrollspy), progress bar tipis di atas halaman. |
| M5 | **Kartu project/event**: hover mengangkat (translateY + bayangan lembut), gambar zoom 1.04, label aksen terracotta bergeser; fokus keyboard punya efek setara. |
| M6 | **Carousel galeri**: drag-to-scroll dengan inersia, snap, indikator posisi, kursor "geser" di desktop. |
| M7 | **Filter galeri**: saat ganti filter, kartu keluar/masuk dengan animasi FLIP (bukan lompat). |
| M8 | **Lightbox gambar**: klik gambar → buka dengan transisi shared-element, navigasi panah/swipe, `Esc` untuk tutup, fokus terkunci (a11y). |
| M9 | **Tombol & form**: tombol dengan micro-interaction (magnetic ringan, ripple/underline), input dengan label mengambang dan validasi animasi, status kirim (loading → sukses). |
| M10 | **Gambar**: blur-up / skeleton saat memuat, `loading="lazy"`, `decoding="async"`, ukuran eksplisit (cegah CLS). |
| M11 | **Detail kecil**: kursor kustom halus (desktop saja, opsional), efek parallax sangat ringan pada hero, marquee teknologi/tools yang bisa dijeda saat hover. |
| M12 | **Loader awal** singkat (≤ 600 ms) hanya pada kunjungan pertama sesi; tidak boleh menahan konten. |

## 6. Fitur B — Autentikasi

- Backend: **Supabase** (Auth + Postgres + Storage). Alasan: login, database, dan penyimpanan gambar dalam satu layanan dengan tier gratis, dan konten berubah tanpa rebuild.
- Login di `/admin/login` dengan email + password (opsional magic link). **Registrasi publik dimatikan.** Admin pertama dibuat manual oleh pemilik.
- Sesi memakai cookie HttpOnly lewat `@supabase/ssr`; middleware Astro memblokir semua `/admin/*` dan `/api/admin/*` bila belum login atau bukan admin.
- Logout, redirect ke login saat sesi habis, rate-limit percobaan login (andalkan pengaturan Supabase + pesan error generik).

## 7. Fitur C — Manajemen konten

Semua entitas punya status **draft / published**, urutan manual (drag-and-drop), dan `updated_at`.

1. **Projects (Karya)**: judul, slug, subjudul, kategori, deskripsi (markdown), fitur (list), tech stack (tag), gambar sampul + galeri, tautan (demo/repo), tanda *featured*.
2. **Jobs / Pengalaman (Recent Jobs)**: peran, organisasi, lokasi, tanggal mulai/selesai atau "sekarang", deskripsi, highlight (list), logo opsional.
3. **Galeri Event**: judul, kategori (Olahraga/Race, Kampus UNY, Medis, dll.), tahun/tanggal, peran, kamera, deskripsi, kumpulan gambar. Kategori bisa ditambah dari admin.
4. **Media library**: upload banyak gambar (drag-drop), kompres otomatis ke WebP (sisi klien, maks 1600 px, target < 400 KB), isi alt text wajib, pakai ulang di entitas mana pun, hapus aman (peringatan jika sedang dipakai).
5. **Halaman kustom (Page builder)**: slug (`/p/[slug]`), judul, SEO (title, description, og:image), toggle "tampilkan di navbar" + urutan. Isi berupa **block** yang bisa diurutkan: `heading`, `rich_text` (markdown), `image`, `gallery`, `project_grid`, `job_timeline`, `video_embed` (hanya YouTube/Vimeo), `cta`, `divider`. Ada pratinjau sebelum publish.
6. **Pengaturan situs**: teks hero, statistik, kontak, tautan sosial, daftar gear, favicon, meta default.

Admin UI: dashboard ringkas (jumlah konten, draft terbaru), tabel + form, toast notifikasi, validasi inline, konfirmasi sebelum hapus, responsif di HP. Tampilan memakai token desain yang sama dengan situs publik.

## 8. Arsitektur teknis

- Astro dengan adapter **`@astrojs/netlify`**. Rute publik konten dinamis dan semua `/admin` dirender **on-demand (SSR)**; halaman yang bisa tetap statis, tetap `prerender = true`. Respons publik memakai `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.
- Island interaktif untuk admin (Preact atau React kecil). **Situs publik tidak memuat framework itu**; animasi publik memakai CSS + JS vanilla.
- Klien Supabase: `src/lib/supabase/{server,browser}.ts`. Kunci `service_role` **hanya** untuk skrip seed lokal, tidak pernah masuk bundle klien.
- Validasi input dengan Zod di setiap endpoint `/api/admin/*`.
- Markdown dirender lalu disanitasi (`rehype-sanitize`) agar aman dari XSS.
- Form kontak: pertahankan Netlify Forms (honeypot + reCAPTCHA/Turnstile opsional); pesan tetap dikelola di dashboard Netlify.
- Environment variables (`.env`, jangan di-commit; sediakan `.env.example`): `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (hanya lokal untuk seed).

## 9. Model data (Postgres / Supabase)

```sql
create table admin_users (user_id uuid primary key references auth.users on delete cascade);

create function is_admin() returns boolean language sql stable as
$$ select exists (select 1 from admin_users where user_id = auth.uid()) $$;

create table media (
  id uuid primary key default gen_random_uuid(),
  path text not null, url text not null, alt text not null default '',
  width int, height int, created_at timestamptz default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, title text not null, subtitle text,
  category text, description text, features text[] default '{}',
  stack text[] default '{}', links jsonb default '{}',
  cover_media uuid references media(id), featured boolean default false,
  status text not null default 'draft' check (status in ('draft','published')),
  sort_order int default 0, created_at timestamptz default now(), updated_at timestamptz default now()
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  role text not null, org text not null, location text,
  start_date date, end_date date, is_current boolean default false,
  description text, highlights text[] default '{}', logo_media uuid references media(id),
  status text not null default 'draft' check (status in ('draft','published')),
  sort_order int default 0, updated_at timestamptz default now()
);

create table event_categories (id uuid primary key default gen_random_uuid(), name text unique not null, sort_order int default 0);

create table events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, title text not null,
  category_id uuid references event_categories(id),
  event_date date, role text, camera text, description text,
  cover_media uuid references media(id),
  status text not null default 'draft' check (status in ('draft','published')),
  sort_order int default 0, updated_at timestamptz default now()
);

create table event_media (event_id uuid references events on delete cascade, media_id uuid references media on delete cascade, sort_order int default 0, primary key (event_id, media_id));

create table pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, title text not null,
  blocks jsonb not null default '[]', seo jsonb default '{}',
  show_in_nav boolean default false, nav_order int default 0,
  status text not null default 'draft' check (status in ('draft','published')),
  updated_at timestamptz default now()
);

create table site_settings (id int primary key default 1 check (id = 1), data jsonb not null default '{}');
```

**RLS** (aktifkan di semua tabel): `anon` boleh `select` hanya baris `status = 'published'` (dan `media`, `event_categories`, `site_settings` untuk dibaca); `insert/update/delete` hanya jika `is_admin()`. Storage bucket `portfolio-media`: baca publik, tulis hanya admin; batasi tipe `image/webp|jpeg|png|avif` dan ukuran ≤ 2 MB.

## 10. Keamanan

- RLS wajib; uji bahwa pengguna anonim tidak bisa menulis dan tidak bisa membaca draft.
- Tidak ada secret di kode klien atau repo. `.env` masuk `.gitignore`.
- Sanitasi markdown, whitelist domain `video_embed`, validasi slug (`[a-z0-9-]`), validasi upload (tipe + ukuran).
- Header keamanan dasar (CSP yang sesuai, `X-Content-Type-Options`, `Referrer-Policy`).
- Pesan error login generik; tidak membocorkan apakah email terdaftar.

## 11. Kriteria penerimaan

- [ ] Semua M1–M12 berfungsi; dengan `prefers-reduced-motion` tidak ada gerakan besar.
- [ ] Navigasi antar halaman memakai transisi tanpa full reload dan tanpa flash putih.
- [ ] Lighthouse mobile ≥ 90, CLS < 0.1, LCP < 2.5 s di halaman utama.
- [ ] Pengguna anonim tidak bisa membuka `/admin` (redirect ke login) dan tidak bisa menulis data.
- [ ] Admin bisa menambah project, job, event + gambar, dan halaman baru; setelah *Publish*, muncul di situs publik ≤ 60 detik.
- [ ] Draft tidak pernah tampil di situs publik.
- [ ] Konten yang sekarang (SISE v2.4, HyPrevent, daftar event, gear, profil) berhasil dipindah ke database lewat seed dan tampilannya sama seperti sebelumnya.
- [ ] Semua gambar punya alt text; semua fitur interaktif bisa dipakai dengan keyboard.
- [ ] `npm run build` lulus tanpa error; tidak ada error di konsol.

## 12. Fase pengerjaan

1. **Fase 1 — Motion** (tanpa backend): M1–M12.
2. **Fase 2 — Fondasi data**: Supabase, skema + RLS, adapter Netlify, seed dari data yang ada, halaman publik membaca dari database.
3. **Fase 3 — Auth + Admin inti**: login, middleware, CRUD Projects, Jobs, Events, Media, Settings.
4. **Fase 4 — Page builder**: halaman kustom berbasis block + pratinjau + navbar dinamis.
5. **Fase 5 — Polish & QA**: aksesibilitas, performa, SEO (sitemap, og:image), uji keamanan, dokumentasi `README`.

## 13. Langkah manual oleh pemilik (tidak bisa dikerjakan agent)

1. Buat project di supabase.com; salin URL dan anon key ke `.env`.
2. Di Supabase: Authentication → matikan *Allow new users to sign up*; buat satu user (email kamu) lewat dashboard.
3. Jalankan SQL skema (agent akan membuatkan file migrasi), lalu masukkan `user_id` kamu ke tabel `admin_users`.
4. Di Netlify: tambahkan environment variables yang sama, lalu deploy.

## 14. Risiko

| Risiko | Mitigasi |
|---|---|
| Animasi membuat situs berat di HP | Hanya `transform/opacity`, budget JS, uji di perangkat sungguhan. |
| Konten lama rusak saat migrasi | Seed dari `walex_profile_data.json`, bandingkan visual sebelum/sesudah. |
| Ketergantungan pada layanan eksternal | Ekspor data berkala (skrip `npm run backup` ke JSON). |
| Agent mengerjakan terlalu banyak sekaligus | Kerjakan per fase, review diff sebelum lanjut. |