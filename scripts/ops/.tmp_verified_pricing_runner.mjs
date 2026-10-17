import path from 'node:path';
import { pathToFileURL } from 'node:url';
import '../../backend/env.mjs';

const projectRef = 'ycdxbpibncqcchqiihfz';
const projectUrl = new URL(process.env.SUPABASE_URL ?? '');
if (projectUrl.hostname !== `${projectRef}.supabase.co`) throw new Error(`unexpected_supabase_project:${projectUrl.hostname}`);
const raw = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!raw) throw new Error('missing_database_url');
const url = new URL(raw);
if (url.hostname === `db.${projectRef}.supabase.co`) {
  url.hostname = 'aws-1-us-east-2.pooler.supabase.com';
  url.port = '5432';
  url.username = `postgres.${projectRef}`;
}
url.searchParams.set('sslmode', 'verify-full');
process.env.SUPABASE_DB_URL = url.toString();
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
const [target, ...args] = process.argv.slice(2);
if (!target) throw new Error('target_script_required');
const targetPath = path.resolve(target);
process.argv = [process.argv[0], targetPath, ...args];
await import(pathToFileURL(targetPath).href);
