/* Imphal Connect — 2026 UX/performance layer */
(() => {
  'use strict';
  const root = document.documentElement;
  const body = document.body;
  root.classList.add('ic-ux-ready');

  const style = document.createElement('style');
  style.textContent = `
    :root{scroll-behavior:smooth;--ic-ease:cubic-bezier(.22,1,.36,1)}
    *{box-sizing:border-box}
    html,body{overscroll-behavior-x:none}
    body{-webkit-tap-highlight-color:transparent}
    button,a,input,select,textarea,[role="button"]{touch-action:manipulation}
    button,a{transition:transform .16s var(--ic-ease),box-shadow .16s var(--ic-ease),opacity .16s ease}
    button:active,a:active{transform:scale(.975)}
    button:disabled{cursor:not-allowed;opacity:.58}
    :focus-visible{outline:3px solid rgba(8,121,209,.3);outline-offset:3px}
    #ic-progress{position:fixed;z-index:2147483646;left:0;top:0;height:3px;width:0;background:linear-gradient(90deg,#0879d1,#00b8a9,#f2b84b);box-shadow:0 0 14px rgba(8,121,209,.55);pointer-events:none;transition:width .12s ease}
    .ic-reveal{opacity:0;transform:translateY(14px);transition:opacity .65s var(--ic-ease),transform .65s var(--ic-ease)}
    .ic-reveal.ic-visible{opacity:1;transform:none}
    .ic-glass-nav{backdrop-filter:blur(18px) saturate(150%);-webkit-backdrop-filter:blur(18px) saturate(150%);box-shadow:0 8px 30px rgba(7,54,93,.08)}
    .ic-ripple{position:fixed;border-radius:999px;pointer-events:none;z-index:2147483645;background:rgba(255,255,255,.48);transform:scale(0);animation:ic-ripple .55s ease-out forwards}
    @keyframes ic-ripple{to{transform:scale(1);opacity:0}}
    #ic-top{position:fixed;right:16px;bottom:86px;width:44px;height:44px;border:0;border-radius:50%;z-index:2000;background:rgba(7,54,93,.92);color:#fff;font-size:18px;box-shadow:0 10px 28px rgba(7,54,93,.22);opacity:0;pointer-events:none;transform:translateY(12px);transition:.25s var(--ic-ease)}
    #ic-top.show{opacity:1;pointer-events:auto;transform:none}
    .ic-skeleton{position:relative;overflow:hidden;background:#edf5f8!important;color:transparent!important}
    .ic-skeleton:after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.72),transparent);animation:ic-shimmer 1.2s infinite}
    @keyframes ic-shimmer{100%{transform:translateX(100%)}}
    @media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;animation-duration:.001ms!important;transition-duration:.001ms!important}}
  `;
  document.head.appendChild(style);

  const progress = document.createElement('div');
  progress.id = 'ic-progress';
  body.appendChild(progress);

  const top = document.createElement('button');
  top.id = 'ic-top';
  top.type = 'button';
  top.setAttribute('aria-label','Back to top');
  top.textContent = '↑';
  top.onclick = () => window.scrollTo({top:0,behavior:'smooth'});
  body.appendChild(top);

  const updateScroll = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    progress.style.width = Math.min(100, scrollY / max * 100) + '%';
    top.classList.toggle('show', scrollY > 700);
  };
  addEventListener('scroll', updateScroll, {passive:true});
  updateScroll();

  // Fast touch feedback without blocking the app's existing click handlers.
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest('button,a,[role="button"]');
    if (!el || el.disabled) return;
    const r = el.getBoundingClientRect();
    const size = Math.max(r.width, r.height, 34);
    const ripple = document.createElement('i');
    ripple.className = 'ic-ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - size/2) + 'px';
    ripple.style.top = (e.clientY - size/2) + 'px';
    body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }, {passive:true});

  // Smooth reveal for large content sections as they enter the viewport.
  const reveal = () => {
    document.querySelectorAll('section, .section, .card, .feature, .offer, .plan, .story-bubble').forEach(el => {
      if (!el.dataset.icReveal) { el.dataset.icReveal='1'; el.classList.add('ic-reveal'); observer.observe(el); }
    });
  };
  const observer = new IntersectionObserver(entries => entries.forEach(x => {
    if (x.isIntersecting) { x.target.classList.add('ic-visible'); observer.unobserve(x.target); }
  }), {rootMargin:'0px 0px -8% 0px',threshold:.01});

  const refresh = () => {
    reveal();
    const candidates = document.querySelectorAll('header,nav,.topbar,.bottom-nav,.nav,.header');
    candidates.forEach(el => { if (el.getBoundingClientRect().height > 0) el.classList.add('ic-glass-nav'); });
  };
  refresh();
  new MutationObserver(() => requestAnimationFrame(refresh)).observe(body,{childList:true,subtree:true});

  // Make common icon-only controls accessible without changing their existing handlers.
  document.querySelectorAll('button').forEach(btn => {
    if (!btn.getAttribute('aria-label') && !btn.textContent.trim()) btn.setAttribute('aria-label','Open');
  });

  // Escape closes the active sheet/modal when the existing app exposes a close control.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const close = document.querySelector('#sheet button, .modal button[aria-label*="close" i], [role="dialog"] button');
    if (close) close.click();
  });

  // Prevent accidental double submits on forms while preserving existing handlers.
  document.addEventListener('submit', e => {
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    if (!button || form.dataset.icSubmitting) return;
    form.dataset.icSubmitting = '1';
    setTimeout(() => { delete form.dataset.icSubmitting; }, 1800);
  }, true);

  window.addEventListener('load', () => {
    progress.style.opacity='0';
    setTimeout(()=>progress.remove(),350);
  }, {once:true});
})();

/* ===== INSTAGRAM-STYLE DISCOVERY SHELL ===== */
(() => {
  'use strict';

  const esc = s => String(s ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const categoryMap = {
    All:'all', Cafes:'cafes', Restaurants:'restaurants', Books:'books', Shopping:'shopping',
    Hardware:'hardware', Clinics:'clinics', Hospitals:'hospitals', Pharmacies:'pharmacies',
    Gyms:'gyms', Salons:'salons', Electronics:'electronics', Fashion:'fashion',
    Hotels:'hotels', Education:'education', Automotive:'automotive', Services:'services',
    Banks:'banks', Groceries:'groceries', Handloom:'handloom', Tourism:'tourism'
  };
  const searchAliases = {
    'cafe':'cafes','cafes':'cafes','café':'cafes','coffee':'cafes','coffee shop':'cafes',
    'library':'books','libraries':'books','bookstore':'books','book store':'books','books':'books',
    'hardware':'hardware','hardware store':'hardware','hospital':'hospitals','hospitals':'hospitals',
    'clinic':'clinics','clinics':'clinics','pharmacy':'pharmacies','pharmacies':'pharmacies',
    'gym':'gyms','gyms':'gyms','salon':'salons','salons':'salons','restaurant':'restaurants','restaurants':'restaurants',
    'hotel':'hotels','hotels':'hotels','bank':'banks','banks':'banks','grocery':'groceries','groceries':'groceries',
    'electronics':'electronics','fashion':'fashion','school':'education','college':'education',
    'tutor':'education','coaching':'education','car repair':'automotive','automotive':'automotive'
  };
  function inferCategory(q){
    const s=String(q||'').trim().toLowerCase();
    return searchAliases[s]||'all';
  }
  function photoMarkup(p,large=false){
    const photo=p?.photos?.[0];
    if(!photo?.name)return '';
    const src='/api/discovery/google-photo?'+new URLSearchParams({name:photo.name,w:large?'1000':'720',h:large?'620':'480'}).toString();
    const author=photo.authorAttributions?.[0];
    const attribution=author?.uri
      ? '<a href="'+esc(author.uri)+'" target="_blank" rel="noopener">'+esc(author.displayName||'Photo author')+'</a>'
      : esc(author?.displayName||'Google Maps photo');
    const source=photo.googleMapsUri?'<a href="'+esc(photo.googleMapsUri)+'" target="_blank" rel="noopener">View on Google Maps</a>':'';
    return '<div class="ic-google-photo"><img src="'+esc(src)+'" alt="'+esc((p.name||'Business')+' photo')+'" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest(\'.ic-google-photo\').remove()"><div class="ic-google-photo-meta"><span>REAL PLACE PHOTO</span><span>'+attribution+' '+source+'</span></div></div>';
  }

  const style=document.createElement('style');
  style.textContent=`
    .ic-segment-shell{margin:8px 0 24px}
    .ic-segment-title{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:0 0 10px}
    .ic-segment-title h2{margin:0;font:900 18px/1.1 Manrope;color:#07365d}
    .ic-segment-title span{font-size:9px;color:#6d8492;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
    .ic-segment-tabs{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x proximity;scrollbar-width:none;padding:2px 2px 9px}
    .ic-segment-tabs::-webkit-scrollbar{display:none}
    .ic-segment-tab{flex:0 0 auto;scroll-snap-align:start;border:1px solid #d9edf5;background:#fff;color:#426275;border-radius:999px;padding:9px 13px;font:800 10px Manrope;white-space:nowrap}
    .ic-segment-tab.active{background:#07365d;color:#fff;border-color:#07365d;box-shadow:0 7px 18px rgba(7,54,93,.16)}
    .ic-hscroll{display:flex!important;gap:13px;overflow-x:auto!important;overflow-y:hidden!important;scroll-snap-type:x mandatory!important;scroll-behavior:smooth;padding:3px 2px 15px!important;scrollbar-width:none!important;grid-template-columns:none!important}
    .ic-hscroll::-webkit-scrollbar{display:none}
    .ic-hscroll>.ic-google-card{flex:0 0 min(82vw,320px)!important;scroll-snap-align:start!important;min-height:238px}
    .ic-hscroll>.ic-live-empty,.ic-hscroll>.ic-google-error{flex:0 0 88vw!important;min-width:280px}
    .ic-swipe-hint{display:flex;align-items:center;gap:7px;font-size:9px;color:#8095a1;font-weight:800;margin:-5px 0 8px}
    .ic-swipe-hint:after{content:'→';font-size:15px}
    .ic-feature-strip{display:flex;gap:13px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:4px 2px 13px}
    .ic-feature-strip::-webkit-scrollbar{display:none}
    .ic-feature-card{flex:0 0 min(76vw,280px);scroll-snap-align:start;border-radius:20px;padding:16px;background:linear-gradient(135deg,#07365d,#0879d1);color:#fff;min-height:112px;box-shadow:0 12px 26px rgba(7,54,93,.16)}
    .ic-feature-card b{font:900 13px Manrope}.ic-feature-card p{font-size:10px;opacity:.88;line-height:1.45;margin:7px 0 0}
    .ic-loading-strip{display:flex;gap:13px;overflow:hidden}
    .ic-loading-card{flex:0 0 min(82vw,320px);height:238px;border-radius:22px;background:linear-gradient(90deg,#edf5f8,#fff,#edf5f8);background-size:200% 100%;animation:ic-load 1.2s infinite}
    @keyframes ic-load{to{background-position:-200% 0}}
    @media(min-width:900px){.ic-hscroll>.ic-google-card{flex-basis:300px}.ic-segment-shell{margin-bottom:30px}}
  `;
  document.head.appendChild(style);

  function shell(targetId,title,subtitle){
    const target=document.getElementById(targetId); if(!target)return null;
    let s=target.closest('.ic-segment-shell');
    if(!s){
      s=document.createElement('div');s.className='ic-segment-shell';
      target.parentNode.insertBefore(s,target);
      s.appendChild(target);
    }
    s.innerHTML=`
      <div class="ic-segment-title"><h2>${esc(title)}</h2><span>${esc(subtitle||'LIVE · IMPHAL')}</span></div>
      <div class="ic-segment-tabs" data-tabs></div>
      <div class="ic-swipe-hint">Swipe to explore</div>
      <div id="${target.id}" class="ic-hscroll"></div>`;
    return s;
  }

  function tabs(container,active,onPick){
    const cats=['All','Cafes','Restaurants','Books','Shopping','Hardware','Clinics','Hospitals','Pharmacies','Gyms','Salons','Electronics','Fashion','Hotels','Education','Automotive','Services','Banks','Groceries','Handloom'];
    container.innerHTML=cats.map(c=>'<button type="button" class="ic-segment-tab '+(c===active?'active':'')+'" data-cat="'+esc(c)+'">'+esc(c)+'</button>').join('');
    container.querySelectorAll('[data-cat]').forEach(b=>b.addEventListener('click',()=>onPick(b.dataset.cat)));
  }

  function googleCard(p){
    const status=p.openNow===true?'<span class="ic-google-status ic-google-open">OPEN</span>':p.openNow===false?'<span class="ic-google-status ic-google-closed">CLOSED</span>':'<span class="ic-google-status ic-google-unknown">HOURS —</span>';
    const rating=p.rating!=null?'<div class="ic-google-rating"><span class="ic-google-star">★</span><b>'+Number(p.rating).toFixed(1)+'</b><span>'+Number(p.reviewCount||0).toLocaleString('en-IN')+' reviews</span></div>':'<div class="ic-google-rating">No rating yet</div>';
    const maps=p.mapsUrl||('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([p.name,p.address].filter(Boolean).join(', ')));
    const phone=p.phone?'<a href="tel:'+esc(p.phone)+'">Call</a>':'';
    return '<article class="ic-google-card" data-place-id="'+esc(p.placeId)+'">'+
      photoMarkup(p)+
      '<div class="ic-google-live">LIVE GOOGLE DATA</div>'+
      '<div class="ic-google-top"><div><h3 class="ic-google-name">'+esc(p.name)+'</h3><div class="ic-google-type">'+esc(p.type||'Local business')+'</div></div>'+status+'</div>'+
      '<div class="ic-google-address">'+esc(p.address||'Imphal, Manipur')+'</div>'+rating+
      '<div class="ic-google-actions"><a class="primary" href="'+esc(maps)+'" target="_blank" rel="noopener">Directions</a>'+phone+(p.website?'<a href="'+esc(p.website)+'" target="_blank" rel="noopener">Website</a>':'')+'</div>'+
      '<div class="ic-google-attribution">Google Maps</div></article>';
  }

  let googleQuotaBlockedUntil=0;
  async function query(cat,q='',pages=1){
    const inferred=inferCategory(q),effectiveCat=(cat==='All'&&inferred!=='all')?(Object.keys(categoryMap).find(k=>categoryMap[k]===inferred)||cat):cat;
    const p=new URLSearchParams({category:categoryMap[effectiveCat]||'all',pageSize:'12'});if(q)p.set('q',q);
    try{
      if(Date.now()<googleQuotaBlockedUntil)throw new Error('GOOGLE_QUOTA_BLOCKED');
      const r=await fetch('/api/discovery/google?'+p,{cache:'no-store'}),d=await r.json().catch(()=>({}));
      if(!r.ok){const msg=String(d.error||'Live discovery unavailable');if(r.status===403||r.status===429||/quota|SearchTextRequest/i.test(msg))googleQuotaBlockedUntil=Date.now()+10*60*1000;throw new Error(msg)}
      return (d.places||[]).filter(x=>x.placeId);
    }catch(err){
      const fb=await fetch('/api/discovery/fallback?'+new URLSearchParams({category:categoryMap[effectiveCat]||'all',q}),{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
      const places=(fb?.places||[]).filter(Boolean);if(places.length)return places;throw err;
    }
  }

  function loading(el){
    el.innerHTML='<div class="ic-loading-strip">'+[1,2,3].map(()=>'<div class="ic-loading-card"></div>').join('')+'</div>';
  }

  function installAutoScroll(el){
    if(el.dataset.autoScroll)return;
    el.dataset.autoScroll='1';
    let timer=setInterval(()=>{
      if(document.hidden)return;
      const max=el.scrollWidth-el.clientWidth;
      if(max<20)return;
      const step=Math.min(335,Math.max(250,el.clientWidth*.82));
      el.scrollLeft+step>=max-10?el.scrollTo({left:0,behavior:'smooth'}):el.scrollBy({left:step,behavior:'smooth'});
    },4800);
    const stop=()=>{clearInterval(timer);timer=setInterval(()=>{
      const max=el.scrollWidth-el.clientWidth;if(max<20)return;
      const step=Math.min(335,Math.max(250,el.clientWidth*.82));
      el.scrollLeft+step>=max-10?el.scrollTo({left:0,behavior:'smooth'}):el.scrollBy({left:step,behavior:'smooth'});
    },4800)};
    ['touchstart','pointerdown','wheel'].forEach(e=>el.addEventListener(e,stop,{passive:true}));
  }

  async function renderSegment(targetId,cat,q=''){
    const el=document.getElementById(targetId);if(!el)return;
    loading(el);
    try{
      const places=await query(cat,q,1);
      if(!places.length){
        el.innerHTML='<div class="ic-live-empty"><b>No '+esc(cat.toLowerCase())+' found.</b>Try another segment or search term.</div>';
        return;
      }
      el.innerHTML=places.map(googleCard).join('');
      installAutoScroll(el);
    }catch(e){
      el.innerHTML='<div class="ic-google-error"><b>Live discovery is temporarily unavailable.</b><br>'+esc(e.message)+'</div>';
    }
  }

  async function mixedHome(targetId){
    const el=document.getElementById(targetId);if(!el)return;
    loading(el);
    try{
      const results=await query('All','',1);\n      const mixed=results.slice(0,12);
      el.innerHTML=mixed.length?mixed.map(googleCard).join(''):'<div class="ic-live-empty"><b>Live places are loading.</b>Try Explore in a moment.</div>';
      installAutoScroll(el);
    }catch(e){
      el.innerHTML='<div class="ic-google-error"><b>Live discovery is temporarily unavailable.</b><br>'+esc(e.message)+'</div>';
    }
  }

  async function buildHome(){
    const target=document.getElementById('homeCards');if(!target)return;
    const s=shell('homeCards','Explore Imphal','SWIPE · LIVE PLACES');
    const t=s.querySelector('[data-tabs]');
    tabs(t,'All',async cat=>{
      t.querySelectorAll('.ic-segment-tab').forEach(x=>x.classList.toggle('active',x.dataset.cat===cat));
      await renderSegment('homeCards',cat);
    });
    await mixedHome('homeCards');
  }

  async function buildExplore(){
    const target=document.getElementById('exploreCards');if(!target)return;
    const s=shell('exploreCards','Discover by category','SWIPE · LIVE PLACES');
    const t=s.querySelector('[data-tabs]');
    const search=()=>document.getElementById('exploreSearch')?.value?.trim()||'';
    const initial=window.exploreCat||'All';
    tabs(t,initial,async cat=>{
      window.exploreCat=cat;
      t.querySelectorAll('.ic-segment-tab').forEach(x=>x.classList.toggle('active',x.dataset.cat===cat));
      await renderSegment('exploreCards',cat,search());
    });
    await renderSegment('exploreCards',initial,search());
  }

  document.addEventListener('click',e=>{
    const card=e.target.closest('.ic-google-card[data-place-id]');
    if(card&&!e.target.closest('a,button')){
      if(window.openGooglePlaceProfile)window.openGooglePlaceProfile(card.dataset.placeId);
    }
  });


  let liveSearchTimer=null;
  function runLiveSearch(value){
    const q=String(value||'').trim();
    clearTimeout(liveSearchTimer);
    liveSearchTimer=setTimeout(()=>{
      const input=document.getElementById('exploreSearch');
      if(input&&input.value!==q)input.value=q;
      if(document.getElementById('exploreCards'))renderSegment('exploreCards',inferCategory(q)!=='all' ? (Object.keys(categoryMap).find(k=>categoryMap[k]===inferCategory(q))||'All') : 'All',q);
    },320);
  }
  window.searchAll=function(){
    const q=(document.getElementById('search')?.value||'').trim();
    if(q){
      if(typeof window.go==='function')window.go('explore');
      const ex=document.getElementById('exploreSearch');if(ex)ex.value=q;
      runLiveSearch(q);
    }
  };
  document.addEventListener('input',e=>{
    if(e.target?.id==='exploreSearch')runLiveSearch(e.target.value);
  },true);
  document.addEventListener('keydown',e=>{
    if((e.key==='Enter'||e.key==='NumpadEnter')&&(e.target?.id==='search'||e.target?.id==='exploreSearch')){
      e.preventDefault();
      const q=e.target.value.trim();
      if(e.target.id==='search')window.searchAll();
      else runLiveSearch(q);
    }
  });

  window.renderHome=buildHome;
  window.renderExplore=buildExplore;


  setTimeout(()=>{buildHome().catch(()=>{});},350);
})();


/* ===== LIVE GPS MAP + SAFE IMPHI DRAG + LOCAL VOICES ===== */
(() => {
  'use strict';
  let liveMap=null, homeMap=null, userMarker=null, homeUserMarker=null, accuracyCircle=null, watchId=null, lastPos=null, lastFetch=0, nearbyBusy=false;
  const byId=id=>document.getElementById(id);
  const escMap=s=>String(s??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const setStatus=s=>{const a=byId('icMapStatus'),b=byId('icHomeMapStatus');if(a)a.textContent=s;if(b)b.textContent=s};
  const dist=(a,b,c,d)=>{const R=6371000,r=x=>x*Math.PI/180,p1=r(a),p2=r(c),dp=r(c-a),dl=r(d-b),x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(x)))};
  const gpsIcon=()=>L.divIcon({className:'',html:'<div class="ic-gps-pulse"></div>',iconSize:[18,18],iconAnchor:[9,9]});
  function makeMap(el,zoom){if(!el||!window.L)return null;const m=L.map(el,{zoomControl:true,preferCanvas:true,scrollWheelZoom:true}).setView([24.8170,93.9368],zoom);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(m);return m}
  function ensureLive(){const el=byId('icLiveMap');if(!el||!window.L)return null;if(!liveMap)liveMap=makeMap(el,13);setTimeout(()=>liveMap?.invalidateSize(),80);return liveMap}
  function ensureHome(){const el=byId('icHomeLiveMap');if(!el||!window.L)return null;if(!homeMap)homeMap=makeMap(el,12);setTimeout(()=>homeMap?.invalidateSize(),80);return homeMap}
  function setMarker(m,pos,home){if(!m)return;const icon=gpsIcon();if(home){if(!homeUserMarker)homeUserMarker=L.marker([pos.lat,pos.lng],{icon,zIndexOffset:10000}).addTo(m);else homeUserMarker.setLatLng([pos.lat,pos.lng]);return}if(!userMarker)userMarker=L.marker([pos.lat,pos.lng],{icon,zIndexOffset:10000}).addTo(m);else userMarker.setLatLng([pos.lat,pos.lng]);if(!accuracyCircle)accuracyCircle=L.circle([pos.lat,pos.lng],{radius:pos.acc,color:'#1976ff',weight:1,fillOpacity:.08}).addTo(m);else accuracyCircle.setLatLng([pos.lat,pos.lng]).setRadius(pos.acc)}
  async function nearby(lat,lng){if(nearbyBusy)return;nearbyBusy=true;try{const q=new URLSearchParams({category:'all',pageSize:'20',lat:String(lat),lng:String(lng),radius:'5000'});const r=await fetch('/api/discovery/google?'+q,{cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Live places unavailable');const places=d.places||[];lastFetch=Date.now();const strip=byId('icNearbyStrip');if(strip){strip.innerHTML=places.map(p=>{const photo=p.photos?.[0],src=photo?.name?'/api/discovery/google-photo?'+new URLSearchParams({name:photo.name,w:'520',h:'360'}):'';const img=src?'<div class="ic-nearby-photo"><img src="'+escMap(src)+'" alt="'+escMap(p.name)+'" loading="lazy" onerror="this.style.display=&quot;none&quot;"></div>':'';const open=p.openNow===true?'OPEN NOW':p.openNow===false?'CLOSED':'HOURS —';return '<article class="ic-nearby-card">'+img+'<b>'+escMap(p.name)+'</b><small>'+escMap(p.type||'Local business')+'</small><small class="'+(p.openNow===true?'live-open':p.openNow===false?'live-closed':'')+'">'+open+(p.rating!=null?' · ★ '+Number(p.rating).toFixed(1):'')+'</small><a href="'+escMap(p.mapsUrl||'#')+'" target="_blank" rel="noopener">Open in Google Maps →</a><span class="ic-nearby-google">Google Maps</span></article>'}).join('')||'<div class="ic-voice-loading">No live places returned. Tap Refresh nearby.</div>'}const count=byId('icNearbyCount');if(count)count.textContent=places.length+' live places found nearby';setStatus(lastPos?'GPS LIVE · Nearby places refreshed':'Live Imphal places · tap Locate me for your position')}catch(e){setStatus(lastPos?'GPS LIVE · Nearby refresh failed':'Map ready · live places temporarily unavailable')}finally{nearbyBusy=false}}
  function update(pos,center){const lat=pos.coords.latitude,lng=pos.coords.longitude,acc=Math.max(5,pos.coords.accuracy||50),moved=!lastPos||dist(lastPos.lat,lastPos.lng,lat,lng)>150;lastPos={lat,lng,acc};const lm=ensureLive(),hm=ensureHome();setMarker(lm,lastPos,false);setMarker(hm,lastPos,true);if(center&&lm)lm.setView([lat,lng],16,{animate:true});if(center&&hm)hm.setView([lat,lng],14,{animate:true});setStatus('GPS LIVE · Current position · ±'+Math.round(acc)+'m');if(moved||Date.now()-lastFetch>45000)nearby(lat,lng)}
  function gpsError(err){const c=err?.code;setStatus(c===1?'Location blocked. Allow Location for Chrome, then reload.':c===2?'No GPS fix. Turn on phone Location and try again near a window.':'GPS timed out. Tap Locate me again.')}
  function locate(){ensureLive();ensureHome();if(!navigator.geolocation){setStatus('This browser does not support device location.');return}setStatus('Finding your current position…');navigator.geolocation.getCurrentPosition(p=>update(p,true),gpsError,{enableHighAccuracy:true,timeout:20000,maximumAge:0});if(watchId===null)watchId=navigator.geolocation.watchPosition(p=>update(p,false),gpsError,{enableHighAccuracy:true,timeout:20000,maximumAge:3000})}
  function refresh(){ensureLive();ensureHome();if(lastPos)nearby(lastPos.lat,lastPos.lng);else nearby(24.8170,93.9368)}
  window.initImphalLiveMap=()=>{ensureLive();ensureHome();if(lastPos)update({coords:{latitude:lastPos.lat,longitude:lastPos.lng,accuracy:lastPos.acc}},false)};
  window.locateImphal=locate;window.refreshImphalMap=refresh;
  document.addEventListener('click',e=>{if(e.target.closest('#icLocateMe'))locate();if(e.target.closest('#icRefreshMap'))refresh();if(e.target.closest('#map')&&liveMap)setTimeout(()=>liveMap.invalidateSize(),120)});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){liveMap?.invalidateSize();homeMap?.invalidateSize()}});
  setTimeout(()=>{ensureHome();ensureLive();nearby(24.8170,93.9368)},600);

  // One and only one Imphi drag controller. The mascot is always clamped to the visible viewport.
  const fab=byId('aiFab');
  if(fab&&!fab.dataset.safeDrag){
    fab.dataset.safeDrag='1';fab.style.position='fixed';fab.style.left='0px';fab.style.top='0px';fab.style.right='auto';fab.style.bottom='auto';fab.style.touchAction='none';fab.style.userSelect='none';fab.style.webkitUserSelect='none';fab.style.cursor='grab';fab.style.willChange='transform';fab.style.animation='none';
    let x=innerWidth-fab.offsetWidth-18,y=innerHeight-fab.offsetHeight-92,dx=0,dy=0,drag=null,raf=0;
    try{const s=JSON.parse(localStorage.getItem('ic_imphi_position')||'null');if(s&&Number.isFinite(+s.x)&&Number.isFinite(+s.y)){x=+s.x;y=+s.y}}catch{}
    const clamp=()=>{const maxX=Math.max(4,innerWidth-fab.offsetWidth-4),maxY=Math.max(4,innerHeight-fab.offsetHeight-4);x=Math.max(4,Math.min(maxX,x));y=Math.max(4,Math.min(maxY,y))};
    const paint=()=>{raf=0;clamp();fab.style.transform='translate3d('+x+'px,'+y+'px,0)'};
    clamp();paint();
    fab.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;const r=fab.getBoundingClientRect();dx=e.clientX-r.left;dy=e.clientY-r.top;drag={id:e.pointerId,lastX:r.left,lastY:r.top,moved:false};try{fab.setPointerCapture(e.pointerId)}catch{}fab.style.cursor='grabbing';e.preventDefault()},{passive:false});
    fab.addEventListener('pointermove',e=>{if(!drag)return;x=e.clientX-dx;y=e.clientY-dy;if(Math.abs(x-drag.lastX)>1||Math.abs(y-drag.lastY)>1)drag.moved=true;drag.lastX=x;drag.lastY=y;cancelAnimationFrame(raf);raf=requestAnimationFrame(paint);e.preventDefault()},{passive:false});
    const end=e=>{if(!drag)return;cancelAnimationFrame(raf);paint();fab.style.cursor='grab';fab.dataset.wasDragged=drag.moved?'1':'0';try{localStorage.setItem('ic_imphi_position',JSON.stringify({x,y}))}catch{}try{fab.releasePointerCapture(e.pointerId)}catch{}drag=null};
    fab.addEventListener('pointerup',end);fab.addEventListener('pointercancel',end);fab.addEventListener('lostpointercapture',()=>{if(drag)end({pointerId:drag.id})});fab.addEventListener('click',e=>{if(fab.dataset.wasDragged==='1'){e.preventDefault();e.stopImmediatePropagation();fab.dataset.wasDragged='0'}},true);addEventListener('resize',()=>{clamp();paint();try{localStorage.setItem('ic_imphi_position',JSON.stringify({x,y}))}catch{}});
  }

  async function loadLocalVoices(){
    const host=byId('icLocalVoices');if(!host)return;
    try{
      const r=await fetch('/api/discovery/google?category=all&pageSize=8',{cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(d.error||'Live reviews unavailable');
      const places=(d.places||[]).filter(p=>p.placeId).slice(0,5);
      const details=await Promise.all(places.map(async p=>{try{const rr=await fetch('/api/discovery/google/'+encodeURIComponent(p.placeId),{cache:'no-store'}),dd=await rr.json();return rr.ok?dd.place:null}catch{return null}}));
      const reviews=[];details.filter(Boolean).forEach(p=>(p.reviews||[]).slice(0,1).forEach(rv=>reviews.push({...rv,placeName:p.name,placeMaps:p.mapsUrl||'#'})));
      if(!reviews.length){host.innerHTML='<div class="ic-voice-loading">No public reviews were returned right now. Real local voices will appear as Google returns them.</div>';return}
      host.innerHTML=reviews.slice(0,5).map(rv=>{const a=rv.authorAttribution||{},avatar=a.photoUri?'<img class="ic-voice-avatar" src="'+escMap(a.photoUri)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<div class="ic-voice-avatar"></div>',stars='★'.repeat(Math.max(0,Math.min(5,Math.round(rv.rating||0))));return '<article class="ic-voice"><div class="ic-voice-top">'+avatar+'<div><div class="ic-voice-author">'+escMap(a.displayName||'Google user')+'</div><div class="ic-voice-place">'+escMap(rv.placeName||'Imphal business')+'</div></div><div class="ic-voice-stars">'+stars+'</div></div><div class="ic-voice-text">“'+escMap(rv.text||'')+'”</div><div class="ic-voice-foot"><span>'+escMap(rv.relativePublishTimeDescription||'Google review')+'</span><a href="'+escMap(rv.googleMapsUri||rv.placeMaps||'#')+'" target="_blank" rel="noopener">Read on Google Maps ↗</a></div></article>'}).join('');
    }catch(e){host.innerHTML='<div class="ic-voice-loading">Live local voices are temporarily unavailable.</div>'}
  }
  setTimeout(loadLocalVoices,1400);
})();