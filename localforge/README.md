# LocalForge
Mobile-first SaaS for local businesses.

## Deploy on Render
Repository branch: localforge-production
Build: cd localforge && npm install
Start: node localforge/server.js
Health: /api/health

Set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, APP_URL and ALLOWED_ORIGINS. Never expose the service role key.

Apply localforge/supabase/schema.sql to the dedicated Supabase project. Payment collection is provider-neutral until merchant credentials are supplied; the plan/subscription model is already in the schema.