import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

const BUCKET = 'listly-saves';
const HASH = (code) => createHash('sha256').update(code).digest('hex');
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return json({ error: 'Cloud storage is not configured yet.' }, 500);
    const body = await req.json();
    const code = String(body?.code || '').trim().toUpperCase();
    if (!/^LST-[A-F0-9]{16}$/.test(code)) return json({ error: 'That recovery code is not valid.' }, 400);

    const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: record, error: lookupError } = await supabase.from('listly_saves').select('file_path, expires_at').eq('code_hash', HASH(code)).maybeSingle();
    if (lookupError) throw lookupError;
    if (!record || (record.expires_at && new Date(record.expires_at).getTime() < Date.now())) return json({ error: 'No save file was found for that code.' }, 404);

    const { data: file, error: downloadError } = await supabase.storage.from(BUCKET).download(record.file_path);
    if (downloadError || !file) return json({ error: 'The saved file could not be retrieved.' }, 404);
    const text = await file.text();
    if (!text.startsWith('LISTLY_SAVE_FILE_V1') || text.includes('\u0000')) return json({ error: 'The stored file failed validation.' }, 500);
    return new Response(text, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8', 'content-disposition': 'attachment; filename="Listly_Save.txt"', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
  } catch (error) {
    console.error('Listly retrieve error:', error?.message || error);
    return json({ error: 'Retrieval could not be completed. Check the site configuration and try again.' }, 500);
  }
};
