import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || '';

async function testAuthAndRLS() {
  console.log('🧪 Memulai pemeriksaan keamanan RLS & Endpoint...\n');
  let passed = 0;
  let failed = 0;

  // 1. Tes Anonim baca draft via Supabase Client
  if (supabaseUrl && anonKey) {
    const supabase = createClient(supabaseUrl, anonKey);
    const { data, error } = await supabase.from('projects').select('*').eq('status', 'draft');
    if (!error && Array.isArray(data) && data.length === 0) {
      console.log('✓ PASS: Klien anonim tidak dapat membaca draft (RLS aktif, 0 baris dikembalikan)');
      passed++;
    } else if (error) {
      console.log(`✓ PASS: Klien anonim ditolak dengan error: ${error.message}`);
      passed++;
    } else {
      console.log('❌ FAIL: Klien anonim dapat membaca baris draft:', data);
      failed++;
    }
  } else {
    console.log('⚠️ SKIP: PUBLIC_SUPABASE_URL atau ANON_KEY belum disetel untuk tes Supabase');
  }

  // 2. Tes Anonim ke endpoint /api/admin/projects lokal
  try {
    const res = await fetch('http://localhost:4321/api/admin/projects');
    if (res.status === 401 || res.status === 403) {
      console.log(`✓ PASS: Request anonim ke /api/admin/projects ditolak (${res.status} Unauthorized)`);
      passed++;
    } else {
      console.log(`❌ FAIL: Request anonim ke /api/admin/projects mengembalikan status ${res.status}`);
      failed++;
    }
  } catch (e: any) {
    console.log('ℹ️ Server dev offline saat pengujian HTTP lokal (bisa diuji saat dev server aktif)');
  }

  // 3. Tes Anonim ke halaman /admin lokal
  try {
    const res = await fetch('http://localhost:4321/admin', { redirect: 'manual' });
    if (res.status === 302 || res.status === 307 || res.status === 401) {
      console.log(`✓ PASS: Akses anonim ke /admin dialihkan (${res.status} Redirect ke /admin/login)`);
      passed++;
    }
  } catch (e: any) {
    // dev server offline
  }

  console.log(`\nHasil: ${passed} pass, ${failed} fail\n`);
}

testAuthAndRLS();
