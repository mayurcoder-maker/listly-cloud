LISTLY CLOUD — BETA TEST 1
==========================

This is a Netlify site project, not a single standalone HTML file. It includes:
- index.html: upload/retrieve website and a small updates panel
- netlify/functions/upload.mjs: validates and uploads Listly V1 TXT saves
- netlify/functions/retrieve.mjs: looks up recovery codes and returns the private file
- netlify.toml and package.json: Netlify build configuration and dependency

BEFORE DEPLOYING
----------------
1. In Supabase, confirm you have a PRIVATE Storage bucket named exactly:
   listly-saves
2. Confirm the public.listly_saves table exists with columns:
   id (uuid), code_hash (text), file_path (text), created_at (timestamptz), expires_at (timestamptz nullable)
3. Do NOT put the Supabase service-role key in index.html or any public file.

DEPLOY TO NETLIFY
-----------------
Netlify Functions need a project deploy, not just uploading index.html by itself.
Recommended beginner route:
1. Create a private GitHub repository for this project.
2. Upload the CONTENTS of this folder to the repository (index.html must be at its root).
3. In Netlify, choose Add new site / Import an existing project and connect that repository.
4. Build settings: no build command; publish directory: .
5. Deploy.

SET NETLIFY ENVIRONMENT VARIABLES
---------------------------------
In Netlify: Site configuration (or Project configuration) > Environment variables.
Add these exact names, with scope including Functions:

SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY

Get SUPABASE_URL from Supabase Project Settings > API (Project URL).
Get SUPABASE_SERVICE_ROLE_KEY from Supabase Project Settings > API Keys.
Use the secret service_role key (or the current secret key intended for server-side use).
Never paste the key into chat, HTML, GitHub, or a screenshot.
After setting variables, trigger a fresh deploy.

TEST
----
1. Open your deployed Netlify site.
2. Upload a valid Listly .txt file beginning with LISTLY_SAVE_FILE_V1.
3. Save the recovery code somewhere private.
4. Open the site on another device/browser and enter the code.
5. It should download Listly_Save.txt.

SECURITY / BETA NOTES
---------------------
- The Supabase bucket must remain PRIVATE.
- The browser never receives the service-role key.
- The database stores only a SHA-256 hash of each recovery code, not the code itself.
- Recovery codes are random 64-bit values with the prefix LST-.
- Files are limited to 256 KB and checked for the Listly V1 header.
- This first beta does not yet include CAPTCHA, per-IP rate limiting, code expiry/cleanup, or abuse monitoring. Add those before inviting the public to use it.
- Anyone with a valid recovery code can retrieve its save file. Treat the code like a password.
