import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

const MAX_BYTES = 256 * 1024;
const BUCKET = 'listly-saves';
const HASH = (code) => createHash('sha256').update(code).digest('hex');
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return json({ error: 'Cloud storage is not configured yet.' }, 500);

    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') return json({ error: 'Choose a .txt save file first.' }, 400);
    if (!String(file.name || '').toLowerCase().endsWith('.txt')) return json({ error: 'Only .txt files are accepted.' }, 400);
    if (file.size > MAX_BYTES) return json({ error: 'This file is too large. Maximum size is 256 KB.' }, 413);

    const bytes = Buffer.from(await file.arrayBuffer());
    const content = bytes.toString('utf8');
    if (content.includes('\u0000') || !content.startsWith('LISTLY_SAVE_FILE_V1')) return json({ error: 'This does not look like a valid Listly V1 save file.' }, 400);
    if (Buffer.from(content, 'utf8').compare(bytes) !== 0) return json({ error: 'The file must be valid UTF-8 text.' }, 400);

    const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const filePath = `${randomUUID()}.txt`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, bytes, { contentType: 'text/plain', upsert: false });
    if (uploadError) throw uploadError;

    // 64-bit random recovery code. Only its SHA-256 hash is stored in the database.
    const code = `LST-${randomBytes(8).toString('hex').toUpperCase()}`;
    const { error: insertError } = await supabase.from('listly_saves').insert({ code_hash: HASH(code), file_path: filePath });
    if (insertError) {
      await supabase.storage.from(BUCKET).remove([filePath]);
      throw insertError;
    }
    return json({ code });
  } catch (error) {
    console.error('Listly upload error:', error?.message || error);
    return json({ error: 'Upload could not be completed. Check the site configuration and try again.' }, 500);
  }
};
