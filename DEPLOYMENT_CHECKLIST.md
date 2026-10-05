# Imphal Connect — Go-Live Checklist

## Before deployment
- [ ] Run `npm install --omit=dev`
- [ ] Run `npm test`
- [ ] Create Supabase project
- [ ] Run `sql/schema.sql` in Supabase SQL Editor
- [ ] Activate Cashfree Subscriptions
- [ ] Add Cashfree client ID and client secret
- [ ] Set CASHFREE_ENV=sandbox for testing
- [ ] Add `ADMIN_EMAILS`
- [ ] Add AI provider URL/key/model
- [ ] Set `APP_URL` and `ALLOWED_ORIGINS`

## First test deployment
- [ ] `/api/health` returns `ok:true`
- [ ] Customer/business signup works
- [ ] Business profile creation works
- [ ] Business publish/unpublish works
- [ ] Product upload works
- [ ] Story upload works and expires after 24h
- [ ] Pro checkout works in Cashfree test mode
- [ ] Cashfree webhook signature verifies
- [ ] Webhook updates subscription status
- [ ] Cancellation at cycle end works
- [ ] AI answers through `/api/ai/chat`
- [ ] `/admin.html` accepts an authorized admin
- [ ] Admin can verify/publish businesses
- [ ] Admin can review payment events
- [ ] Admin can review funding applications
- [ ] Funding application workflow works
- [ ] Unauthorized admin access is rejected
- [ ] Unauthorized business editing is rejected

## Production
- [ ] Switch Cashfree to live environment only after successful test flow
- [ ] Configure live Cashfree webhook URL
- [ ] Configure HTTPS custom domain
- [ ] Confirm CORS allows only production domain
- [ ] Confirm secrets are not in GitHub
- [ ] Confirm Supabase service-role key is server-side only
- [ ] Test mobile browser
- [ ] Test Android and iPhone Safari/Chrome
