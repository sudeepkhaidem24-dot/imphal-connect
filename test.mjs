import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const files=['server.js','public/index.html','public/admin.html','public/manifest.json','public/sw.js','public/icon.svg','sql/schema.sql','.env.example','package.json','Dockerfile','render.yaml'];
for(const f of files)assert.ok(fs.existsSync(f),`missing ${f}`);
execFileSync(process.execPath,['--check','server.js'],{stdio:'inherit'});

function checkInlineJS(file){
  const html=fs.readFileSync(file,'utf8');
  const re=/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi; let m,count=0;
  while((m=re.exec(html))){count++; new Function(m[1]);}
  return {html,count};
}
const {html}=checkInlineJS('public/index.html');
const {html:admin}=checkInlineJS('public/admin.html');
assert.match(html,/\/api\/ai\/chat/);assert.match(html,/\/api\/businesses/);assert.match(html,/\/api\/upload\/sign/);assert.match(html,/razorpay/i);assert.match(html,/openBusinessProfile/);assert.match(html,/ICPRO/);
assert.match(admin,/\/api\/admin\/overview/);assert.match(admin,/Funding/);assert.match(admin,/signOut/);

for(const [name,src] of [['index',html],['admin',admin]]){
  const ids=[...src.matchAll(/\bid=["']([^"']+)["']/g)].map(x=>x[1]);
  assert.equal(new Set(ids).size,ids.length,`${name} has duplicate ids`);
}
const manifest=JSON.parse(fs.readFileSync('public/manifest.json','utf8'));assert.ok(manifest.icons?.length,'PWA icon missing');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));assert.equal(pkg.version,'2.1.0');assert.ok(pkg.dependencies['express']);
const sql=fs.readFileSync('sql/schema.sql','utf8');
for(const t of ['profiles','businesses','business_items','business_stories','business_offers','business_analytics','funding_applications','payment_events'])assert.match(sql,new RegExp(`create table if not exists public\\.${t}`));
assert.match(sql,/businesses_owner_unique_idx/);assert.match(sql,/business-media/);
const server=fs.readFileSync('server.js','utf8');
for(const route of ['/api/health','/api/config','/api/me','/api/businesses','/api/items','/api/stories','/api/offers','/api/analytics/event','/api/analytics/owner','/api/funding/applications','/api/ai/chat','/api/admin/overview','/api/admin/businesses','/api/admin/payments','/api/admin/users','/api/admin/funding','/api/payments/webhook'])assert.ok(server.includes(route),`missing ${route}`);
assert.match(server,/AbortSignal\.timeout\(25000\)/);assert.match(server,/Only JPG, PNG and WebP/);assert.match(server,/publicEventLimiter/);
assert.match(fs.readFileSync('render.yaml','utf8'),/npm install --omit=dev/);assert.match(fs.readFileSync('Dockerfile','utf8'),/npm install --omit=dev/);
assert.doesNotMatch(html,/SUPABASE_SERVICE_ROLE_KEY/);assert.doesNotMatch(html,/RAZORPAY_KEY_SECRET/);assert.doesNotMatch(admin,/SUPABASE_SERVICE_ROLE_KEY/);
console.log('PASS: static production contract, syntax, routes, security hooks, PWA, database and deployment config');
