/**
 * scripts/backup.ts
 * Export all content tables to JSON.
 * Usage: npm run backup
 * Output: backups/backup-<timestamp>.json + backups/latest.json
 */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌  Set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url, key);

const TABLES = [
  'projects',
  'jobs',
  'event_categories',
  'events',
  'event_media',
  'pages',
  'media',
  'site_settings',
] as const;

async function exportTable(table: string) {
  const { data, error } = await supabase.from(table).select('*');
  if (error) {
    console.warn(`  ⚠️  ${table}: ${error.message}`);
    return [];
  }
  console.log(`  ✅  ${table}: ${data?.length ?? 0} rows`);
  return data ?? [];
}

async function main() {
  console.log('\n📦  Walex Portfolio — Database Backup\n');

  const backup: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    backup[table] = await exportTable(table);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = join(ROOT, 'backups');
  mkdirSync(backupDir, { recursive: true });

  const filePath = join(backupDir, `backup-${timestamp}.json`);
  const latestPath = join(backupDir, 'latest.json');

  const payload = { exportedAt: new Date().toISOString(), tables: backup };
  const json = JSON.stringify(payload, null, 2);

  writeFileSync(filePath, json, 'utf8');
  writeFileSync(latestPath, json, 'utf8');

  console.log(`\n✅  Backup saved to:\n   ${filePath}\n   ${latestPath}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
