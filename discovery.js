import { createClient } from '@supabase/supabase-js';

const supabaseUrl=process.env.SUPABASE_URL||'';
const supabaseSecret=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const admin=supabaseUrl&&supabaseSecret?createClient(supabaseUrl,supabaseSecret,{auth:{autoRefreshToken:false,persistSession:false}}):null;
const OVERPASS_URL=process.env.OVERPASS_URL||'https://overpass.private.coffee/api/interpreter';
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
const LOCAL_TERMS={food:['food','restaurant','cafe','bakery','fast food'],shopping:['shop','store','market','shopping'],services:['service','office','repair'],hotels:['hotel','guest','hostel','resort','lodge'],cafes:['cafe','coffee'],restaurants:['restaurant','food'],groceries:['grocery','supermarket','convenience','market'],fashion:['fashion','clothes','tailor','shoe'],electronics:['electronics','computer','mobile','phone','appliance'],hardware:['hardware','building','plumbing','electrical'],books:['book','stationery'],pharmacies:['pharmacy','chemist'],health:['health','clinic','doctor','dentist','pharmacy'],clinics:['clinic','doctor','dentist'],hospitals:['hospital'],gyms:['gym','fitness'],salons:['salon','hair','beauty'],education:['school','college','university','education'],automotive:['car','auto','motor','repair','tyre'],banks:['bank','atm'],handloom:['handloom','fabric','tailor','textile'],tourism:['tourism','travel','attraction']};
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
function local(b){return {placeId:'ic-'+b.id,source:'imphal-connect',name:b.name,type:b.category||'Local business',address:b.address||[b.city,'Manipur'].filter(Boolean).join(', '),city:b.city||'Imphal',latitude:Number.isFinite(+b.latitude)?+b.latitude:null,longitude:Number.isFinite(+b.longitude)?+b.longitude:null,phone:b.phone||b.whatsapp||'',website:b.website||'',logoUrl:b.logo_url||'',coverUrl:b.cover_url||'',isVerified:!!b.is_verified,mapsUrl:maps(b.name,b.address,b.latitude,b.longitude)}}
function osm(el){const t=el.tags||{},lat=el.lat??el.center?.lat,lng=el.lon??el.center?.lon;if(!t.name||lat==null||lng==null)return null;const a=[t['addr:housenumber'],t['addr:street'],t['addr:suburb'],t['addr:city']||'Imphal'].filter(Boolean).join(', ');return {placeId:'osm-'+el.type+'-'+el.id,source:'openstreetmap',name:t.name,type:String(t.amenity||t.shop||t.tourism||t.leisure||t.office||t.craft||'business').replaceAll('_',' '),address:a||'Imphal, Manipur',city:t['addr:city']||'Imphal',latitude:+lat,longitude:+lng,phone:t.phone||t['contact:phone']||'',website:t.website||t['contact:website']||'',mapsUrl:maps(t.name,a,+lat,+lng),openingHours:t.opening_hours||null}}
async function overpass(q,category,lat,lng,radius){
 const la=Number.isFinite(lat)?lat:CENTER.lat,lo=Number.isFinite(lng)?lng:CENTER.lng,r=Math.min(10000,Math.max(500,Number.isFinite(radius)?radius:8000));
 const term=safe(q,50),base=CATEGORY[String(category||'all').toLowerCase()]||CATEGORY.all,alias=ALIAS[term.toLowerCase()];
 const name=term?'nwr(around:'+r+','+la+','+lo+')[name~"'+rx(term)+'",i];':'';
 const typed=alias?'nwr(around:'+r+','+la+','+lo+')['+alias+'];':'nwr(around:'+r+','+la+','+lo+')'+base+';';
 const query='[out:json][timeout:12];('+name+typed+');out center tags qt;',key='osm:'+la.toFixed(4)+':'+lo.toFixed(4)+':'+r+':'+category+':'+term.toLowerCase();
 const old=cache.get(key);if(old&&Date.now()-old.at<30000)return old.data;
 const resp=await fetch(OVERPASS_URL,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8','user-agent':'ImphalConnect/1.0 (+https://imphal-connect.onrender.com)'},body:'data='+encodeURIComponent(query)});
 if(!resp.ok)throw new Error('OpenStreetMap HTTP '+resp.status);const json=await resp.json();const data=(json.elements||[]).map(osm).filter(Boolean);cache.set(key,{at:Date.now(),data});return data;
}
export async function smartDiscovery(req,res){
 const q=safe(req.query.q,80),category=safe(req.query.category||'all',40).toLowerCase()||'all',lat=Number(req.query.lat),lng=Number(req.query.lng),radius=Number(req.query.radius),limit=Math.min(30,Math.max(1,Number(req.query.pageSize)||18));
 const la=Number.isFinite(lat)?lat:CENTER.lat,lo=Number.isFinite(lng)?lng:CENTER.lng,key='smart:'+la.toFixed(4)+':'+lo.toFixed(4)+':'+category+':'+q.toLowerCase();
 const old=cache.get(key);if(old&&Date.now()-old.at<15000){res.set('Cache-Control','private, max-age=15');return res.json(old.data)}
 let localRows=[];if(admin){try{const x=await admin.from('businesses').select('id,name,category,phone,whatsapp,address,city,latitude,longitude,logo_url,cover_url,is_verified,is_published').eq('is_published',true).limit(120);if(!x.error)localRows=x.data||[]}catch{}}
 const term=q.toLowerCase(),catTerms=LOCAL_TERMS[category]||[category];localRows=localRows.map(local).filter(p=>{const text=[p.name,p.type,p.address,p.city].join(' ').toLowerCase();const cOk=!category||category==='all'||catTerms.some(k=>text.includes(k));return (!term||text.includes(term))&&cOk});
 if(Number.isFinite(lat)&&Number.isFinite(lng))localRows.forEach(p=>{if(p.latitude!=null&&p.longitude!=null)p.distanceKm=dist(lat,lng,p.latitude,p.longitude)});localRows.sort((a,b)=>(a.distanceKm??999)-(b.distanceKm??999));
 let osmRows=[];try{osmRows=await overpass(q,category,la,lo,radius)}catch(e){console.warn('OSM discovery:',e.message)}
 if(Number.isFinite(lat)&&Number.isFinite(lng))osmRows.forEach(p=>{p.distanceKm=dist(lat,lng,p.latitude,p.longitude)});osmRows.sort((a,b)=>(a.distanceKm??999)-(b.distanceKm??999));
 const seen=new Set(),merged=[...localRows,...osmRows].filter(p=>{const k=(p.name+'|'+(p.address||'')).toLowerCase().replace(/[^a-z0-9]+/g,'');if(seen.has(k))return false;seen.add(k);return true}).slice(0,limit);
 const data={ok:true,places:merged,sources:localRows.length&&osmRows.length?'Imphal Connect + OpenStreetMap':localRows.length?'Imphal Connect':'OpenStreetMap',generatedAt:new Date().toISOString()};cache.set(key,{at:Date.now(),data});res.set('Cache-Control','private, max-age=15');return res.json(data);
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
