import { createClient } from '@supabase/supabase-js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Environment variable validation ──────────────────────────────────────────
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('\n❌ ERROR: SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di environment.');
  console.error('Pastikan file .env berisi:');
  console.error('  PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co');
  console.error('  PUBLIC_SUPABASE_ANON_KEY=eyJ...');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=eyJ...');
  console.error('\nLalu jalankan: npm run seed\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ── Read JSON source ────────────────────────────────────────────────────────
const jsonPath = path.resolve(process.cwd(), 'walex_profile_data.json');
let localProfileData: any = {};
if (fs.existsSync(jsonPath)) {
  try {
    localProfileData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  } catch (err) {
    console.warn('⚠️ Gagal membaca walex_profile_data.json, menggunakan data default.');
  }
}

// ── 1. Event Categories ─────────────────────────────────────────────────────
const categories = [
  { name: 'Olahraga / Race', sort_order: 1 },
  { name: 'Kampus UNY', sort_order: 2 },
  { name: 'Medis', sort_order: 3 },
  { name: 'Semua Event', sort_order: 4 },
];

// ── 2. Events Data ──────────────────────────────────────────────────────────
const eventsData = [
  {
    slug: 'dieng-caldera-race-trail-run-2024',
    title: 'Dieng Caldera Race Trail Run 2024',
    categoryName: 'Olahraga / Race',
    event_date: '2024-06-01',
    role: 'Assistant Videographer & Photographer',
    camera: 'Fujifilm XA-3, Sony A6400',
    description: 'Dokumentasi pelari trail run medan ekstrem di dataran tinggi Dieng.',
    status: 'published',
    sort_order: 1
  },
  {
    slug: 'vertical-telomoyo-trail-run-2023',
    title: 'Vertical Telomoyo Trail Run 2023',
    categoryName: 'Olahraga / Race',
    event_date: '2023-07-01',
    role: 'Main Videographer, Photographer & Editor',
    camera: 'Sony A6400',
    description: 'Liputan sinematik ajang lari gunung berkecepatan tinggi di Telomoyo.',
    status: 'published',
    sort_order: 2
  },
  {
    slug: 'fun-run-uny-2025',
    title: 'Fun Run UNY 2025',
    categoryName: 'Olahraga / Race',
    event_date: '2025-05-01',
    role: 'Videographer, Photographer & Editor',
    camera: 'Sony A6400',
    description: 'Dokumentasi lari gembira perayaan civitas akademika UNY.',
    status: 'published',
    sort_order: 3
  },
  {
    slug: 'ugm-nursing-student-rs-sardjito-2024',
    title: 'UGM Nursing Student @ RS Sardjito 2024',
    categoryName: 'Medis',
    event_date: '2024-09-01',
    role: 'Videographer & Editor',
    camera: 'Sony A6400',
    description: 'Dokumentasi operasional & praktik keperawatan UGM di RS Sardjito.',
    status: 'published',
    sort_order: 4
  },
  {
    slug: 'pkkmb-universitas-negeri-yogyakarta-2024',
    title: 'PKKMB Universitas Negeri Yogyakarta 2024',
    categoryName: 'Kampus UNY',
    event_date: '2024-08-01',
    role: 'Videographer, Photographer & Design Staff',
    camera: 'Sony A6400 & Fujifilm XA-3',
    description: 'Penyusunan video aftermovie dan foto orientasi mahasiswa baru.',
    status: 'published',
    sort_order: 5
  },
  {
    slug: 'wonderoots-fakultas-vokasi-2025',
    title: 'Wonderoots Fakultas Vokasi 2025',
    categoryName: 'Kampus UNY',
    event_date: '2025-02-01',
    role: 'Photographer',
    camera: 'Sony A6400',
    description: 'Dokumentasi kegiatan gelar seni dan budaya vokasi.',
    status: 'published',
    sort_order: 6
  },
  {
    slug: 'ramadhan-di-kampus-fv-uny-2024',
    title: 'Ramadhan di Kampus (RDK) FV UNY 2024',
    categoryName: 'Kampus UNY',
    event_date: '2024-03-01',
    role: 'Videographer, Photographer & Sie PDD',
    camera: 'Fujifilm XA-3',
    description: 'Serangkaian dokumentasi kegiatan keagamaan dan sosial selama ramadhan.',
    status: 'published',
    sort_order: 7
  },
  {
    slug: 'timbulharjo-fun-run-2024',
    title: 'Timbulharjo Fun Run 2024',
    categoryName: 'Olahraga / Race',
    event_date: '2024-10-01',
    role: 'Photographer',
    camera: 'Sony A6400',
    description: 'Liputan foto olahraga kemasyarakatan di Timbulharjo.',
    status: 'published',
    sort_order: 8
  },
  {
    slug: 'grintii-apparel-hub-2023-2024',
    title: 'Grintii Apparel Hub 2023-2024',
    categoryName: 'Semua Event',
    event_date: '2023-11-01',
    role: 'Photographer',
    camera: 'Sony A6400',
    description: 'Sesi foto komersial katalog pakaian dan merchandise.',
    status: 'published',
    sort_order: 9
  }
];

// ── 3. Projects (Karya) Data ────────────────────────────────────────────────
const projectsData = [
  {
    slug: 'sise-v2-4',
    title: 'SISE v2.4 (Enterprise Edition)',
    subtitle: 'Sistem Laporan Naratif Surveilans Kesehatan Kedinasan',
    category: 'Enterprise Health-Tech',
    description: 'Aplikasi otomatisasi surveilans epidemiologi yang menerjemahkan data mentah Excel/CSV dari puskesmas menjadi draf laporan naratif resmi kedinasan (Bab I–V) siap pakai.',
    features: [
      'Otomatisasi Laporan Bab I hingga Bab V standar Kemenkes/Dinkes',
      'Parsing otomatis spreadsheet Puskesmas se-Kabupaten Kulon Progo',
      'Penghematan waktu pembuatan laporan bulanan hingga 85%',
      'Keamanan data lokal berbasis Web Client-side'
    ],
    stack: ['Python', 'JavaScript Parser', 'Astro', 'Tailwind CSS', 'AI Prompting'],
    links: {
      client: 'Dinas Kesehatan Kabupaten Kulon Progo (Bidang P2P)',
      badge: 'Enterprise Health-Tech',
      interactiveSimulator: true
    },
    featured: true,
    status: 'published',
    sort_order: 1
  },
  {
    slug: 'hyprevent-platform',
    title: 'HyPrevent Platform',
    subtitle: 'Interactive Hypertension Education & Risk Assessment',
    category: 'Live Interactive Web App',
    description: 'Platform edukasi interaktif pencegahan hipertensi berbasis kalkulator asesmen risiko sistolik personal harian dengan rekomendasi gaya hidup presisi.',
    features: [
      'Kalkulator Risiko Sistolik/Diastolik realtime',
      'Algoritma klasifikasi rekomendasi presisi WHO/Kemenkes',
      'Interface ramah pengguna seluler (Mobile First design)'
    ],
    stack: ['HTML5', 'Tailwind CSS', 'JavaScript', 'Health Math'],
    links: {
      client: 'Edukasi Mandiri & Publikasi Digital',
      badge: 'Live Interactive Web App',
      url: 'https://hyprevent.netlify.app'
    },
    featured: true,
    status: 'published',
    sort_order: 2
  },
  {
    slug: 'ceritaku-kulon-progo',
    title: 'CeritaKu Kulon Progo',
    subtitle: 'Wellness Tourism & Community Health Advocacy Initiative',
    category: 'Tourism & Health Synergy',
    description: 'Inisiatif promosi pariwisata kesehatan yang menghubungkan keindahan alam Kulon Progo dengan gaya hidup aktif dan pemulihan kesehatan mental masyarakat.',
    features: [
      'Koleksi narasi visual sinematik destinasi Kulon Progo',
      'Program advokasi kebugaran & kesehatan mental terpadu',
      'Kemitraan strategis dengan pelaku pariwisata lokal'
    ],
    stack: ['Visual Storytelling', 'Public Health Advocacy', 'Wellness Tourism'],
    links: {
      client: 'Dinas Pariwisata Kulon Progo',
      badge: 'Tourism & Health Synergy'
    },
    featured: true,
    status: 'published',
    sort_order: 3
  }
];

// ── 4. Jobs / Pengalaman ────────────────────────────────────────────────────
const jobsData = [
  {
    role: 'Internship Promotor K3 & AI Trainer',
    org: 'Dinas Kesehatan Kabupaten Kulon Progo (Bidang P2P)',
    location: 'Kulon Progo, DIY',
    is_current: false,
    description: 'Promotor K3 dan pelatih AI untuk otomatisasi surveilans epidemiologi kedinasan.',
    highlights: [
      'Internship Promotor K3 & AI Trainer - Dinkes Kulon Progo (Bidang P2P)',
      'Otomatisasi pengolahan data puskesmas ke format naratif standar'
    ],
    status: 'published',
    sort_order: 1
  },
  {
    role: 'Internship Marketing & Promotor K3',
    org: 'PT Merbabu Safety Indonesia',
    location: 'Yogyakarta',
    is_current: false,
    description: 'Edukasi keselamatan kerja dan kampanye K3 di sektor industri dan publik.',
    highlights: [
      'Internship Marketing & Promotor K3 - PT Merbabu Safety Indonesia',
      'Sosialisasi standar proteksi personal industri'
    ],
    status: 'published',
    sort_order: 2
  },
  {
    role: 'Konselor Sebaya Kesehatan Mental',
    org: 'Fakultas Vokasi UNY',
    location: 'Yogyakarta',
    is_current: true,
    description: 'Pendampingan empati dan edukasi preventif kesehatan jiwa mahasiswa vokasi.',
    highlights: [
      'Konselor Sebaya Kesehatan Mental - Fakultas Vokasi UNY (2025–2026)',
      'Rujukan suportif dan fasilitasi dialog kesehatan mental'
    ],
    status: 'published',
    sort_order: 3
  },
  {
    role: 'Advokator Kesehatan Pedagang',
    org: 'Pasar Wates Kulon Progo',
    location: 'Kulon Progo, DIY',
    is_current: false,
    description: 'Advokasi perilaku hidup bersih dan sehat (PHBS) bagi komunitas pedagang pasar tradisional.',
    highlights: [
      'Advokator Kesehatan Pedagang - Pasar Wates Kulon Progo'
    ],
    status: 'published',
    sort_order: 4
  }
];

// ── Main Seed Runner ────────────────────────────────────────────────────────
async function runSeed() {
  console.log('🚀 Memulai proses seed ke Supabase...');

  // 1. Seed Categories
  console.log('📦 Seeding event_categories...');
  const catMap = new Map<string, string>();
  for (const cat of categories) {
    const { data, error } = await supabase
      .from('event_categories')
      .upsert(cat, { onConflict: 'name' })
      .select('id, name')
      .single();

    if (error) {
      console.error(`  ❌ Gagal upsert kategori ${cat.name}:`, error.message);
    } else if (data) {
      catMap.set(data.name, data.id);
      console.log(`  ✓ Kategori: ${data.name}`);
    }
  }

  // 2. Seed Events
  console.log('\n📸 Seeding events...');
  for (const ev of eventsData) {
    const category_id = catMap.get(ev.categoryName) || null;
    const { error } = await supabase
      .from('events')
      .upsert({
        slug: ev.slug,
        title: ev.title,
        category_id,
        event_date: ev.event_date,
        role: ev.role,
        camera: ev.camera,
        description: ev.description,
        status: ev.status,
        sort_order: ev.sort_order,
        updated_at: new Date().toISOString()
      }, { onConflict: 'slug' });

    if (error) {
      console.error(`  ❌ Gagal upsert event ${ev.title}:`, error.message);
    } else {
      console.log(`  ✓ Event: ${ev.title}`);
    }
  }

  // 3. Seed Projects
  console.log('\n💻 Seeding projects...');
  for (const proj of projectsData) {
    const { error } = await supabase
      .from('projects')
      .upsert({
        slug: proj.slug,
        title: proj.title,
        subtitle: proj.subtitle,
        category: proj.category,
        description: proj.description,
        features: proj.features,
        stack: proj.stack,
        links: proj.links,
        featured: proj.featured,
        status: proj.status,
        sort_order: proj.sort_order,
        updated_at: new Date().toISOString()
      }, { onConflict: 'slug' });

    if (error) {
      console.error(`  ❌ Gagal upsert project ${proj.title}:`, error.message);
    } else {
      console.log(`  ✓ Project: ${proj.title}`);
    }
  }

  // 4. Seed Jobs
  console.log('\n💼 Seeding jobs...');
  for (const job of jobsData) {
    const { error } = await supabase
      .from('jobs')
      .upsert({
        role: job.role,
        org: job.org,
        location: job.location,
        is_current: job.is_current,
        description: job.description,
        highlights: job.highlights,
        status: job.status,
        sort_order: job.sort_order,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error(`  ❌ Gagal upsert job ${job.role}:`, error.message);
    } else {
      console.log(`  ✓ Job: ${job.role} (${job.org})`);
    }
  }

  // 5. Seed Site Settings
  console.log('\n⚙️ Seeding site_settings (id: 1)...');
  const settingsData = {
    profile: localProfileData.profile,
    roles: localProfileData.roles,
    skillChart: localProfileData.skillChart,
    gearList: localProfileData.gearList,
    randomFacts: localProfileData.randomFacts,
    photoStrip: localProfileData.photoStrip,
  };

  const { error: settingsError } = await supabase
    .from('site_settings')
    .upsert({
      id: 1,
      data: settingsData
    }, { onConflict: 'id' });

  if (settingsError) {
    console.error('  ❌ Gagal upsert site_settings:', settingsError.message);
  } else {
    console.log('  ✓ site_settings (profile, roles, skills, gear, facts, photoStrip) tersimpan.');
  }

  console.log('\n✨ SEED DATABASE SELESAI!');
}

runSeed().catch(err => {
  console.error('\n❌ Unhandled seed error:', err);
  process.exit(1);
});
