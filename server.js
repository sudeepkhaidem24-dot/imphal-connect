import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const app=express();
const PORT=Number(process.env.PORT||8080);
const APP_URL=process.env.APP_URL||`http://localhost:${PORT}`;
const required=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY'];
const missing=required.filter(k=>!process.env[k]);
if(missing.length) console.warn(`Missing environment variables: ${missing.join(', ')}`);
const supabaseAdmin=createClient(process.env.SUPABASE_URL||'https://placeholder.invalid',process.env.SUPABASE_SERVICE_ROLE_KEY||'service-role-placeholder',{auth:{autoRefreshToken:false,persistSession:false}});
const supabasePublic=createClient(process.env.SUPABASE_URL||'https://placeholder.invalid',process.env.SUPABASE_PUBLISHABLE_KEY||'public-placeholder');
app.set('trust proxy',1);
app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'},contentSecurityPolicy:false}));
app.use(compression());
const allowedOrigins=(process.env.ALLOWED_ORIGINS||APP_URL).split(',').map(x=>x.trim()).filter(Boolean);
app.use(cors({origin:(origin,cb)=>{if(!origin||allowedOrigins.includes('*')||allowedOrigins.includes(origin))return cb(null,true);return cb(new Error('CORS blocked'))},credentials:false}));
const apiLimiter=rateLimit({windowMs:60000,max:150,standardHeaders:true,legacyHeaders:false});
const publicEventLimiter=rateLimit({windowMs:60000,max:60,standardHeaders:true,legacyHeaders:false});
const authLimiter=rateLimit({windowMs:60000,max:30,standardHeaders:true,legacyHeaders:false});
const paymentLimiter=rateLimit({windowMs:60000,max:15,standardHeaders:true,legacyHeaders:false});
const aiLimiter=rateLimit({windowMs:60000,max:25,standardHeaders:true,legacyHeaders:false});
app.use('/api/',apiLimiter);
function timingSafe(a,b){const A=Buffer.from(String(a));const B=Buffer.from(String(b));return A.length===B.length&&crypto.timingSafeEqual(A,B)}
function bearer(req){const h=req.get('authorization')||'';return h.startsWith('Bearer ')?h.slice(7):null}
async function userFromToken(token){if(!token)return null;const {data,error}=await supabasePublic.auth.getUser(token);return error?null:data?.user||null}
async function requireUser(req,res,next){try{const u=await userFromToken(bearer(req));if(!u)return res.status(401).json({error:'Authentication required'});req.user=u;next()}catch{return res.status(401).json({error:'Authentication failed'})}}
async function profileFor(userId){const {data}=await supabaseAdmin.from('profiles').select('*').eq('id',userId).maybeSingle();return data}
function adminAllowed(user){if(!user)return false;const emails=(process.env.ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);return emails.includes(String(user.email||'').toLowerCase())}
async function requireAdmin(req,res,next){try{const u=await userFromToken(bearer(req));if(!u)return res.status(401).json({error:'Authentication required'});const p=await profileFor(u.id);if(p?.role!=='admin'&&!adminAllowed(u))return res.status(403).json({error:'Admin access required'});req.user=u;req.profile=p;next()}catch(e){res.status(401).json({error:'Admin authentication failed'})}}
async function ownedBusiness(userId){const {data,error}=await supabaseAdmin.from('businesses').select('*').eq('owner_id',userId).maybeSingle();if(error)throw error;return data}
function cashfreeBase(){return String(process.env.CASHFREE_ENV||'production').toLowerCase()==='sandbox'?'https://sandbox.cashfree.com/pg':'https://api.cashfree.com/pg'}
function cashfreeHeaders(extra={}){return {'x-client-id':process.env.CASHFREE_CLIENT_ID||'','x-client-secret':process.env.CASHFREE_CLIENT_SECRET||'','x-api-version':'2025-01-01','accept':'application/json','content-type':'application/json',...extra}}
function planAmount(plan){return plan==='pro'?499:plan==='elite'?1499:null}
function addOneMonth(date=new Date()){const d=new Date(date);d.setMonth(d.getMonth()+1);return d.toISOString()}
async function cashfreeRequest(path,options={}){const r=await fetch(cashfreeBase()+path,{...options,headers:cashfreeHeaders(options.headers||{})});const text=await r.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={raw:text}}if(!r.ok){const msg=data?.message||data?.error?.message||data?.error||`Cashfree request failed (${r.status})`;const e=new Error(msg);e.status=r.status;e.data=data;throw e}return data}
function cashfreeWebhookValid(signature,timestamp,rawBody){if(!signature||!timestamp||!rawBody||!process.env.CASHFREE_CLIENT_SECRET)return false;const expected=crypto.createHmac('sha256',process.env.CASHFREE_CLIENT_SECRET).update(String(timestamp)+rawBody).digest('base64');return timingSafe(signature,expected)}
function cashfreeSubscriptionStatus(d){const a=String(d?.authorization_details?.authorization_status||d?.authorisation_details?.authorization_status||'').toUpperCase();const s=String(d?.subscription_status||d?.status||'').toUpperCase();if(a==='ACTIVE'||['ACTIVE','AUTHENTICATED'].includes(s))return 'active';if(['CANCELLED','COMPLETED','EXPIRED','FAILED','PAUSED'].includes(s))return s.toLowerCase();return s?s.toLowerCase():'created'}
function activePaid(b){return !!b&&['pro','elite'].includes(b.plan)&&b.subscription_status==='active'&&(!b.subscription_current_end||new Date(b.subscription_current_end)>new Date())}
function slugify(name){return (name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+crypto.randomBytes(3).toString('hex')).slice(0,70)}
function publicSupabaseKey(){
	const key=process.env.SUPABASE_PUBLISHABLE_KEY||'';
	if(!key||key===process.env.SUPABASE_SERVICE_ROLE_KEY||/^sb_secret_/i.test(key))return '';
	const payload=key.split('.')[1];
	if(payload){try{if(JSON.parse(Buffer.from(payload,'base64url').toString('utf8')).role==='service_role')return ''}catch{}}
	return key;
}

// Cashfree subscription webhook. Keep the raw request body for signature verification.
app.post('/api/payments/webhook',express.raw({type:'application/json'}),async(req,res)=>{try{const raw=req.body?.toString('utf8')||'';const sig=req.get('x-webhook-signature')||'';const ts=req.get('x-webhook-timestamp')||'';if(!cashfreeWebhookValid(sig,ts,raw))return res.status(400).json({error:'Invalid Cashfree webhook signature'});const event=JSON.parse(raw);const type=String(event?.type||event?.event||'');const data=event?.data||{};const subscriptionId=String(data?.subscription_id||data?.subscriptionId||data?.subscription?.subscription_id||data?.subscription?.id||'');await supabaseAdmin.from('payment_events').insert({event_name:type||'CASHFREE_WEBHOOK',provider_ref:subscriptionId||null,payload:event});if(subscriptionId){const {data:business}=await supabaseAdmin.from('businesses').select('id,plan,subscription_current_end').eq('subscription_id',subscriptionId).maybeSingle();if(business){const success=type==='SUBSCRIPTION_PAYMENT_SUCCESS'||type==='SUBSCRIPTION_AUTH_STATUS'||type==='SUBSCRIPTION_STATUS_CHANGED';const failed=type==='SUBSCRIPTION_PAYMENT_FAILED'||type==='SUBSCRIPTION_PAYMENT_CANCELLED';let patch={updated_at:new Date().toISOString()};if(success){patch.subscription_status='active';const base=business.subscription_current_end&&new Date(business.subscription_current_end)>new Date()?new Date(business.subscription_current_end):new Date();patch.subscription_current_end=addOneMonth(base)}if(failed){patch.subscription_status=type==='SUBSCRIPTION_PAYMENT_CANCELLED'?'cancelled':'past_due'}if(type==='SUBSCRIPTION_STATUS_CHANGED'){const status=String(data?.subscription_status||data?.status||'').toUpperCase();if(['CANCELLED','COMPLETED','EXPIRED'].includes(status)){patch.subscription_status=status.toLowerCase();patch.plan='free'}}await supabaseAdmin.from('businesses').update(patch).eq('id',business.id)}}return res.json({ok:true})}catch(e){console.error('Cashfree webhook error',e);return res.status(400).json({error:'Webhook processing failed'})}});


/* Google Places (New) — live discovery layer. Google place content is fetched on demand
   and is not persisted in Supabase. Keep the web-service key server-side. */
const GOOGLE_PLACES_URL='https://places.googleapis.com/v1/places:searchText';
const GOOGLE_PLACE_DETAILS_URL='https://places.googleapis.com/v1/places/';
const IMPHAL_CENTER={latitude:24.8170,longitude:93.9368};
const IMPHAL_RADIUS_METERS=18000;
const GOOGLE_FIELD_MASK=[
  'places.id','places.displayName','places.formattedAddress','places.location',
  'places.googleMapsUri','places.primaryType','places.primaryTypeDisplayName',
  'places.types','places.businessStatus','places.currentOpeningHours',
  'places.nationalPhoneNumber','places.internationalPhoneNumber',
  'places.websiteUri','places.rating','places.userRatingCount','places.photos',
  'nextPageToken'
].join(',');

const DISCOVERY_CATEGORIES={
  all:'businesses',
  restaurants:'restaurants',
  cafes:'cafes coffee shops',
  shopping:'shops stores shopping',
  hardware:'hardware stores building material stores plumbing electrical hardware',
  groceries:'grocery stores supermarkets',
  fashion:'clothing stores fashion',
  electronics:'electronics stores mobile phone stores computer shops',
  pharmacies:'pharmacies',
  health:'clinics hospitals doctors diagnostic centres',
  clinics:'clinics medical clinics doctors',
  hospitals:'hospitals medical centres',
  gyms:'gyms fitness centres',
  salons:'salons beauty parlours barbers',
  books:'bookstores libraries',
  hotels:'hotels homestays',
  automotive:'car repair automobile services',
  education:'schools coaching centres tutors',
  services:'local services repair services',
  banks:'banks ATMs',
  food:'restaurants cafes bakeries food',
  tourism:'tourist attractions travel services',
  handloom:'handloom handicrafts local crafts'
};

function googleKey(){
  return String(process.env.GOOGLE_MAPS_API_KEY||'').trim();
}
function normalisePlace(p){
  const oh=p?.currentOpeningHours||{};
  const coords=p?.location||{};
  return {
    source:'google',
    placeId:p?.id||null,
    name:p?.displayName?.text||'Unnamed place',
    address:p?.formattedAddress||'',
    latitude:coords?.latitude??null,
    longitude:coords?.longitude??null,
    rating:p?.rating??null,
    reviewCount:p?.userRatingCount??0,
    openNow:typeof oh?.openNow==='boolean'?oh.openNow:null,
    nextOpenTime:oh?.nextOpenTime||null,
    nextCloseTime:oh?.nextCloseTime||null,
    hours:oh?.weekdayDescriptions||[],
    phone:p?.internationalPhoneNumber||p?.nationalPhoneNumber||'',
    website:p?.websiteUri||'',
    mapsUrl:p?.googleMapsUri||'',
    type:p?.primaryTypeDisplayName?.text||p?.primaryType||'Local business',
    businessStatus:p?.businessStatus||null,
    types:Array.isArray(p?.types)?p.types.slice(0,12):[],
    photos:Array.isArray(p?.photos)?p.photos.slice(0,5).map(photo=>({
      name:photo?.name||'',
      widthPx:photo?.widthPx||null,
      heightPx:photo?.heightPx||null,
      googleMapsUri:photo?.googleMapsUri||'',
      authorAttributions:Array.isArray(photo?.authorAttributions)?photo.authorAttributions.slice(0,3).map(a=>({displayName:a?.displayName||'',uri:a?.uri||'',photoUri:a?.photoUri||''})):[]
    })).filter(photo=>photo.name):[],
    reviews:Array.isArray(p?.reviews)?p.reviews.slice(0,5).map(review=>({rating:review?.rating??null,text:review?.text?.text||'',relativePublishTimeDescription:review?.relativePublishTimeDescription||'',googleMapsUri:review?.googleMapsUri||'',flagContentUri:review?.flagContentUri||'',authorAttribution:{displayName:review?.authorAttribution?.displayName||'Google user',uri:review?.authorAttribution?.uri||'',photoUri:review?.authorAttribution?.photoUri||''}})).filter(review=>review.text||review.authorAttribution.displayName):[]
  };
}
async function googlePlacesRequest(body,fieldMask=GOOGLE_FIELD_MASK){
  const key=googleKey();
  if(!key)throw Object.assign(new Error('Google Places is not configured on the server yet.'),{status:503});
  const r=await fetch(GOOGLE_PLACES_URL,{
    method:'POST',
    headers:{'content-type':'application/json','x-goog-api-key':key,'x-goog-fieldmask':fieldMask},
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(15000)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok){
    const msg=data?.error?.message||('Google Places request failed ('+r.status+')');
    const e=new Error(msg);e.status=r.status;e.data=data;throw e;
  }
  return data;
}
app.get('/api/discovery/fallback',async(req,res)=>{
  try{
    const q=String(req.query.q||'').trim().slice(0,60);
    const category=String(req.query.category||'all').trim().toLowerCase();
    const catMap={cafes:'amenity=cafe',restaurants:'amenity=restaurant',shopping:'shop',hardware:'shop=hardware',groceries:'shop=supermarket',fashion:'shop=clothes',electronics:'shop=electronics',pharmacies:'amenity=pharmacy',gyms:'leisure=fitness_centre',salons:'shop=hairdresser',hotels:'tourism=hotel',education:'amenity=school',automotive:'shop=car_repair',services:'office',banks:'amenity=bank',handloom:'craft',tourism:'tourism',clinics:'amenity=clinic',hospitals:'amenity=hospital',books:'shop=books'};
    const tag=catMap[category]||'';
    const safeQ=q.replace(/["\\]/g,' ').slice(0,50);
    const parts=tag.includes('=')?tag.split('='):[tag,''];
    const selector=parts[0]?'["'+parts[0]+'"'+(parts[1]?'="'+parts[1]+'"':'')+']':(safeQ?'["name"~"'+safeQ+'",i]':'["name"]');
    const query='[out:json][timeout:12];(nwr(around:12000,24.8170,93.9368)'+selector+';);out center tags 60;';
    const r=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'content-type':'text/plain'},body:query,signal:AbortSignal.timeout(15000)});
    const data=await r.json().catch(()=>({elements:[]}));
    if(!r.ok)return res.status(502).json({ok:false,error:'Fallback map data unavailable'});
    const seen=new Set(),places=[];
    for(const el of (data.elements||[])){
      const t=el.tags||{},name=t.name||t['name:en'];if(!name)continue;
      if(safeQ&&!name.toLowerCase().includes(safeQ.toLowerCase()))continue;
      const id='osm-'+el.type+'-'+el.id;if(seen.has(id))continue;seen.add(id);
      const lat=el.lat??el.center?.lat,lng=el.lon??el.center?.lon;
      places.push({placeId:id,name,address:[t['addr:housenumber'],t['addr:street'],t['addr:suburb'],t['addr:city']||'Imphal'].filter(Boolean).join(', '),type:t.amenity||t.shop||t.tourism||t.office||t.leisure||t.craft||'local business',lat:lat??null,lng:lng??null,rating:null,reviewCount:0,openNow:null,phone:t.phone||t['contact:phone']||'',website:t.website||t['contact:website']||'',mapsUrl:lat&&lng?'https://www.google.com/maps/search/?api=1&query='+lat+','+lng:'#',photos:[]});
      if(places.length>=60)break;
    }
    res.set('Cache-Control','no-store');res.json({ok:true,source:'OpenStreetMap fallback',places});
  }catch(e){res.status(502).json({ok:false,error:'Fallback discovery unavailable'});}
});
app.get('/api/discovery/google',async(req,res)=>{
  try{
    const q=String(req.query.q||'').trim().slice(0,100);
    const rawCategory=String(req.query.category||'all').toLowerCase().trim();
    const category=DISCOVERY_CATEGORIES[rawCategory]||DISCOVERY_CATEGORIES.all;
    const openNow=String(req.query.openNow||'').toLowerCase()==='true';
    const minRating=Number(req.query.minRating);
    const pageSize=Math.min(20,Math.max(1,Number(req.query.pageSize)||20));
    const pageToken=String(req.query.pageToken||'').trim();
    const lat=Number(req.query.lat), lng=Number(req.query.lng), radius=Number(req.query.radius);
    const center=Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180?{latitude:lat,longitude:lng}:IMPHAL_CENTER;
    const searchRadius=Number.isFinite(radius)?Math.min(10000,Math.max(500,radius)):IMPHAL_RADIUS_METERS;
    const textQuery=(q?q:category)+' in Imphal, Manipur, India';
    const body={
      textQuery,
      pageSize,
      languageCode:'en',
      regionCode:'IN',
      locationBias:{circle:{center,radius:searchRadius}}
    };
    if(pageToken)body.pageToken=pageToken;
    if(openNow)body.openNow=true;
    if(Number.isFinite(minRating)&&minRating>=0&&minRating<=5)body.minRating=minRating;
    const data=await googlePlacesRequest(body);
    res.set('Cache-Control','no-store');
    res.json({ok:true,source:'Google Places (New)',query:textQuery,fetchedAt:new Date().toISOString(),places:(data.places||[]).map(normalisePlace),nextPageToken:data.nextPageToken||null});
  }catch(e){
    console.error('Google discovery:',e.message);
    res.status(e.status||502).json({ok:false,error:e.message||'Google Places unavailable'});
  }
});
app.get('/api/discovery/google/:placeId',async(req,res)=>{
  try{
    const placeId=String(req.params.placeId||'').replace(/[^A-Za-z0-9_-]/g,'');
    if(!placeId)return res.status(400).json({error:'Invalid place id'});
    const key=googleKey();
    if(!key)return res.status(503).json({error:'Google Places is not configured on the server yet.'});
    const mask=['id','displayName','formattedAddress','location','googleMapsUri','primaryType','primaryTypeDisplayName','types','businessStatus','currentOpeningHours','regularOpeningHours','nationalPhoneNumber','internationalPhoneNumber','websiteUri','rating','userRatingCount','photos','reviews'].join(',');
    const r=await fetch(GOOGLE_PLACE_DETAILS_URL+encodeURIComponent(placeId),{headers:{'x-goog-api-key':key,'x-goog-fieldmask':mask},signal:AbortSignal.timeout(15000)});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return res.status(r.status).json({error:data?.error?.message||'Google Place Details failed'});
    res.set('Cache-Control','no-store');
    res.json({ok:true,place:normalisePlace(data),fetchedAt:new Date().toISOString()});
  }catch(e){
    console.error('Google place details:',e.message);
    res.status(502).json({ok:false,error:e.message||'Google Place Details unavailable'});
  }
});


app.get('/api/discovery/google-photo',async(req,res)=>{
  try{
    const photoName=decodeURIComponent(String(req.query.name||'')).trim();
    if(!/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(photoName))return res.status(400).json({error:'Invalid Google photo reference'});
    const key=googleKey();
    if(!key)return res.status(503).json({error:'Google Places is not configured on the server yet.'});
    const w=Math.min(1200,Math.max(240,Number(req.query.w)||720));
    const h=Math.min(900,Math.max(160,Number(req.query.h)||480));
    const url='https://places.googleapis.com/v1/'+photoName+'/media?key='+encodeURIComponent(key)+'&maxWidthPx='+w+'&maxHeightPx='+h;
    const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000)});
    if(r.status>=300&&r.status<400&&r.headers.get('location')){
      res.set('Cache-Control','no-store');
      return res.redirect(302,r.headers.get('location'));
    }
    const buf=Buffer.from(await r.arrayBuffer());
    if(!r.ok)return res.status(r.status).send(buf);
    res.set('Cache-Control','no-store');
    res.set('Content-Type',r.headers.get('content-type')||'image/jpeg');
    res.set('X-Content-Type-Options','nosniff');
    return res.send(buf);
  }catch(e){
    console.error('Google photo:',e.message);
    return res.status(502).json({error:'Google photo unavailable'});
  }
});

app.use(express.json({limit:'2mb'}));
app.use(express.static('public',{extensions:['html']}));

app.get('/api/health',(_req,res)=>res.json({ok:true,service:'imphal-connect',version:'2.2.0',time:new Date().toISOString()}));
// UroRelay webhook: Companion confirms UPI credits and posts transaction details here.
// Do not activate a subscription from amount alone; the same plan button is shared by multiple customers.
app.post('/api/payments/uropay',express.json({limit:'64kb'}),async(req,res)=>{
  try{
    const event=req.body&&typeof req.body==='object'?req.body:{};
    const providerRef=String(event?.upi_reference||event?.upi_ref||event?.reference_number||event?.transaction_id||event?.transactionId||event?.order_id||event?.orderId||'').slice(0,160)||null;
    await supabaseAdmin.from('payment_events').insert({
      event_name:String(event?.event||event?.status||'URORELAY_TRANSACTION').slice(0,120),
      provider_ref:providerRef,
      payload:event
    });
    return res.status(200).json({ok:true});
  }catch(e){
    console.error('UroRelay webhook error',e);
    return res.status(500).json({error:'Webhook processing failed'});
  }
});

function moneyValue(v){
  if(v===null||v===undefined||v==='')return null;
  const n=Number(String(v).replace(/[^0-9.]/g,''));
  return Number.isFinite(n)?n:null;
}
function eventAmount(event){
  const candidates=[event?.amount,event?.amount_paid,event?.paid_amount,event?.transaction_amount,event?.credited_amount,event?.credit_amount,event?.amount_captured,event?.value,event?.payment_amount];
  for(const v of candidates){const n=moneyValue(v);if(n!==null)return n}
  return null;
}
app.post('/api/payments/uropay/intents',paymentLimiter,requireUser,async(req,res)=>{
  try{
    const plan=String(req.body?.plan||'').toLowerCase();
    const amount=planAmount(plan);
    if(!amount)return res.status(400).json({error:'Choose Pro or Elite'});
    const b=await ownedBusiness(req.user.id);
    if(!b)return res.status(400).json({error:'Create your business before subscribing'});
    if(activePaid(b))return res.status(409).json({error:'Your current subscription is already active'});
    await supabaseAdmin.from('payment_intents').update({status:'expired',updated_at:new Date().toISOString()})
      .eq('user_id',req.user.id).eq('status','pending').lt('created_at',new Date(Date.now()-30*60*1000).toISOString());
    const {data,error}=await supabaseAdmin.from('payment_intents').insert({user_id:req.user.id,business_id:b.id,plan,amount,status:'pending'}).select('id,plan,amount,status,created_at').single();
    if(error)return res.status(400).json({error:error.message});
    res.status(201).json({intent:data});
  }catch(e){console.error('UroRelay intent error',e);res.status(500).json({error:'Could not start payment'})}
});
app.post('/api/payments/uropay/confirm',paymentLimiter,requireUser,async(req,res)=>{
  try{
    const intentId=String(req.body?.intentId||'');
    const providerRef=String(req.body?.providerRef||'').trim().slice(0,160);
    if(!intentId||!providerRef)return res.status(400).json({error:'Payment intent and UPI reference are required'});
    const {data:intent,error:intentError}=await supabaseAdmin.from('payment_intents').select('*').eq('id',intentId).eq('user_id',req.user.id).maybeSingle();
    if(intentError||!intent)return res.status(404).json({error:'Payment attempt not found'});
    if(intent.status==='paid')return res.json({ok:true,status:'active'});
    if(intent.status!=='pending')return res.status(409).json({error:'This payment attempt is no longer active'});
    if(new Date(intent.created_at)<new Date(Date.now()-30*60*1000))return res.status(410).json({error:'This payment attempt expired. Please start payment again.'});
    const {data:used}=await supabaseAdmin.from('payment_intents').select('id').eq('provider_ref',providerRef).eq('status','paid').neq('id',intent.id).maybeSingle();
    if(used)return res.status(409).json({error:'This UPI reference has already been used'});
    const {data:event}=await supabaseAdmin.from('payment_events').select('id,event_name,provider_ref,payload,created_at').eq('provider_ref',providerRef).gte('created_at',intent.created_at).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(!event)return res.status(202).json({ok:false,status:'pending',message:'Payment not confirmed yet. Wait a moment and try again.'});
    const paidAmount=eventAmount(event.payload||{});
    if(paidAmount===null)return res.status(202).json({ok:false,status:'pending',message:'Payment was received, but the amount could not be verified yet.'});
    if(Math.abs(paidAmount-Number(intent.amount))>0.01)return res.status(400).json({error:'Payment amount does not match this plan'});
    const now=new Date();const end=new Date(now);end.setMonth(end.getMonth()+1);
    const subscriptionId='URORELAY_'+intent.id;
    const {data:updatedIntent,error:updateError}=await supabaseAdmin.from('payment_intents').update({status:'paid',provider_ref:providerRef,paid_at:now.toISOString(),updated_at:now.toISOString()}).eq('id',intent.id).eq('status','pending').select('*').single();
    if(updateError||!updatedIntent)return res.status(409).json({error:'Payment was already being processed'});
    const {data:business,error:businessError}=await supabaseAdmin.from('businesses').update({plan:intent.plan,subscription_status:'active',subscription_id:subscriptionId,subscription_current_end:end.toISOString(),updated_at:now.toISOString()}).eq('id',intent.business_id).eq('owner_id',req.user.id).select('*').single();
    if(businessError)return res.status(500).json({error:'Payment confirmed but subscription update failed. Please contact support.'});
    res.json({ok:true,status:'active',business});
  }catch(e){console.error('UroRelay confirm error',e);res.status(500).json({error:'Could not verify payment'})}
});
app.get('/api/config',(_req,res)=>res.json({supabase:{url:process.env.SUPABASE_URL||'',key:publicSupabaseKey()},uropay:{apiKey:process.env.UROPAY_API_KEY||'',proButtonId:process.env.UROPAY_PRO_BUTTON_ID||'',eliteButtonId:process.env.UROPAY_ELITE_BUTTON_ID||'',environment:String(process.env.UROPAY_ENV||'LIVE').toUpperCase()==='TEST'?'TEST':'LIVE'}}));

app.get('/api/me',requireUser,async(req,res)=>{const profile=await profileFor(req.user.id);const business=await ownedBusiness(req.user.id);res.json({user:{id:req.user.id,email:req.user.email},profile,business})});
app.post('/api/business',authLimiter,requireUser,async(req,res)=>{const existing=await ownedBusiness(req.user.id);if(existing)return res.status(409).json({error:'Business already exists',business:existing});const name=String(req.body.name||'').trim();if(name.length<2||name.length>120)return res.status(400).json({error:'Business name must be 2-120 characters'});const payload={owner_id:req.user.id,name,slug:slugify(name),category:String(req.body.category||'Services').slice(0,60),description:String(req.body.description||'').slice(0,4000),phone:String(req.body.phone||'').slice(0,40),whatsapp:String(req.body.whatsapp||'').slice(0,40),address:String(req.body.address||'').slice(0,300),city:String(req.body.city||'Imphal').slice(0,80),latitude:req.body.latitude==null||req.body.latitude===''?null:Number(req.body.latitude),longitude:req.body.longitude==null||req.body.longitude===''?null:Number(req.body.longitude),opening_hours:req.body.opening_hours&&typeof req.body.opening_hours==='object'?req.body.opening_hours:{},website:String(req.body.website||'').slice(0,500),instagram_url:String(req.body.instagram_url||'').slice(0,500),gallery_urls:Array.isArray(req.body.gallery_urls)?req.body.gallery_urls.slice(0,12).map(x=>String(x).slice(0,1000)):[],is_published:false};const {data,error}=await supabaseAdmin.from('businesses').insert(payload).select('*').single();if(error)return res.status(400).json({error:error.message});await supabaseAdmin.from('profiles').update({role:'business',updated_at:new Date().toISOString()}).eq('id',req.user.id);res.status(201).json({business:data})});
app.patch('/api/business',requireUser,async(req,res)=>{const allowed=['name','category','description','phone','whatsapp','address','city','latitude','longitude','logo_url','cover_url','is_published','opening_hours','website','instagram_url','gallery_urls'];const patch=Object.fromEntries(Object.entries(req.body||{}).filter(([k])=>allowed.includes(k)));if('name'in patch)patch.name=String(patch.name).trim().slice(0,120);if('opening_hours'in patch&&(!patch.opening_hours||typeof patch.opening_hours!=='object'))patch.opening_hours={};if('gallery_urls'in patch)patch.gallery_urls=Array.isArray(patch.gallery_urls)?patch.gallery_urls.slice(0,12).map(x=>String(x).slice(0,1000)):[];patch.updated_at=new Date().toISOString();const {data,error}=await supabaseAdmin.from('businesses').update(patch).eq('owner_id',req.user.id).select('*').single();if(error)return res.status(400).json({error:error.message});res.json({business:data})});
app.get('/api/businesses',async(req,res)=>{const q=String(req.query.q||'').trim();const category=String(req.query.category||'').trim();let query=supabaseAdmin.from('businesses').select('id,name,slug,category,description,phone,whatsapp,address,city,latitude,longitude,logo_url,cover_url,opening_hours,website,instagram_url,gallery_urls,is_verified,plan').eq('is_published',true).limit(100);if(category)query=query.eq('category',category);if(q){const safeQ=q.replace(/[\\,(){}\[\]]/g,' ').replace(/\s+/g,' ').trim().slice(0,80);if(safeQ)query=query.or(`name.ilike.%${safeQ}%,description.ilike.%${safeQ}%,category.ilike.%${safeQ}%`)}const {data,error}=await query.order('is_verified',{ascending:false}).order('name');if(error)return res.status(500).json({error:error.message});res.json({businesses:data||[]})});
app.get('/api/businesses/:slug',async(req,res)=>{const {data,error}=await supabaseAdmin.from('businesses').select('*').eq('slug',req.params.slug).eq('is_published',true).maybeSingle();if(error||!data)return res.status(404).json({error:'Business not found'});const [items,stories,offers,reviews]=await Promise.all([supabaseAdmin.from('business_items').select('*').eq('business_id',data.id).eq('is_active',true).order('created_at',{ascending:false}),supabaseAdmin.from('business_stories').select('*').eq('business_id',data.id).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}),supabaseAdmin.from('business_offers').select('*').eq('business_id',data.id).eq('is_active',true).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order('created_at',{ascending:false}),supabaseAdmin.from('business_reviews').select('id,rating,body,created_at,updated_at,user_id,profiles(full_name)').eq('business_id',data.id).order('created_at',{ascending:false}).limit(100)]);const rr=reviews.data||[];const average=rr.length?Number((rr.reduce((a,x)=>a+Number(x.rating||0),0)/rr.length).toFixed(1)):null;res.json({business:data,items:items.data||[],stories:stories.data||[],offers:offers.data||[],reviews:rr.map(x=>({id:x.id,rating:x.rating,body:x.body,created_at:x.created_at,updated_at:x.updated_at,author:x.profiles?.full_name||'Local customer'})),reviewSummary:{average,ratingCount:rr.length}})});

app.post('/api/items',requireUser,async(req,res)=>{const b=await ownedBusiness(req.user.id);if(!activePaid(b))return res.status(403).json({error:'An active Pro or Elite subscription is required'});const name=String(req.body.name||'').trim();if(!name)return res.status(400).json({error:'Item/service name required'});const raw=req.body.price;const price=raw===null||raw===undefined||raw===''?null:Number(raw);if(price!==null&&(!Number.isFinite(price)||price<0))return res.status(400).json({error:'Invalid price'});const {data,error}=await supabaseAdmin.from('business_items').insert({business_id:b.id,name:name.slice(0,160),price,description:String(req.body.description||'').slice(0,1000),image_url:String(req.body.image_url||'').slice(0,1000)}).select('*').single();if(error)return res.status(400).json({error:error.message});res.status(201).json({item:data})});
app.patch('/api/items/:id',requireUser,async(req,res)=>{const b=await ownedBusiness(req.user.id);if(!activePaid(b))return res.status(403).json({error:'Active Pro/Elite required'});const patch=Object.fromEntries(Object.entries(req.body||{}).filter(([k])=>['name','price','description','image_url','is_active'].includes(k)));patch.updated_at=new Date().toISOString();const {data,error}=await supabaseAdmin.from('business_items').update(patch).eq('id',req.params.id).eq('business_id',b.id).select('*').single();if(error)return res.status(400).json({error:error.message});res.json({item:data})});
app.delete('/api/items/:id',requireUser,async(req,res)=>{const b=await ownedBusiness(req.user.id);const {error}=await supabaseAdmin.from('business_items').delete().eq('id',req.params.id).eq('business_id',b?.id);if(error)return res.status(400).json({error:error.message});res.json({ok:true})});
app.post('/api/stories',requireUser,async(req,res)=>{const b=await ownedBusiness(req.user.id);if(!activePaid(b))return res.status(403).json({error:'An active Pro or Elite subscription is required'});const {data,error}=await supabaseAdmin.from('business_stories').insert({business_id:b.id,title:String(req.body.title||'').slice(0,120),image_url:String(req.body.image_url||'').slice(0,1000),expires_at:new Date(Date.now()+86400000).toISOString()}).select('*').single();if(error)return res.status(400).json({error:error.message});res.status(201).json({story:data})});
app.get('/api/offers',async(req,res)=>{const now=new Date().toISOString();const {data,error}=await supabaseAdmin.from('business_offers').select('id,title,description,discount_text,expires_at,businesses(id,name,slug,category,address)').eq('is_active',true).or(`expires_at.is.null,expires_at.gt.${now}`).order('created_at',{ascending:false}).limit(100);if(error)return res.status(500).json({error:'Offers are temporarily unavailable'});res.json({offers:(data||[]).map(x=>({...x,business:x.business}))})});
app.post('/api/offers',requireUser,async(req,res)=>{const b=await ownedBusiness(req.user.id);if(!activePaid(b))return res.status(403).json({error:'Active Pro/Elite required'});const title=String(req.body.title||'').trim();if(!title)return res.status(400).json({error:'Offer title required'});const {data,error}=await supabaseAdmin.from('business_offers').insert({business_id:b.id,title:title.slice(0,160),description:String(req.body.description||'').slice(0,1000),discount_text:String(req.body.discount_text||'').slice(0,80),expires_at:req.body.expires_at||null}).select('*').single();if(error)return res.status(400).json({error:error.message});res.status(201).json({offer:data})});

app.post('/api/billing/create-subscription',paymentLimiter,requireUser,async(req,res)=>{const plan=String(req.body.plan||'').toLowerCase();const amount=planAmount(plan);if(!amount)return res.status(400).json({error:'Choose Pro or Elite'});const b=await ownedBusiness(req.user.id);if(!b)return res.status(400).json({error:'Create your business before subscribing'});if(!b.phone)return res.status(400).json({error:'Add your business phone number before subscribing'});if(activePaid(b))return res.status(409).json({error:'Your current subscription is already active'});if(!process.env.CASHFREE_CLIENT_ID||!process.env.CASHFREE_CLIENT_SECRET)return res.status(503).json({error:'Cashfree is not configured yet. Add CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET on the server.'});try{const subscriptionId='IC_'+plan.toUpperCase()+'_'+Date.now()+'_'+crypto.randomBytes(4).toString('hex');const customerName=String(req.user.user_metadata?.full_name||b.name||'Imphal Connect Customer').slice(0,120);const customerEmail=String(req.user.email||'').slice(0,160);const customerPhone=String(b.phone).replace(/[^0-9]/g,'').slice(-12);const returnUrl=(process.env.APP_URL||'https://imphal-connect.onrender.com')+'/api/billing/cashfree-return';const payload={subscription_id:subscriptionId,customer_details:{customer_name:customerName,customer_email:customerEmail,customer_phone:customerPhone},plan_details:{plan_name:'Imphal Connect '+plan.toUpperCase(),plan_type:'PERIODIC',plan_currency:'INR',plan_amount:amount,plan_max_amount:amount,plan_intervals:1,plan_interval_type:'MONTH',plan_note:plan==='pro'?'Imphal Connect Pro':'Imphal Connect Elite'},subscription_meta:{return_url:returnUrl,notification_channel:['EMAIL']},subscription_tags:{business_id:b.id,plan}};const sub=await cashfreeRequest('/subscriptions',{method:'POST',headers:{'x-idempotency-key':crypto.randomUUID()},body:JSON.stringify(payload)});await supabaseAdmin.from('businesses').update({subscription_id:subscriptionId,plan,subscription_status:'created',updated_at:new Date().toISOString()}).eq('id',b.id);res.json({subscriptionId,subscriptionSessionId:sub?.subscription_session_id||sub?.subscription_sessionId||sub?.session_id||null,plan,amount,subscription:sub})}catch(e){res.status(502).json({error:e?.message||'Could not create Cashfree subscription'})}});

app.get('/api/billing/cashfree-status',paymentLimiter,requireUser,async(req,res)=>{const b=await ownedBusiness(req.user.id);if(!b?.subscription_id)return res.status(404).json({error:'No subscription found'});try{const sub=await cashfreeRequest('/subscriptions/'+encodeURIComponent(b.subscription_id),{method:'GET'});const status=cashfreeSubscriptionStatus(sub);const active=status==='active';const patch={subscription_status:status,updated_at:new Date().toISOString()};if(active)patch.subscription_current_end=addOneMonth(b.subscription_current_end&&new Date(b.subscription_current_end)>new Date()?new Date(b.subscription_current_end):new Date());if(['cancelled','completed','expired'].includes(status))patch.plan='free';await supabaseAdmin.from('businesses').update(patch).eq('id',b.id);res.json({ok:true,status,subscription:sub})}catch(e){res.status(502).json({error:e?.message||'Could not fetch Cashfree subscription'})}});

app.post('/api/billing/cancel',paymentLimiter,requireUser,async(req,res)=>{const b=await ownedBusiness(req.user.id);if(!b?.subscription_id)return res.status(400).json({error:'No subscription found'});try{const sub=await cashfreeRequest('/subscriptions/'+encodeURIComponent(b.subscription_id),{method:'POST',headers:{'x-idempotency-key':crypto.randomUUID()},body:JSON.stringify({action:'CANCEL'})});await supabaseAdmin.from('businesses').update({subscription_status:'cancelled',updated_at:new Date().toISOString()}).eq('id',b.id);res.json({ok:true,subscription:sub})}catch(e){res.status(502).json({error:e?.message||'Cancellation failed'})}});

app.post('/api/billing/cashfree-return',express.urlencoded({extended:true}),async(req,res)=>{const subscriptionId=String(req.body?.subscription_id||req.body?.subscriptionId||req.query?.subscription_id||'');try{if(subscriptionId&&process.env.CASHFREE_CLIENT_ID&&process.env.CASHFREE_CLIENT_SECRET){const sub=await cashfreeRequest('/subscriptions/'+encodeURIComponent(subscriptionId),{method:'GET'});const status=cashfreeSubscriptionStatus(sub);const {data:b}=await supabaseAdmin.from('businesses').select('id,subscription_current_end').eq('subscription_id',subscriptionId).maybeSingle();if(b){const patch={subscription_status:status,updated_at:new Date().toISOString()};if(status==='active')patch.subscription_current_end=addOneMonth(b.subscription_current_end&&new Date(b.subscription_current_end)>new Date()?new Date(b.subscription_current_end):new Date());if(['cancelled','completed','expired'].includes(status))patch.plan='free';await supabaseAdmin.from('businesses').update(patch).eq('id',b.id)}}}catch(e){console.error('Cashfree return error',e)}const base=process.env.APP_URL||'https://imphal-connect.onrender.com';res.redirect(303,base+'/?payment=cashfree');});

app.post('/api/upload/sign',requireUser,async(req,res)=>{const b=await ownedBusiness(req.user.id);if(!b)return res.status(400).json({error:'Create a business first'});if(!activePaid(b))return res.status(403).json({error:'An active Pro or Elite subscription is required'});const ext=String(req.body.extension||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,5)||'jpg';const allowedExt=['jpg','jpeg','png','webp'];if(!allowedExt.includes(ext))return res.status(400).json({error:'Only JPG, PNG and WebP images are supported'});const path=`${req.user.id}/${crypto.randomUUID()}.${ext}`;const {data,error}=await supabaseAdmin.storage.from('business-media').createSignedUploadUrl(path);if(error)return res.status(400).json({error:error.message});res.json({path,token:data.token,publicBase:`${process.env.SUPABASE_URL}/storage/v1/object/public/business-media/${path}`})});

app.post('/api/leads',publicEventLimiter,async(req,res)=>{
  const businessId=String(req.body.business_id||'').trim();
  const customerName=String(req.body.customer_name||'').trim().slice(0,120);
  const customerPhone=String(req.body.customer_phone||'').trim().slice(0,40);
  const customerEmail=String(req.body.customer_email||'').trim().slice(0,160);
  const message=String(req.body.message||'').trim().slice(0,2000);
  if(!businessId||customerName.length<2||message.length<2)return res.status(400).json({error:'Name, business and message are required'});
  const {data:business,error:be}=await supabaseAdmin.from('businesses').select('id,name,is_published').eq('id',businessId).eq('is_published',true).maybeSingle();
  if(be||!business)return res.status(404).json({error:'Business not found'});
  let customerId=null;const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'').trim();
  if(token){try{const {data}=await supabaseAdmin.auth.getUser(token);customerId=data?.user?.id||null}catch{}}
  const {data,error}=await supabaseAdmin.from('business_leads').insert({business_id:businessId,customer_id:customerId,customer_name:customerName,customer_phone:customerPhone,customer_email:customerEmail,message,source:'business_profile',status:'new'}).select('id,business_id,customer_name,status,created_at').single();
  if(error)return res.status(400).json({error:error.message});
  await supabaseAdmin.from('business_analytics').insert([{business_id:businessId,event_type:'lead',metadata:{lead_id:data.id,customer_name:customerName,source:'business_profile'}},{business_id:businessId,event_type:'enquiry',metadata:{lead_id:data.id,source:'business_profile'}}]);
  res.status(201).json({ok:true,lead:data,business:{id:business.id,name:business.name}});
});
app.get('/api/leads',requireUser,async(req,res)=>{
  const b=await ownedBusiness(req.user.id);if(!b)return res.status(404).json({error:'Business not found'});
  const {data,error}=await supabaseAdmin.from('business_leads').select('id,customer_name,customer_phone,customer_email,message,status,source,created_at,updated_at').eq('business_id',b.id).order('created_at',{ascending:false}).limit(100);
  if(error)return res.status(500).json({error:error.message});res.json({leads:data||[]});
});
app.patch('/api/leads/:id',requireUser,async(req,res)=>{
  const b=await ownedBusiness(req.user.id);if(!b)return res.status(404).json({error:'Business not found'});
  const status=String(req.body.status||'');if(!['new','contacted','qualified','closed','spam'].includes(status))return res.status(400).json({error:'Invalid lead status'});
  const {data,error}=await supabaseAdmin.from('business_leads').update({status,updated_at:new Date().toISOString()}).eq('id',req.params.id).eq('business_id',b.id).select('id,status,updated_at').single();
  if(error)return res.status(400).json({error:error.message});res.json({lead:data});
});
app.post('/api/reviews',publicEventLimiter,requireUser,async(req,res)=>{const businessId=String(req.body.business_id||'').trim();const rating=Number(req.body.rating);const body=String(req.body.body||'').trim().slice(0,2000);if(!businessId||!Number.isInteger(rating)||rating<1||rating>5||body.length<2)return res.status(400).json({error:'Business, rating 1–5 and review text are required'});const {data:business}=await supabaseAdmin.from('businesses').select('id,is_published').eq('id',businessId).eq('is_published',true).maybeSingle();if(!business)return res.status(404).json({error:'Business not found'});const {data,error}=await supabaseAdmin.from('business_reviews').insert({business_id:businessId,user_id:req.user.id,rating,body}).select('id,rating,body,created_at,updated_at').single();if(error){if(error.code==='23505')return res.status(409).json({error:'You have already reviewed this business'});return res.status(400).json({error:error.message})}await supabaseAdmin.from('business_analytics').insert({business_id:businessId,event_type:'review',metadata:{review_id:data.id}});res.status(201).json({review:data})});
app.patch('/api/reviews/:id',requireUser,async(req,res)=>{const rating=req.body.rating==null?undefined:Number(req.body.rating);const body=req.body.body==null?undefined:String(req.body.body).trim().slice(0,2000);if(rating!==undefined&&(!Number.isInteger(rating)||rating<1||rating>5))return res.status(400).json({error:'Rating must be 1–5'});if(body!==undefined&&body.length<2)return res.status(400).json({error:'Review text is too short'});const patch={updated_at:new Date().toISOString()};if(rating!==undefined)patch.rating=rating;if(body!==undefined)patch.body=body;const {data,error}=await supabaseAdmin.from('business_reviews').update(patch).eq('id',req.params.id).eq('user_id',req.user.id).select('id,rating,body,created_at,updated_at').maybeSingle();if(error)return res.status(400).json({error:error.message});if(!data)return res.status(404).json({error:'Review not found'});res.json({review:data})});
app.delete('/api/reviews/:id',requireUser,async(req,res)=>{const {data,error}=await supabaseAdmin.from('business_reviews').delete().eq('id',req.params.id).eq('user_id',req.user.id).select('id').maybeSingle();if(error)return res.status(400).json({error:error.message});if(!data)return res.status(404).json({error:'Review not found'});res.json({ok:true})});
app.post('/api/analytics/event',publicEventLimiter,async(req,res)=>{const id=String(req.body.business_id||'');const event=String(req.body.event_type||'').slice(0,40);if(!id||!event)return res.status(400).json({error:'business_id and event_type required'});const {data:business}=await supabaseAdmin.from('businesses').select('id').eq('id',id).eq('is_published',true).maybeSingle();if(!business)return res.status(404).json({error:'Business not found'});const allowed=['view','product_view','story_view','save','enquiry','call','whatsapp','offer_click'];if(!allowed.includes(event))return res.status(400).json({error:'Unsupported event'});const {error}=await supabaseAdmin.from('business_analytics').insert({business_id:id,event_type:event,metadata:req.body.metadata||{}});if(error)return res.status(400).json({error:error.message});res.json({ok:true})});
app.get('/api/analytics/owner',requireUser,async(req,res)=>{const b=await ownedBusiness(req.user.id);if(!b)return res.status(404).json({error:'Business not found'});const {data,error}=await supabaseAdmin.from('business_analytics').select('event_type').eq('business_id',b.id);if(error)return res.status(500).json({error:error.message});const totals={views:0,enquiries:0,saves:0,product_views:0,story_views:0,call:0,whatsapp:0,offer_click:0};for(const x of data||[]){if(x.event_type==='view')totals.views++;if(x.event_type==='enquiry')totals.enquiries++;if(x.event_type==='save')totals.saves++;if(x.event_type==='product_view')totals.product_views++;if(x.event_type==='story_view')totals.story_views++;if(x.event_type==='call')totals.call++;if(x.event_type==='whatsapp')totals.whatsapp++;if(x.event_type==='offer_click')totals.offer_click++}res.json({business:b,totals})});

app.post('/api/funding/applications',requireUser,async(req,res)=>{const b=await ownedBusiness(req.user.id);if(!b)return res.status(400).json({error:'Create a business first'});const amount=Number(req.body.amount);const purpose=String(req.body.purpose||'').trim();const tenure=String(req.body.tenure||'');if(!Number.isFinite(amount)||amount<1000||amount>10000000||purpose.length<5)return res.status(400).json({error:'Enter a valid funding amount and purpose'});const {data,error}=await supabaseAdmin.from('funding_applications').insert({business_id:b.id,owner_id:req.user.id,amount,purpose:purpose.slice(0,2000),tenure:tenure.slice(0,40),status:'submitted'}).select('*').single();if(error)return res.status(400).json({error:error.message});res.status(201).json({application:data})});
app.get('/api/funding/applications',requireUser,async(req,res)=>{const b=await ownedBusiness(req.user.id);const {data,error}=await supabaseAdmin.from('funding_applications').select('*').eq('business_id',b?.id).order('created_at',{ascending:false});if(error)return res.status(500).json({error:error.message});res.json({applications:data||[]})});

app.post('/api/ai/chat',aiLimiter,async(req,res)=>{const message=String(req.body.message||'').trim().slice(0,4000);if(!message)return res.status(400).json({error:'Message required'});const context=String(req.body.context?.page||'home').replace(/[^a-z0-9_-]/gi,'').slice(0,40)||'home';const system=`You are Imphi, the friendly AI assistant inside Imphal Connect. Answer general questions clearly and helpfully. You can help with Imphal/Manipur travel, food, local businesses, events, shopping, business setup, and how to use this app. Never claim a booking, payment, subscription, upload, loan, or admin action happened unless an API confirms it. If the user asks for current/local facts that are not in your supplied context, say that live data may require a connected source rather than inventing facts. Current app page: ${context}. Keep responses concise but useful.`;
if(!process.env.AI_API_URL||!process.env.AI_API_KEY)return res.json({reply:`I’m Imphi ✨. I can help with your Imphal Connect journey, business setup, subscriptions, local discovery and planning. For fully general AI answers, add a secure AI_API_URL and AI_API_KEY to the server environment.

For now, tell me what you want to do and I’ll guide you through the app.`});
try{const body={model:process.env.AI_MODEL,messages:[{role:'system',content:system},{role:'user',content:message}],temperature:Math.min(1,Math.max(0,Number(process.env.AI_TEMPERATURE||1))),max_completion_tokens:Math.min(4000,Math.max(100,Number(process.env.AI_MAX_TOKENS||1000)))};const r=await fetch(process.env.AI_API_URL,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${process.env.AI_API_KEY}`},body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.error?.message||'AI provider error');const reply=String(d?.choices?.[0]?.message?.content||d?.output_text||'I could not generate a response right now.').trim();if(!reply)throw new Error('AI provider returned an empty response');res.json({reply:reply.slice(0,12000)})}catch(e){console.error('AI:',e.message);res.status(502).json({error:'AI service unavailable'})}});

// Admin APIs
app.get('/api/admin/overview',requireAdmin,async(_req,res)=>{const [b,p,f]=await Promise.all([supabaseAdmin.from('businesses').select('id,is_published,plan',{count:'exact',head:false}).limit(10000),supabaseAdmin.from('payment_events').select('id',{count:'exact',head:true}),supabaseAdmin.from('funding_applications').select('id',{count:'exact',head:true})]);const businesses=b.data||[];res.json({businesses:businesses.length,published:businesses.filter(x=>x.is_published).length,paid:businesses.filter(x=>['pro','elite'].includes(x.plan)).length,funding:f.count||0,payments:p.count||0})});
app.get('/api/admin/businesses',requireAdmin,async(_req,res)=>{const {data,error}=await supabaseAdmin.from('businesses').select('id,name,slug,category,is_verified,is_published,plan,subscription_status,created_at,owner_id').order('created_at',{ascending:false}).limit(500);if(error)return res.status(500).json({error:error.message});res.json({businesses:data||[]})});
app.patch('/api/admin/businesses/:id',requireAdmin,async(req,res)=>{const patch=Object.fromEntries(Object.entries(req.body||{}).filter(([k])=>['is_verified','is_published','plan','subscription_status'].includes(k)));patch.updated_at=new Date().toISOString();const {data,error}=await supabaseAdmin.from('businesses').update(patch).eq('id',req.params.id).select('*').single();if(error)return res.status(400).json({error:error.message});res.json({business:data})});
app.get('/api/admin/payments',requireAdmin,async(_req,res)=>{const {data,error}=await supabaseAdmin.from('payment_events').select('id,event_name,provider_ref,created_at').order('created_at',{ascending:false}).limit(500);if(error)return res.status(500).json({error:error.message});res.json({events:data||[]})});
app.get('/api/admin/users',requireAdmin,async(_req,res)=>{const {data,error}=await supabaseAdmin.from('profiles').select('id,full_name,phone,role,created_at').order('created_at',{ascending:false}).limit(500);if(error)return res.status(500).json({error:error.message});const ids=(data||[]).map(x=>x.id);let users=[];if(ids.length){const {data:list}=await supabaseAdmin.auth.admin.listUsers({page:1,perPage:1000});users=(list?.users||[]).filter(u=>ids.includes(u.id)).map(u=>{const p=data.find(x=>x.id===u.id);return {...p,email:u.email}})}res.json({users})});
app.get('/api/admin/funding',requireAdmin,async(_req,res)=>{const {data,error}=await supabaseAdmin.from('funding_applications').select('*,businesses(name)').order('created_at',{ascending:false}).limit(500);if(error)return res.status(500).json({error:error.message});res.json({applications:(data||[]).map(x=>({...x,business:x.businesses}))})});
app.patch('/api/admin/funding/:id',requireAdmin,async(req,res)=>{const status=String(req.body.status||'');if(!['submitted','under_review','approved','rejected','disbursed','closed'].includes(status))return res.status(400).json({error:'Invalid funding status'});const {data,error}=await supabaseAdmin.from('funding_applications').update({status,reviewed_by:req.user.id,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',req.params.id).select('*').single();if(error)return res.status(400).json({error:error.message});res.json({application:data})});

app.get('/gaming',(req,res)=>res.sendFile(process.cwd()+'/public/gaming.html'));
app.get('/gaming.html',(req,res)=>res.sendFile(process.cwd()+'/public/gaming.html'));
app.get('/{*splat}',(req,res)=>res.sendFile(process.cwd()+'/public/index.html'));
app.listen(PORT,()=>console.log(`Imphal Connect v2 running on ${APP_URL}`));
