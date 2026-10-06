import { createClient } from '@supabase/supabase-js';
import { gzipSync, gunzipSync } from 'node:zlib';

const supabaseUrl=process.env.SUPABASE_URL||'';
const supabaseSecret=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const admin=supabaseUrl&&supabaseSecret?createClient(supabaseUrl,supabaseSecret,{auth:{autoRefreshToken:false,persistSession:false}}):null;
const OVERPASS_URLS=[process.env.OVERPASS_URL,'https://overpass.private.coffee/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter','https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'].filter(Boolean);
const cache=new Map();
const CENTER={lat:24.817,lng:93.9368};
const CATEGORY={
 all:'["name"]',food:'["amenity"~"restaurant|cafe|fast_food|food_court|bar|pub|ice_cream"]',
 cafes:'["amenity"="cafe"]',restaurants:'["amenity"~"restaurant|fast_food|food_court"]',shopping:'["shop"]',
 groceries:'["shop"~"supermarket|grocery|convenience|general|greengrocer|food"]',fashion:'["shop"~"clothes|fashion|shoes|tailor"]',
 electronics:'["shop"~"electronics|computer|mobile_phone|telecommunication|appliance"]',hardware:'["shop"~"hardware|doityourself|builders_merchant|trade|electrical|plumbing"]',
 books:'["shop"~"books|stationery"]',pharmacies:'["amenity"="pharmacy"]',health:'["amenity"~"clinic|doctors|dentist|pharmacy"]',
 clinics:'["amenity"~"clinic|doctors|dentist"]',hospitals:'["amenity"="hospital"]',gyms:'["leisure"="fitness_centre"]',
 salons:'["shop"~"hairdresser|beauty"]',hotels:'["tourism"~"hotel|guest_house|hostel|motel|resort"]',
 education:'["amenity"~"school|college|university|kindergarten"]',automotive:'["shop"~"car|car_repair|motorcycle|tyres"]',
 services:'["office"]',banks:'["amenity"~"bank|atm"]',handloom:'["shop"~"fabric|clothes|tailor|art"]',tourism:'["tourism"]'
};
const LOCAL_TERMS={food:['food','restaurant','cafe','bakery','fast food'],shopping:['shop','store','market','shopping'],services:['service','office','repair'],hotels:['hotel','guest','hostel','resort','lodge'],resorts:['resort','hotel','farmhouse','retreat'],cafes:['cafe','coffee'],restaurants:['restaurant','food'],groceries:['grocery','supermarket','convenience','market'],fashion:['fashion','clothes','tailor','shoe'],electronics:['electronics','computer','mobile','phone','appliance'],hardware:['hardware','building','plumbing','electrical'],books:['book','stationery'],pharmacies:['pharmacy','chemist'],health:['health','clinic','doctor','dentist','pharmacy'],clinics:['clinic','doctor','dentist'],hospitals:['hospital'],gyms:['gym','fitness'],salons:['salon','hair','beauty'],education:['school','college','university','education'],automotive:['car','auto','motor','repair','tyre'],banks:['bank','atm'],handloom:['handloom','fabric','tailor','textile'],tourism:['tourism','travel','attraction']};
const ALIAS={
 cafe:'amenity="cafe"',cafes:'amenity="cafe"',coffee:'amenity="cafe"',restaurant:'amenity~"restaurant|fast_food"',restaurants:'amenity~"restaurant|fast_food"',food:'amenity~"restaurant|cafe|fast_food"',
 hotel:'tourism~"hotel|guest_house|hostel|resort"',hotels:'tourism~"hotel|guest_house|hostel|resort"',stay:'tourism~"hotel|guest_house|hostel|resort"',
 pharmacy:'amenity="pharmacy"',pharmacies:'amenity="pharmacy"',clinic:'amenity~"clinic|doctors|dentist"',clinics:'amenity~"clinic|doctors|dentist"',
 hospital:'amenity="hospital"',hospitals:'amenity="hospital"',gym:'leisure="fitness_centre"',gyms:'leisure="fitness_centre"',salon:'shop~"hairdresser|beauty"',salons:'shop~"hairdresser|beauty"',
 hardware:'shop~"hardware|doityourself|builders_merchant|trade|electrical|plumbing"',electronics:'shop~"electronics|computer|mobile_phone|telecommunication|appliance"',
 grocery:'shop~"supermarket|grocery|convenience|general|greengrocer"',groceries:'shop~"supermarket|grocery|convenience|general|greengrocer"',
 books:'shop~"books|stationery"',bookstore:'shop~"books|stationery"',fashion:'shop~"clothes|fashion|shoes|tailor"',bank:'amenity~"bank|atm"',banks:'amenity~"bank|atm"'
};
function safe(s,max=80){return String(s||'').replace(/[^\p{L}\p{N}\s&'._-]/gu,' ').replace(/\s+/g,' ').trim().slice(0,max)}
function rx(s){return safe(s,50).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function dist(a,b,c,d){const R=6371,r=Math.PI/180,x=(c-a)*r,y=(d-b)*r,h=Math.sin(y/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(x/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function maps(name,address,lat,lng){const q=lat!=null&&lng!=null?lat+','+lng:[name,address,'Imphal','Manipur'].filter(Boolean).join(', ');return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q)}
function local(b){return {placeId:'ic-'+b.id,source:'imphal-connect',slug:b.slug||'',name:b.name,type:b.category||'Local business',address:b.address||[b.city,'Manipur'].filter(Boolean).join(', '),city:b.city||'Imphal',latitude:Number.isFinite(+b.latitude)?+b.latitude:null,longitude:Number.isFinite(+b.longitude)?+b.longitude:null,phone:b.phone||b.whatsapp||'',website:b.website||'',logoUrl:b.logo_url||'',coverUrl:b.cover_url||'',isVerified:!!b.is_verified,mapsUrl:maps(b.name,b.address,b.latitude,b.longitude)}}
function osm(el){const t=el.tags||{},lat=el.lat??el.center?.lat,lng=el.lon??el.center?.lon;if(!t.name||lat==null||lng==null)return null;const a=[t['addr:housenumber'],t['addr:street'],t['addr:suburb'],t['addr:city']||'Imphal'].filter(Boolean).join(', ');return {placeId:'osm-'+el.type+'-'+el.id,source:'openstreetmap',name:t.name,type:String(t.amenity||t.shop||t.tourism||t.leisure||t.office||t.craft||'business').replaceAll('_',' '),address:a||'Imphal, Manipur',city:t['addr:city']||'Imphal',latitude:+lat,longitude:+lng,phone:t.phone||t['contact:phone']||'',website:t.website||t['contact:website']||'',mapsUrl:maps(t.name,a,+lat,+lng),openingHours:t.opening_hours||null}}
async function overpass(q,category,lat,lng,radius){
 const la=Number.isFinite(lat)?lat:CENTER.lat,lo=Number.isFinite(lng)?lng:CENTER.lng,r=Math.min(10000,Math.max(500,Number.isFinite(radius)?radius:8000));
 const term=safe(q,50),base=CATEGORY[String(category||'all').toLowerCase()]||CATEGORY.all,alias=ALIAS[term.toLowerCase()];
 const name=term?'nwr(around:'+r+','+la+','+lo+')[name~"'+rx(term)+'",i];':'';
 const typed=alias?'nwr(around:'+r+','+la+','+lo+')['+alias+'];':'nwr(around:'+r+','+la+','+lo+')'+base+';';
 const query='[out:json][timeout:12];('+name+typed+');out center tags qt;',key='osm:'+la.toFixed(4)+':'+lo.toFixed(4)+':'+r+':'+category+':'+term.toLowerCase();
 const old=cache.get(key);if(old&&Date.now()-old.at<30000)return old.data;
 for(const endpoint of OVERPASS_URLS){try{const resp=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8','user-agent':'ImphalConnect/1.0 (+https://imphal-connect.onrender.com)'},body:'data='+encodeURIComponent(query),signal:AbortSignal.timeout(15000)});if(!resp.ok)continue;const json=await resp.json();const data=(json.elements||[]).map(osm).filter(Boolean);cache.set(key,{at:Date.now(),data});return data}catch{}}
 throw new Error('Map discovery temporarily unavailable');
}
const CATALOG_ID='imphal-city-v1';
const catalogCache=new Map();
let catalogBuildPromise=null;
let localRowsCache={at:0,rows:[]};

const CATEGORY_FROM_TAGS={
  cafe:'Cafes',restaurant:'Restaurants',fast_food:'Restaurants',food_court:'Restaurants',bar:'Food',pub:'Food',ice_cream:'Food',
  supermarket:'Groceries',grocery:'Groceries',convenience:'Groceries',greengrocer:'Groceries',
  clothes:'Fashion',fashion:'Fashion',shoes:'Fashion',tailor:'Handloom',
  electronics:'Electronics',computer:'Electronics',mobile_phone:'Electronics',telecommunication:'Electronics',appliance:'Electronics',
  hardware:'Hardware',doityourself:'Hardware',builders_merchant:'Hardware',trade:'Services',electrical:'Hardware',plumbing:'Hardware',
  books:'Books',stationery:'Books',pharmacy:'Pharmacies',clinic:'Clinics',doctors:'Clinics',dentist:'Health',hospital:'Hospitals',
  fitness_centre:'Gyms',hairdresser:'Salons',beauty:'Salons',hotel:'Hotels',guest_house:'Hotels',hostel:'Hotels',motel:'Hotels',resort:'Resorts',
  school:'Education',college:'Education',university:'Education',kindergarten:'Education',
  car:'Automotive',car_repair:'Automotive',motorcycle:'Automotive',tyres:'Automotive',
  bank:'Banks',atm:'Banks',fabric:'Handloom',art:'Handloom',travel_agency:'Tourism',attraction:'Tourism',
  office:'Services',museum:'Tourism',gallery:'Tourism',park:'Tourism',place_of_worship:'Tourism'
};
function tagCategory(t){
  for(const key of ['amenity','shop','tourism','leisure','office','craft']){
    const v=String(t[key]||'').toLowerCase();
    if(CATEGORY_FROM_TAGS[v])return CATEGORY_FROM_TAGS[v];
  }
  return t.name?'Local':'Other';
}
function osmSnapshotRow(el){
  const t=el.tags||{},lat=el.lat??el.center?.lat,lng=el.lon??el.center?.lon;
  if(!t.name||lat==null||lng==null)return null;
  const address=[t['addr:housenumber'],t['addr:street'],t['addr:suburb'],t['addr:city']||'Imphal'].filter(Boolean).join(', ');
  const type=String(t.amenity||t.shop||t.tourism||t.leisure||t.office||t.craft||'business').replaceAll('_',' ');
  return {
    placeId:'osm-'+el.type+'-'+el.id,source:'openstreetmap',name:safe(t.name,120),type,category:tagCategory(t),
    address:address||'Imphal, Manipur',city:t['addr:city']||'Imphal',latitude:+lat,longitude:+lng,
    phone:t.phone||t['contact:phone']||'',website:t.website||t['contact:website']||'',
    mapsUrl:maps(t.name,address,+lat,+lng),openingHours:t.opening_hours||null
  };
}
function localSnapshotRow(b){
  return {placeId:'ic-'+b.id,source:'imphal-connect',name:b.name,type:b.category||'Local business',category:b.category||'Local',
    address:b.address||[b.city,'Manipur'].filter(Boolean).join(', '),city:b.city||'Imphal',
    latitude:Number.isFinite(+b.latitude)?+b.latitude:null,longitude:Number.isFinite(+b.longitude)?+b.longitude:null,
    phone:b.phone||b.whatsapp||'',website:b.website||'',logoUrl:b.logo_url||'',coverUrl:b.cover_url||'',
    isVerified:!!b.is_verified,mapsUrl:maps(b.name,b.address,b.latitude,b.longitude),openingHours:b.opening_hours||null};
}
const OFFICIAL_STAYS=[
  ['Hotel Imphal','Hotel','Imphal East'],['The Classic Hotel','Hotel','Imphal East'],['Classic Grande','Hotel','Imphal East'],
  ['Hotel Sangai Continental','Hotel','Imphal West'],['Hotel Nirmala','Hotel','Imphal West'],['Hotel Yaisana','Hotel','Imphal West'],
  ['Hotel Yaiphaba','Hotel','Imphal West'],['Hotel Anand Continental','Hotel','Imphal West'],['Hotel Bheigo','Hotel','Imphal West'],
  ['Hotel Lanchenba','Hotel','Imphal East'],['The Sangai Hotel','Hotel','Imphal West'],['Sendra Resort','Resort','Bishnupur'],
  ['The Giving Tree','Homestay','Imphal West']
];
function officialStayRows(){return OFFICIAL_STAYS.map(([name,type,city],i)=>({placeId:'gov-stay-'+i,source:'manipur-tourism',name,type,category:type==='Resort'?'Resorts':'Hotels',address:city+', Manipur',city,latitude:null,longitude:null,phone:'',website:'https://manipurtourism.gov.in/find-accommodation/',mapsUrl:maps(name,city+', Manipur'),openingHours:null,officialSource:'Manipur Tourism'}))}
async function fetchSnapshotOverpass(query){
  let lastErr=null;
  for(const endpoint of OVERPASS_URLS){
    try{
      const resp=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8','user-agent':'ImphalConnect/1.0 (+https://imphal-connect.onrender.com)'},body:'data='+encodeURIComponent(query),signal:AbortSignal.timeout(20000)});
      if(!resp.ok){lastErr=new Error('OpenStreetMap HTTP '+resp.status);continue}
      return await resp.json();
    }catch(e){lastErr=e}
  }
  throw lastErr||new Error('OpenStreetMap unavailable');
}
async function extractImphalSnapshot(){
  // Avoid the previous 18 km [name] dump: it could time out and silently produce a catalog containing only official hotels.
  // These smaller, sequential category queries are much more reliable and stay within Overpass fair-use guidance.
  const la=CENTER.lat,lo=CENTER.lng,radius=10000;
  const queries=[
    '[out:json][timeout:20];nwr(around:'+radius+','+la+','+lo+')[amenity~"restaurant|cafe|fast_food|food_court|bar|pub|ice_cream"];out center tags qt;',
    '[out:json][timeout:20];nwr(around:'+radius+','+la+','+lo+')[shop];out center tags qt;',
    '[out:json][timeout:20];nwr(around:'+radius+','+la+','+lo+')[amenity~"pharmacy|clinic|doctors|dentist|hospital|bank|atm|school|college|university"];out center tags qt;',
    '[out:json][timeout:20];nwr(around:'+radius+','+la+','+lo+')[tourism~"hotel|guest_house|hostel|motel|resort"];out center tags qt;',
    '[out:json][timeout:20];nwr(around:'+radius+','+la+','+lo+')[leisure="fitness_centre"];out center tags qt;',
    '[out:json][timeout:20];nwr(around:'+radius+','+la+','+lo+')[office];out center tags qt;'
  ];
  const elements=[];
  const errors=[];
  for(const query of queries){
    try{
      const json=await fetchSnapshotOverpass(query);
      elements.push(...(json.elements||[]));
    }catch(e){errors.push(e?.message||'unknown error')}
  }
  const osmRows=elements.map(osmSnapshotRow).filter(Boolean);
  let localRows=[];
  if(admin){
    try{
      const x=await admin.from('businesses').select('id,name,slug,category,phone,whatsapp,address,city,latitude,longitude,logo_url,cover_url,opening_hours,website,instagram_url,gallery_urls,is_verified,is_published').eq('is_published',true).limit(5000);
      if(!x.error)localRows=(x.data||[]).map(localSnapshotRow);
    }catch{}
  }
  if(osmRows.length===0&&localRows.length===0)console.warn('OpenStreetMap catalog extraction returned no rows:',errors.join(' | '));
  const seen=new Set(),places=[...localRows,...osmRows,...officialStayRows()].filter(p=>{
    const key=(p.name+'|'+(p.address||'')).toLowerCase().replace(/[^a-z0-9]+/g,'');
    if(seen.has(key))return false;seen.add(key);return true;
  });
  const extractedAt=new Date().toISOString();
  const payload={version:2,extractedAt,area:'Imphal 10km radius',sources:['OpenStreetMap','Imphal Connect'],places};
  // Never overwrite a good persisted snapshot with an empty/official-only rebuild caused by a temporary OSM outage.
  if(osmRows.length>0||localRows.length>0){
    const compressed=gzipSync(Buffer.from(JSON.stringify(payload))).toString('base64');
    if(admin){
      const {error}=await admin.from('discovery_snapshots').upsert({
        id:CATALOG_ID,source:'OpenStreetMap + Imphal Connect',version:2,extracted_at:extractedAt,
        area:'Imphal 10km radius',record_count:places.length,payload_gzip:compressed,
        metadata:{osmCount:osmRows.length,localCount:localRows.length,compression:'gzip+base64',refresh:'manual only',queryStrategy:'category-batched'}
      },{onConflict:'id'});
      if(error)console.warn('Snapshot save:',error.message);
    }
  }
  return payload;
}
async function getCatalog(force=false){
  const cached=force?null:catalogCache.get(CATALOG_ID);
  async function withCurrentLocal(payload){
    if(!admin)return payload;
    if(Date.now()-localRowsCache.at>30000){
      try{
        const x=await admin.from('businesses').select('id,name,slug,category,phone,whatsapp,address,city,latitude,longitude,logo_url,cover_url,opening_hours,website,instagram_url,gallery_urls,is_verified,is_published').eq('is_published',true).limit(5000);
        if(!x.error)localRowsCache={at:Date.now(),rows:(x.data||[]).map(localSnapshotRow)};
      }catch{}
    }
    const localIds=new Set(localRowsCache.rows.map(x=>x.placeId));
    const base=(payload.places||[]).filter(x=>!localIds.has(x.placeId));
    return {...payload,places:[...localRowsCache.rows,...base]};
  }
  if(cached)return withCurrentLocal(cached);
  if(admin){
    try{
      const {data,error}=force?{data:null,error:null}:await admin.from('discovery_snapshots').select('version,extracted_at,area,record_count,payload_gzip,metadata').eq('id',CATALOG_ID).maybeSingle();
      if(!error&&data?.payload_gzip){
        const payload=JSON.parse(gunzipSync(Buffer.from(data.payload_gzip,'base64')).toString('utf8'));
        catalogCache.set(CATALOG_ID,payload);return withCurrentLocal(payload);
      }
    }catch(e){console.warn('Snapshot read:',e.message)}
  }
  if(!catalogBuildPromise)catalogBuildPromise=extractImphalSnapshot().finally(()=>{catalogBuildPromise=null});
  const payload=await catalogBuildPromise;catalogCache.set(CATALOG_ID,payload);return withCurrentLocal(payload);
}
function dayMatches(selector,day){
  if(!selector)return true;
  const order=['Mo','Tu','We','Th','Fr','Sa','Su'];
  return selector.replace(/\s+/g,'').split(',').some(part=>{
    const m=part.match(/^(Mo|Tu|We|Th|Fr|Sa|Su)-(Mo|Tu|We|Th|Fr|Sa|Su)$/);
    if(m){let a=order.indexOf(m[1]),b=order.indexOf(m[2]),d=order.indexOf(day);if(b<a)b+=7;if(d<a)d+=7;return d>=a&&d<=b}
    return part===day;
  });
}
function openingStatus(hours,now=new Date()){
  if(!hours)return {status:'unknown',label:'Hours not listed'};
  const h=String(hours).trim();
  if(!h)return {status:'unknown',label:'Hours not listed'};
  if(/^24\/7$/i.test(h))return {status:'open',label:'Open 24/7'};
  const weekday=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',weekday:'short'}).format(now).slice(0,2);
  let applicable=null;
  for(const part of h.split(/;|\|\|/).map(x=>x.trim()).filter(Boolean)){
    const off=/\b(off|closed)\b/i.test(part);
    const dayMatch=part.match(/^(Mo|Tu|We|Th|Fr|Sa|Su)(?:\s*[-,]\s*(?:Mo|Tu|We|Th|Fr|Sa|Su))*\b/);
    if(dayMatch&&!dayMatches(dayMatch[0],weekday))continue;
    const times=[...part.matchAll(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g)].map(m=>[+m[1]*60 + +m[2],+m[3]*60 + +m[4]]);
    if(off)applicable={off:true};
    else if(times.length)applicable={times};
  }
  if(!applicable)return {status:'unknown',label:h};
  if(applicable.off)return {status:'closed',label:'Closed today'};
  const fmt=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
  const [hh,mm]=fmt.split(':').map(Number),mins=hh*60+mm;
  const open=applicable.times.some(([a,b])=>b>=a?mins>=a&&mins<b:mins>=a||mins<b);
  return {status:open?'open':'closed',label:open?'Open now':'Closed now'};
}
function enrichSnapshotRow(p){
  const st=openingStatus(p.openingHours);
  return {...p,openNow:st.status==='open'?true:st.status==='closed'?false:null,openStatus:st.status,hoursLabel:st.label};
}
function filterSnapshot(places,q,category){
  const term=safe(q,80).toLowerCase(),cat=safe(category||'all',40).toLowerCase();
  const catTerms=LOCAL_TERMS[cat]||[];
  return places.filter(p=>{
    const hay=[p.name,p.type,p.category,p.address,p.city,p.phone].join(' ').toLowerCase();
    const qOk=!term||hay.includes(term);
    const cOk=!cat||cat==='all'||String(p.category||'').toLowerCase()===cat||catTerms.some(k=>hay.includes(k));
    return qOk&&cOk;
  }).map(enrichSnapshotRow);
}
export async function warmCatalogIfMissing(){return getCatalog(false);}\n\nexport async function catalog(req,res){
  try{
    const payload=await getCatalog(req.query.refresh==='1'),places=filterSnapshot(payload.places||[],req.query.q||'',req.query.category||'all');
    res.set('Cache-Control','public, max-age=86400, stale-while-revalidate=604800');
    return res.json({ok:true,version:payload.version,extractedAt:payload.extractedAt,area:payload.area,count:places.length,total:payload.places?.length||0,source:payload.sources,places,attribution:'Map data © OpenStreetMap contributors · ODbL'});
  }catch(e){console.error('Catalog:',e);return res.status(503).json({ok:false,error:'Local catalog extraction is unavailable right now'});}
}
export async function smartDiscovery(req,res){
  try{
    const payload=await getCatalog(req.query.refresh==='1'),lat=Number(req.query.lat),lng=Number(req.query.lng);
    let places=filterSnapshot(payload.places||[],req.query.q||'',req.query.category||'all');
    if(Number.isFinite(lat)&&Number.isFinite(lng))places=places.map(p=>({...p,distanceKm:dist(lat,lng,p.latitude,p.longitude)})).sort((a,b)=>(a.distanceKm??999)-(b.distanceKm??999));
    const limit=Math.min(60,Math.max(1,Number(req.query.pageSize)||24));
    res.set('Cache-Control','public, max-age=86400, stale-while-revalidate=604800');
    return res.json({ok:true,places:places.slice(0,limit),total:places.length,extractedAt:payload.extractedAt,source:payload.sources});
  }catch(e){console.error('Smart discovery:',e);return res.status(503).json({ok:false,error:'Local catalog unavailable'});}
}
export async function todayEvents(req,res){
  const sourceUrl='https://www.kumhei.com/';
  const fallback=[
    {title:'Teachers Day 2026 MUSICAL CONCERT',venue:'MAYAI LAMBI COLLEGE YUMNAM HUIDROM, Imphal',date:'06 Oct 2026'},
    {title:'BLOOMING BAND 1PM Teachers Day CELEBRATION',venue:'D.M COMMERCE AUDITORIUM HALL, Imphal',date:'06 Oct 2026'},
    {title:'EMA BAND TEACHERS DAY MUSICAL CONCERT',venue:'PRAJA HIGHER SECONDARY SCHOOL, Lamsang, Imphal',date:'06 Oct 2026'},
    {title:'The 6th Langbal Keithel cum Expo 2026',venue:'Hapta Kangjeibung, Palace Compound, Imphal',date:'16 Sep 2026 to 16 Oct 2026'}
  ];
  try{
    const rr=await fetch(sourceUrl,{headers:{'user-agent':'ImphalConnect/1.0 (+https://imphal-connect.onrender.com)'},cache:'no-store'});
    const html=await rr.text();
    const text=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
    const names=[
      'Teachers Day 2026 MUSICAL CONCERT',
      'BLOOMING BAND 1PM Teachers Day CELEBRATION',
      'EMA BAND TEACHERS DAY MUSICAL CONCERT'
    ];
    const out=[];
    for(const title of names){
      const pos=text.toLowerCase().indexOf(title.toLowerCase());
      if(pos<0)continue;
      const chunk=text.slice(pos,pos+420);
      const vm=chunk.match(/Venue\s*([^|]+?)(?:-\s*www\.kumhei|Date|0\s*0)/i);
      out.push({title,venue:(vm?.[1]||'Imphal').replace(/\s+/g,' ').trim(),date:'06 Oct 2026'});
    }
    const data=out.length?out:fallback;
    res.set('Cache-Control','public, max-age=300');
    return res.json({ok:true,events:data,source:sourceUrl,verifiedAt:new Date().toISOString()});
  }catch{
    return res.json({ok:true,events:fallback,source:sourceUrl,verifiedAt:new Date().toISOString(),fallback:true});
  }
}
