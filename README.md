# Imphal Connect — Final Production V2.1

A mobile-first local discovery and business platform for Imphal/Manipur.

## Included
- Consumer discovery UI
- Cute Imphi AI assistant
- Secure server-side AI proxy (OpenAI-compatible endpoint)
- Supabase Auth/Postgres/Storage
- Business owner dashboard
- Free/Pro/Elite plans
- Cashfree subscription checkout, verification, cancellation and webhook lifecycle
- Products/services, offers and 24-hour stories
- Business analytics
- Funding request workflow with separate admin review (not automatic lending/disbursement)
- Separate `/admin.html` admin console
- Rate limiting, Helmet, CORS, environment secrets
- PWA manifest/service worker

## Deployment
The package is deployable without a committed lockfile; Render/Docker use `npm install --omit=dev`.

1. Create a Supabase project and run `sql/schema.sql`.
2. Create/activate Cashfree Subscriptions for Pro ₹499/month and Elite ₹1,499/month, then add the Cashfree client credentials to the server environment.
3. Configure Cashfree Subscriptions webhooks to `https://YOUR-DOMAIN/api/payments/webhook` and use the Cashfree webhook signing credentials.
4. Set `ADMIN_EMAILS` to the email(s) that should access `/admin.html`.
5. Set `AI_API_URL`, `AI_API_KEY`, and `AI_MODEL` to a compatible AI provider for unrestricted general AI responses. Never put the key in frontend code.
6. Deploy Node 20 with `npm ci --omit=dev` and `npm start`.
7. Test `/api/health`, auth, business creation, test-mode Cashfree, webhook, uploads, AI, admin and funding workflows before enabling live payments.

## Funding note
The funding module is an application/review workflow. It does not itself approve, underwrite or disburse loans. A regulated lender/financing partner must be integrated for real credit decisions and disbursement.

## Verification performed
- 200/200 repeated production contract test runs passed.
- 100/100 backend route smoke runs passed with isolated dependency stubs.
- 29 required API routes audited for presence and duplicates.
- Inline JavaScript syntax, duplicate DOM IDs, PWA manifest, database schema, deployment config and secret exposure checks passed.
- Real Supabase/Cashfree/AI live transactions still require your production accounts, keys and HTTPS domain; those external services cannot be truthfully tested from this offline build environment.
