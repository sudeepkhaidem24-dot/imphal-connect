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

/* ===== ONE-TIME LOCAL IMphal CATALOG DISCOVERY ===== */
(() => {
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const categoryMap={
    All:'all',Resorts:'resorts',Hotels:'hotels',Cafes:'cafes',Restaurants:'restaurants',Books:'books',Shopping:'shopping',Hardware:'hardware',
    Clinics:'clinics',Hospitals:'hospitals',Pharmacies:'pharmacies',Gyms:'gyms',Salons:'salons',Electronics:'electronics',
    Fashion:'fashion',Hotels:'hotels',Education:'education',Automotive:'automotive',Services:'services',Banks:'banks',
    Groceries:'groceries',Handloom:'handloom',Tourism:'tourism'
  };
  let catalog=null,catalogPromise=null,homeOffset=0,homeTimer=null;
  const aliases={'cafe':'cafes','cafes':'cafes','café':'cafes','coffee':'cafes','coffee shop':'cafes','restaurant':'restaurants','restaurants':'restaurants',
    'book':'books','books':'books','bookstore':'books','hardware':'hardware','hospital':'hospitals','hospitals':'hospitals','clinic':'clinics','clinics':'clinics',
    'pharmacy':'pharmacies','pharmacies':'pharmacies','gym':'gyms','gyms':'gyms','salon':'salons','salons':'salons','electronics':'electronics',
    'fashion':'fashion','school':'education','college':'education','tutor':'education','coaching':'education','hotel':'hotels','hotels':'hotels',
    'bank':'banks','banks':'banks','grocery':'groceries','groceries':'groceries','car repair':'automotive','automotive':'automotive','handloom':'handloom'};
  function infer(q){return aliases[String(q||'').trim().toLowerCase()]||'all'}
  function distance(a,b,c,d){if(!Number.isFinite(a)||!Number.isFinite(b)||!Number.isFinite(c)||!Number.isFinite(d))return 999;const R=6371,r=Math.PI/180,x=(c-a)*r,y=(d-b)*r,h=Math.sin(y/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(x/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
  function status(p){return p.openStatus==='open'?'<span class="ic-google-status ic-google-open">OPEN</span>':p.openStatus==='closed'?'<span class="ic-google-status ic-google-closed">CLOSED</span>':'<span class="ic-google-status ic-google-unknown">HOURS —</span>'}
  function card(p){
    const id=esc(p.placeId),map=esc(p.mapsUrl||'#'),phone=p.phone?'<a href="tel:'+esc(p.phone)+'">Call</a>':'';
    return '<article class="ic-google-card ic-catalog-card" data-catalog-id="'+id+'"><div class="ic-catalog-photo" style="background-image:url(\''+esc(p.coverUrl||p.logoUrl||'')+'\')"></div><div class="ic-google-live">IMPHAL LOCAL CATALOG</div><div class="ic-google-top"><div><h3 class="ic-google-name">'+esc(p.name)+'</h3><div class="ic-google-type">'+esc(p.category||p.type||'Local business')+'</div></div>'+status(p)+'</div><div class="ic-google-address">'+esc(p.address||'Imphal, Manipur')+'</div><div class="ic-catalog-hours">'+esc(p.hoursLabel||'Hours not listed')+(p.openingHours?' · '+esc(p.openingHours):'')+'</div><div class="ic-google-actions"><a class="primary" href="'+map+'" target="_blank" rel="noopener">Directions</a>'+phone+'</div></article>';
  }
  const style=document.createElement('style');
  style.textContent='.ic-catalog-photo{height:150px;border-radius:20px 20px 0 0;background:#e8f5f8 center/cover no-repeat}.ic-catalog-card{overflow:hidden}.ic-catalog-hours{font-size:9px;color:#5d7584;line-height:1.45;margin:7px 0 10px}.ic-catalog-attrib{font-size:8px;color:#7b909b;margin:7px 0}.ic-search-count{font-size:9px;color:#718793;font-weight:800;margin:7px 0}.ic-feature-card{cursor:pointer}.ic-feature-card:active{transform:scale(.98)}';
  document.head.appendChild(style);
  async function loadCatalog(){
    if(catalog)return catalog;
    if(catalogPromise)return catalogPromise;
    catalogPromise=fetch('/api/discovery/catalog',{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('Local catalog unavailable');return r.json()}).then(d=>{if(!d.ok)throw new Error(d.error||'Local catalog unavailable');catalog=d;window.__IC_LOCAL_CATALOG__=d;return d}).finally(()=>catalogPromise=null);
    return catalogPromise;
  }
  function pick(list,n,offset=0){if(!list.length)return [];const out=[];for(let i=0;i<Math.min(n,list.length);i++)out.push(list[(offset+i)%list.length]);return out}
  function mixed(list){
    const arr=list.slice();for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr;
  }
  function renderCards(target,rows,limit=24){
    const el=document.getElementById(target);if(!el)return;
    const shown=rows.slice(0,limit);
    el.innerHTML=shown.length?shown.map(card).join(''):'<div class="ic-live-empty"><b>No matching Imphal listings.</b><br>Try another name, category or landmark.</div>';
    const count=document.getElementById(target+'Count');if(count)count.textContent=rows.length.toLocaleString('en-IN')+' listings in the catalog';
  }
  async function buildHome(){
    const target=document.getElementById('homeCards');if(!target)return;
    try{
      const d=await loadCatalog(),rows=mixed(d.places||[]),visible=pick(rows,12,homeOffset);
      target.innerHTML=visible.map(card).join('');
      const count=document.getElementById('homeCatalogCount');if(count)count.textContent='One-time catalog · '+(d.total||d.places.length).toLocaleString('en-IN')+' Imphal listings';
      if(!homeTimer){homeTimer=setInterval(()=>{homeOffset=(homeOffset+8)%Math.max(1,(d.places||[]).length);buildHome().catch(()=>{})},12000)}
    }catch(e){target.innerHTML='<div class="ic-google-error"><b>Local catalog is loading.</b><br>'+esc(e.message)+'</div>'}
  }
  async function renderExplore(){
    const target=document.getElementById('exploreCards');if(!target)return;
    try{
      const d=await loadCatalog(),q=(document.getElementById('exploreSearch')?.value||'').trim().toLowerCase(),cat=String(window.exploreCat||'all').toLowerCase();
      const groupMap={food:['cafes','restaurants','food'],shopping:['shopping','groceries','fashion','electronics','hardware','books','handloom'],services:['services','clinics','hospitals','pharmacies','salons','gyms','education','automotive','banks'],stay:['hotels'],events:['events'],all:null};
      const groups=groupMap[cat];
      const rows=(d.places||[]).filter(p=>{const hay=[p.name,p.type,p.category,p.address,p.city,p.phone].join(' ').toLowerCase();const exact=String(p.category||'').toLowerCase();const categoryOk=!groups||groups.includes(exact)||((cat==='food')&&/(cafe|restaurant|food)/i.test(hay));return (!q||hay.includes(q))&&categoryOk});
      renderCards('exploreCards',rows,80);
      const n=document.getElementById('exploreCatalogMeta');if(n)n.textContent='Stored Imphal catalog · extracted '+new Date(d.extractedAt).toLocaleDateString('en-IN');
    }catch(e){target.innerHTML='<div class="ic-google-error"><b>Search catalog unavailable.</b><br>'+esc(e.message)+'</div>'}
  }
  function openCatalogPlace(id){
    const p=(catalog?.places||[]).find(x=>x.placeId===id);if(!p)return;
    const map=esc(p.mapsUrl||'#');
    if(typeof openCustom==='function')openCustom('<div class="grab"></div><span class="pill">'+esc(p.category||p.type||'LOCAL')+'</span><h2>'+esc(p.name)+'</h2><p>'+esc(p.address||'Imphal, Manipur')+' · '+status(p)+'</p><div class="feature"><div class="feature-img" style="background-image:url(\''+esc(p.coverUrl||p.logoUrl||'')+'\')"></div><div><h3>'+esc(p.hoursLabel||'Hours not listed')+'</h3><p>'+esc(p.openingHours||'Opening hours are not listed in the stored source data.')+'</p></div></div><a class="primary" style="display:block;text-align:center" href="'+map+'" target="_blank" rel="noopener">Open location</a>');
  }
  document.addEventListener('click',e=>{
    const c=e.target.closest('.ic-catalog-card[data-catalog-id]');if(c&&!e.target.closest('a,button'))openCatalogPlace(c.dataset.catalogId);
    const f=e.target.closest('.ic-feature-card[data-feature-cat]');if(f){window.exploreCat=f.dataset.featureCat;go('explore');renderExplore()}
  });
  window.__IC_LOAD_CATALOG__=loadCatalog;
  window.renderHome=buildHome;
  window.renderExplore=renderExplore;
  window.searchAll=function(){
    const source=document.activeElement?.matches?.('#search,#searchAlt')?document.activeElement:null;
    const q=(source?.value||document.getElementById('search')?.value||document.getElementById('searchAlt')?.value||'').trim();
    const ex=document.getElementById('searchPageInput');if(ex)ex.value=q;
    window.exploreCat='all';
    go('searchPage');
    renderSearchPage(q);
  };
  async function renderSearchPage(q=''){
    const host=document.getElementById('searchCards');if(!host)return;
    try{
      const d=await loadCatalog(),term=String(q||'').trim().toLowerCase();
      const rows=(d.places||[]).filter(p=>!term||[p.name,p.type,p.category,p.address,p.city,p.phone].join(' ').toLowerCase().includes(term));
      renderCards('searchCards',rows,100);
      const meta=document.getElementById('searchMeta');if(meta)meta.textContent=term?(rows.length.toLocaleString('en-IN')+' matches · stored Imphal catalog'):(d.total||d.places.length).toLocaleString('en-IN')+' Imphal listings ready to search';
    }catch(e){host.innerHTML='<div class="empty">'+esc(e.message)+'</div>'}
  }
  window.renderSearchPage=renderSearchPage;
  document.addEventListener('input',e=>{
    if(e.target?.id==='exploreSearch')renderExplore();
    if(e.target?.id==='searchPageInput')renderSearchPage(e.target.value);
  },true);
  document.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&(e.target?.id==='searchPageInput'||e.target?.id==='search'||e.target?.id==='searchAlt')){
      e.preventDefault();window.searchAll();
    }
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>buildHome());else buildHome();
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
  async function nearby(lat,lng){
    try{
      const d=await (window.__IC_LOAD_CATALOG__?window.__IC_LOAD_CATALOG__():fetch('/api/discovery/catalog',{cache:'force-cache'}).then(r=>r.json()));
      const places=(d.places||[]).map(p=>({...p,distanceKm:dist(lat,lng,p.latitude,p.longitude)})).filter(p=>p.distanceKm<=5).sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,20);
      const strip=byId('icNearbyStrip');
      if(strip)strip.innerHTML=places.map(p=>'<article class="ic-nearby-card"><b>'+escMap(p.name)+'</b><small>'+escMap(p.category||p.type||'Local business')+'</small><small class="'+(p.openNow===true?'live-open':p.openNow===false?'live-closed':'')+'">'+escMap(p.hoursLabel||'HOURS —')+'</small><a href="'+escMap(p.mapsUrl||'#')+'" target="_blank" rel="noopener">Open location →</a></article>').join('')||'<div class="ic-voice-loading">No stored places found within 5 km.</div>';
      const count=byId('icNearbyCount');if(count)count.textContent=places.length+' stored local places nearby';
      setStatus(lastPos?'GPS LIVE · using stored Imphal catalog':'Imphal catalog · tap Locate me for your position');
    }catch(e){setStatus(lastPos?'GPS LIVE · catalog unavailable':'Local catalog unavailable')}
  }
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
    host.innerHTML=[
      '<article class="ic-voice"><div class="ic-voice-top"><div class="ic-voice-avatar"></div><div><div class="ic-voice-author">Kabi D</div><div class="ic-voice-place">Luxmi Kitchen · Imphal</div></div><div class="ic-voice-stars">★★★★★</div></div><div class="ic-voice-text">“The taste is excellent, portions are good and the service is warm and friendly.”</div><div class="ic-voice-foot"><span>Public review</span><a href="https://wanderlog.com/explore/1013/imphal" target="_blank" rel="noopener">Read source ↗</a></div></article>',
      '<article class="ic-voice"><div class="ic-voice-top"><div class="ic-voice-avatar"></div><div><div class="ic-voice-author">INUNG G</div><div class="ic-voice-place">Asian Bowl · Imphal</div></div><div class="ic-voice-stars">★★★★★</div></div><div class="ic-voice-text">“The foods are yummy, the place is nice to relax and enjoy with friends and family.”</div><div class="ic-voice-foot"><span>Public review</span><a href="https://wanderlog.com/list/geoCategory/465803/best-asian-food-in-imphal" target="_blank" rel="noopener">Read source ↗</a></div></article>',
      '<article class="ic-voice"><div class="ic-voice-top"><div class="ic-voice-avatar"></div><div><div class="ic-voice-author">Prasanth P</div><div class="ic-voice-place">Luxmi Kitchen · Imphal</div></div><div class="ic-voice-stars">★★★★</div></div><div class="ic-voice-text">“A simple place to have authentic Manipuri food. We had lunch from here. It was good.”</div><div class="ic-voice-foot"><span>Public review</span><a href="https://wanderlog.com/explore/1013/imphal" target="_blank" rel="noopener">Read source ↗</a></div></article>'
    ].join('');
  }

})();
/* ===== NAVIGATION + BUSINESS WORKSPACE POLISH ===== */
(() => {
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const baseGo=window.go;
  const stack=['home'];
  const back=document.createElement('button');
  back.id='icBackButton';
  back.type='button';
  back.innerHTML='← <span>Back</span>';
  Object.assign(back.style,{position:'fixed',top:'max(12px,env(safe-area-inset-top))',left:'12px',zIndex:'2147482000',display:'none',alignItems:'center',gap:'5px',border:'1px solid #d5eaf2',background:'#ffffffee',backdropFilter:'blur(14px)',color:'#07365d',borderRadius:'999px',padding:'9px 13px',font:'900 10px Manrope',boxShadow:'0 8px 24px rgba(7,54,93,.12)',cursor:'pointer'});
  document.body.appendChild(back);
  function activeId(){return [...document.querySelectorAll('.view')].find(v=>v.classList.contains('active'))?.id||'home'}
  function updateBack(){const id=activeId();back.style.display=stack.length>1&&id!=='home'?'inline-flex':'none'}
  window.go=function(id){
    if(!$(id))return;
    const cur=activeId();
    if(cur!==id)stack.push(id);
    baseGo(id);
    requestAnimationFrame(updateBack);
  };
  back.onclick=()=>{
    if(stack.length<=1)return;
    stack.pop();
    const id=stack[stack.length-1]||'home';
    baseGo(id);
    updateBack();
  };
  window.addEventListener('popstate',()=>updateBack());
  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-btab]');if(btn)openBusinessTab(btn.dataset.btab,btn);
  });
  window.openBusinessTab=function(tab,btn){
    document.querySelectorAll('[data-btab]').forEach(x=>x.classList.toggle('active',x===btn));
    const host=$('businessWorkspace');if(!host)return;
    const common='<span class="pill">BUSINESS WORKSPACE</span>';
    const views={
      profile:common+'<div><h3>Business profile</h3><p>Set your business name, description, phone, WhatsApp, address, hours and public links.</p><button class="primary" onclick="openSheet(\'business\')">Edit / claim profile</button></div>',
      catalog:common+'<div><h3>Product & service catalog</h3><p>Add products, services, prices, photos and availability. Your catalog will appear on your public listing.</p><button class="primary" onclick="openOwnerStudio()">Open catalog editor</button></div>',
      leads:common+'<div><h3>Leads</h3><p>Customer enquiries, calls and WhatsApp actions will appear here once your business receives them.</p><div class="statbar"><div class="stat"><b id="icLeadCount">0</b><span>New enquiries</span></div><div class="stat"><b id="icCallCount">0</b><span>Contact actions</span></div></div><button class="primary" onclick="toast(\'Lead centre ready\')">Open lead centre</button></div>',
      insights:common+'<div><h3>Insights</h3><p>Track profile views, searches, saves, enquiries and demand by category.</p><div class="statbar"><div class="stat"><b id="icInsightViews">—</b><span>Profile views</span></div><div class="stat"><b id="icInsightSaves">—</b><span>Saves</span></div><div class="stat"><b id="icInsightSearches">—</b><span>Searches</span></div></div><button class="primary" onclick="openSheet(\'dashboard\')">Open insights</button></div>'
    };
    host.innerHTML='<div style="display:grid;gap:9px">'+(views[tab]||views.profile)+'</div>';
  };
  window.addEventListener('load',()=>{updateBack();if($('businessWorkspace'))window.openBusinessTab('profile',document.querySelector('[data-btab="profile"]'))},{once:true});
})();

(() => {
  window.openOwnerStudio=function(){
    if(typeof window.openCustom==='function')window.openCustom('<div class="grab"></div><span class="pill">CATALOG EDITOR</span><h2>Add to your public catalog</h2><p>Create a product or service with a name, price, category and availability.</p><input id="icItemName" placeholder="Product / service name"><input id="icItemPrice" placeholder="Price (₹)"><select id="icItemType"><option>Product</option><option>Service</option><option>Rate</option></select><button class="primary" onclick="toast(\'Catalog item saved locally\');closeSheet()">Save to catalog</button>');
  };
  window.openStoryStudio=function(){
    if(typeof window.openCustom==='function')window.openCustom('<div class="grab"></div><span class="pill">INSTANT STORY</span><h2>Post a business story</h2><p>Share a product, offer, opening update or local moment.</p><textarea id="icStoryText" placeholder="What is happening at your business?"></textarea><button class="primary" onclick="toast(\'Story saved\');closeSheet()">Publish story</button>');
  };
})();
