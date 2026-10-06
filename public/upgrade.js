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

/* ===== GOOGLE PLACES LIVE DISCOVERY ===== */
(() => {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const categoryMap = {
    'All':'all','Food & Dining':'food','Shopping':'shopping','Services':'services',
    'Stay & Tourism':'hotels','Health & Wellness':'health','Events':'all',
    'Automotive':'automotive','Handloom & Crafts':'handloom','Education':'education',
    'Other':'all','Restaurants':'restaurants','Cafes':'cafes','Groceries':'groceries',
    'Fashion':'fashion','Electronics':'electronics','Pharmacies':'pharmacies',
    'Gyms':'gyms','Salons':'salons','Books':'books','Hotels':'hotels','Banks':'banks'
  };
  const titleCase = s => String(s||'local business').replace(/_/g,' ').replace(/\\b\\w/g,m=>m.toUpperCase());
  const localTime = iso => { try{return new Date(iso).toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'});}catch{return '';} };

  const css = document.createElement('style');
  css.textContent = `
    .ic-google-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .ic-google-photo{position:relative;height:150px;border-radius:16px;overflow:hidden;background:#eaf3f7;margin:-2px 0 2px}.ic-google-photo img{width:100%;height:100%;display:block;object-fit:cover}.ic-google-photo-meta{position:absolute;left:8px;bottom:7px;right:8px;display:flex;justify-content:space-between;gap:8px;align-items:center;font:800 8px Manrope;color:#fff;text-shadow:0 1px 3px #000;background:linear-gradient(transparent,rgba(0,0,0,.55));padding-top:20px}.ic-google-photo-meta a{color:#fff;text-decoration:underline}.ic-google-photo-empty{display:none}
    .ic-google-card{background:rgba(255,255,255,.96);border:1px solid #dceef5;border-radius:22px;padding:16px;box-shadow:0 14px 34px rgba(7,54,93,.08);display:flex;flex-direction:column;gap:9px}
    .ic-google-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
    .ic-google-name{font:900 15px/1.2 Manrope;color:#07365d;margin:0}
    .ic-google-type{font-size:10px;color:#6d8492;text-transform:uppercase;letter-spacing:.08em;font-weight:800;margin-top:4px}
    .ic-google-status{font-size:9px;font-weight:900;border-radius:999px;padding:6px 8px;white-space:nowrap}
    .ic-google-open{background:#e8f8ef;color:#087b4f}.ic-google-closed{background:#fff0f0;color:#b54242}.ic-google-unknown{background:#eef5f8;color:#6d8492}
    .ic-google-address{font-size:11px;line-height:1.45;color:#526f80}
    .ic-google-rating{display:flex;gap:7px;align-items:center;font-size:11px;color:#274d62}.ic-google-star{font-size:14px}
    .ic-google-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:auto}
    .ic-google-actions a,.ic-google-actions button{border:0;border-radius:12px;padding:9px 11px;font:800 10px Manrope;text-decoration:none;cursor:pointer;background:#eef7fb;color:#0879d1}
    .ic-google-actions .primary{background:#0879d1;color:white}
    .ic-google-attribution{font:400 10px Roboto,Arial,sans-serif;color:#5e5e5e;white-space:nowrap;margin-top:2px}
    .ic-google-live{display:inline-flex;align-items:center;gap:5px;font-size:9px;font-weight:900;color:#0879d1;letter-spacing:.08em;text-transform:uppercase}
    .ic-google-live:before{content:"";width:6px;height:6px;border-radius:50%;background:#14a66a;box-shadow:0 0 0 4px rgba(20,166,106,.12)}
    .ic-google-error{grid-column:1/-1;background:#fff6f6;border:1px solid #f2d4d4;color:#8b4b4b;border-radius:18px;padding:18px}
    @media(max-width:760px){.ic-google-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(css);

  async function getPlaces({q='',category='all',pages=1,openNow=false}={}){
    const all=[]; let pageToken='';
    for(let page=0;page<pages;page++){
      const p=new URLSearchParams({category,pageSize:'20'});
      if(q)p.set('q',q);
      if(openNow)p.set('openNow','true');
      if(pageToken)p.set('pageToken',pageToken);
      const r=await fetch('/api/discovery/google?'+p.toString(),{cache:'no-store'});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||'Live Google discovery is unavailable');
      all.push(...(d.places||[])); pageToken=d.nextPageToken||'';
      if(!pageToken)break;
    }
    const seen=new Set();
    return all.filter(p=>p.placeId&&!seen.has(p.placeId)&&seen.add(p.placeId));
  }

  function card(p){
    const status=p.openNow===true?'<span class="ic-google-status ic-google-open">OPEN NOW</span>':p.openNow===false?'<span class="ic-google-status ic-google-closed">CLOSED</span>':'<span class="ic-google-status ic-google-unknown">HOURS UNKNOWN</span>';
    const close=p.openNow&&p.nextCloseTime?'<span>· closes '+esc(localTime(p.nextCloseTime))+'</span>':'';
    const rating=p.rating!=null?'<div class="ic-google-rating"><span class="ic-google-star">★</span><b>'+esc(Number(p.rating).toFixed(1))+'</b><span>('+esc(Number(p.reviewCount||0).toLocaleString('en-IN'))+' Google reviews)</span></div>':'<div class="ic-google-rating">No Google rating yet</div>';
    const maps=p.mapsUrl||('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([p.name,p.address].filter(Boolean).join(', ')));
    const phone=p.phone?'<a href="tel:'+esc(p.phone)+'">Call</a>':'';
    return '<article class="ic-google-card">'+
      photoMarkup(p)+
      '<div class="ic-google-live">LIVE GOOGLE DATA</div>'+
      '<div class="ic-google-top"><div><h3 class="ic-google-name">'+esc(p.name)+'</h3><div class="ic-google-type">'+esc(titleCase(p.type))+'</div></div>'+status+'</div>'+
      '<div class="ic-google-address">'+esc(p.address||'Imphal, Manipur')+'</div>'+
      rating+
      '<div class="ic-google-address">'+(p.openNow===true?'Open now ':p.openNow===false?'Closed now ':'')+close+'</div>'+
      '<div class="ic-google-actions"><a class="primary" href="'+esc(maps)+'" target="_blank" rel="noopener">Directions</a>'+phone+(p.website?'<a href="'+esc(p.website)+'" target="_blank" rel="noopener">Website</a>':'')+'</div>'+
      '<div class="ic-google-attribution" translate="no">Google Maps</div>'+
    '</article>';
  }

  window.loadLiveBusinesses = async function(q='',category='All'){
    try{
      return await getPlaces({q,category:categoryMap[category]||'all',pages:1});
    }catch(e){
      console.warn('Google live discovery:',e.message);
      return [];
    }
  };

  async function renderGoogle(targetId,{q='',category='All',pages=2}={}){
    const el=document.getElementById(targetId); if(!el)return;
    el.innerHTML='<div class="ic-live-empty"><b>Finding live businesses in Imphal…</b>Checking Google Places for current listings, ratings and opening status.</div>';
    try{
      const places=await getPlaces({q,category:categoryMap[category]||'all',pages});
      el.innerHTML=places.length?'<div class="ic-google-grid">'+places.map(card).join('')+'</div>':'<div class="ic-live-empty"><b>No matching live places found.</b>Try a different search or category.</div>';
    }catch(e){
      el.innerHTML='<div class="ic-google-error"><b>Live discovery is temporarily unavailable.</b><br>'+esc(e.message)+'</div>';
    }
  }

  window.renderHome = async function(){
    await renderGoogle('homeCards',{category:'All',pages:1});
  };
  window.renderExplore = async function(){
    const q=(document.getElementById('exploreSearch')?.value||'').trim();
    const cat=window.exploreCat||'All';
    await renderGoogle('exploreCards',{q,category:cat,pages:2});
    const empty=document.getElementById('exploreEmpty'); if(empty)empty.classList.add('hidden');
  };

  window.openGooglePlaceProfile = async function(placeId){
    openCustom('<div class="grab"></div><span class="pill">LIVE GOOGLE PLACE</span><h2>Loading…</h2><p>Fetching current place details.</p>');
    try{
      const r=await fetch('/api/discovery/google/'+encodeURIComponent(placeId),{cache:'no-store'});
      const d=await r.json(); if(!r.ok)throw new Error(d.error||'Place details unavailable');
      const p=d.place||{};
      const maps=p.mapsUrl||'#';
      const hours=p.hours?.length?'<h3 style="margin-top:16px">Hours</h3><div class="ic-google-address">'+p.hours.map(esc).join('<br>')+'</div>':'';
      $('sheet').innerHTML='<div class="grab"></div><span class="pill">LIVE GOOGLE PLACE</span><div class="ic-google-live">LIVE DATA · FETCHED NOW</div>'+photoMarkup(p,true)+'<h2>'+esc(p.name)+'</h2><p>'+esc(p.type)+'</p><p>'+esc(p.address)+'</p>'+
        (p.rating!=null?'<div class="ic-google-rating"><span class="ic-google-star">★</span><b>'+Number(p.rating).toFixed(1)+'</b><span>('+Number(p.reviewCount||0).toLocaleString('en-IN')+' Google reviews)</span></div>':'')+
        '<p>'+(p.openNow===true?'🟢 Open now':p.openNow===false?'🔴 Closed now':'⚪ Opening status unavailable')+'</p>'+hours+
        '<div class="ic-prod-actions"><button class="ic-prod-primary" onclick="window.open('+JSON.stringify(maps)+',\'_blank\')">Open in Google Maps</button>'+(p.phone?'<button class="ic-prod-secondary" onclick="location.href='+JSON.stringify('tel:'+p.phone)+'">Call</button>':'')+'</div>'+
        '<div class="ic-google-attribution" translate="no">Google Maps</div>';
    }catch(e){$('sheet').innerHTML='<div class="grab"></div><span class="pill">UNAVAILABLE</span><h2>Place details unavailable</h2><p>'+esc(e.message)+'</p>'}
  };

  // Make live cards clickable without storing Google place content.
  document.addEventListener('click',e=>{
    const a=e.target.closest('.ic-google-card'); if(!a)return;
  },{passive:true});

  setTimeout(()=>{ if(typeof window.renderHome==='function')window.renderHome(); },150);
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
    return '<div class="ic-google-photo"><img src="'+esc(src)+'" alt="'+esc((p.name||'Business')+' photo')+'" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest(\'.ic-google-photo\').remove()"><div class="ic-google-photo-meta"><span>REAL PLACE PHOTO</span><span>'+attribution+'</span></div></div>';
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

  async function query(cat,q='',pages=1){
    const all=[];let token='';
    const inferred=inferCategory(q);
    const effectiveCat=(cat==='All'&&inferred!=='all')?Object.keys(categoryMap).find(k=>categoryMap[k]===inferred)||cat:cat;
    for(let i=0;i<pages;i++){
      const p=new URLSearchParams({category:categoryMap[effectiveCat]||'all',pageSize:'20'});
      if(q)p.set('q',q);if(token)p.set('pageToken',token);
      const r=await fetch('/api/discovery/google?'+p,{cache:'no-store'});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||'Live discovery unavailable');
      all.push(...(d.places||[]));token=d.nextPageToken||'';if(!token)break;
    }
    const seen=new Set();return all.filter(x=>x.placeId&&!seen.has(x.placeId)&&seen.add(x.placeId));
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
      const places=await query(cat,q,2);
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
      const cats=['Cafes','Restaurants','Shopping','Services','Clinics','Gyms','Books'];
      const results=await Promise.all(cats.map(c=>query(c,'',1).catch(()=>[])));
      const mixed=[];const seen=new Set();let round=0;
      while(mixed.length<24&&round<20){
        let added=false;
        for(const arr of results){
          if(arr[round]&&!seen.has(arr[round].placeId)){mixed.push(arr[round]);seen.add(arr[round].placeId);added=true;}
          if(mixed.length>=24)break;
        }
        if(!added)break;round++;
      }
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


  // Make Imphi AI freely movable. Position is saved locally and clamped to the viewport.
  (() => {
    const fab=document.getElementById('aiFab');
    if(!fab||fab.dataset.draggableReady)return;
    fab.dataset.draggableReady='1';
    fab.classList.add('ic-imphi-draggable');
    const saved=(()=>{try{return JSON.parse(localStorage.getItem('ic_imphi_position')||'null')}catch{return null}})();
    function apply(pos){
      if(!pos)return;
      fab.style.left=Math.max(6,Math.min(window.innerWidth-fab.offsetWidth-6,pos.x))+'px';
      fab.style.top=Math.max(6,Math.min(window.innerHeight-fab.offsetHeight-6,pos.y))+'px';
      fab.style.right='auto';fab.style.bottom='auto';
    }
    const initial=saved||{x:Math.max(6,window.innerWidth-fab.offsetWidth-24),y:Math.max(6,window.innerHeight-fab.offsetHeight-90)};
    fab.style.position='fixed';fab.style.zIndex='9999';apply(initial);
    let drag=null, moved=false;
    fab.addEventListener('pointerdown',e=>{
      if(e.button!==undefined&&e.button!==0)return;
      const r=fab.getBoundingClientRect();
      drag={sx:e.clientX,sy:e.clientY,x:r.left,y:r.top,pointerId:e.pointerId};moved=false;
      try{fab.setPointerCapture(e.pointerId)}catch{}
    });
    fab.addEventListener('pointermove',e=>{
      if(!drag)return;
      const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;
      if(Math.abs(dx)+Math.abs(dy)>6)moved=true;
      if(!moved)return;
      apply({x:drag.x+dx,y:drag.y+dy});
    });
    fab.addEventListener('pointerup',e=>{
      if(!drag)return;
      const r=fab.getBoundingClientRect();
      if(moved)try{localStorage.setItem('ic_imphi_position',JSON.stringify({x:r.left,y:r.top}))}catch{}
      drag=null;
    });
    fab.addEventListener('click',e=>{
      if(moved){e.preventDefault();e.stopImmediatePropagation();moved=false;}
    },true);
    window.addEventListener('resize',()=>{const r=fab.getBoundingClientRect();apply({x:r.left,y:r.top})});
  })();

  setTimeout(()=>{buildHome().catch(()=>{});},350);
})();


/* ===== LIVE GPS MAP + ULTRA-FAST IMPHI DRAG ===== */
(() => {
  let liveMap=null, userMarker=null, accuracyCircle=null, placeLayer=null, watchId=null, lastPos=null, lastFetch=0;
  const byId=id=>document.getElementById(id);
  const escMap=s=>String(s??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const setMapStatus=s=>{const el=byId('icMapStatus');if(el)el.textContent=s};
  const distance=(a,b,c,d)=>{const R=6371000,rad=x=>x*Math.PI/180,p1=rad(a),p2=rad(c),dp=rad(c-a),dl=rad(d-b),x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(x)))};
  const gpsIcon=()=>L.divIcon({className:'',html:'<div class="ic-gps-dot"></div>',iconSize:[18,18],iconAnchor:[9,9]});

  async function nearby(lat,lng,fit){
    try{
      const q=new URLSearchParams({category:'all',pageSize:'20',lat:String(lat),lng:String(lng),radius:'5000'});
      const r=await fetch('/api/discovery/google?'+q.toString(),{cache:'no-store'});
      const d=await r.json().catch(()=>({})); if(!r.ok)throw new Error(d.error||'Live place data unavailable');
      const places=d.places||[]; lastFetch=Date.now();
      if(placeLayer)placeLayer.clearLayers();
      const strip=byId('icNearbyStrip');if(strip)strip.innerHTML='';
      places.forEach(p=>{
        if(p.latitude==null||p.longitude==null)return;
        const open=p.openNow===true?'OPEN NOW':p.openNow===false?'CLOSED':'HOURS —';
        const popup='<b>'+escMap(p.name)+'</b><br>'+escMap(p.type||'Local business')+(p.rating!=null?'<br>★ '+Number(p.rating).toFixed(1)+' · '+Number(p.reviewCount||0).toLocaleString('en-IN')+' reviews':'')+'<br>'+escMap(p.address||'');
        L.marker([p.latitude,p.longitude]).bindPopup(popup).addTo(placeLayer);
        if(strip){
          const card=document.createElement('article');card.className='ic-nearby-card';
          card.innerHTML='<b>'+escMap(p.name)+'</b><small>'+escMap(p.type||'Local business')+'</small><small class="'+(p.openNow===true?'live-open':p.openNow===false?'live-closed':'')+'">'+open+(p.rating!=null?' · ★ '+Number(p.rating).toFixed(1):'')+'</small>';
          card.onclick=()=>liveMap.setView([p.latitude,p.longitude],17,{animate:true});
          strip.appendChild(card);
        }
      });
      const count=byId('icNearbyCount');if(count)count.textContent=places.length+' live places found nearby';
      if(fit){const pts=places.filter(p=>p.latitude!=null&&p.longitude!=null).map(p=>[p.latitude,p.longitude]);if(pts.length)liveMap.fitBounds(L.latLngBounds(pts),{padding:[30,30],maxZoom:15});}
    }catch(e){setMapStatus('GPS LIVE · Nearby live data temporarily unavailable.')}
  }

  function initLiveMap(){
    const el=byId('icLiveMap');if(!el||!window.L||liveMap)return;
    liveMap=L.map(el,{zoomControl:true,preferCanvas:true}).setView([24.8170,93.9368],13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(liveMap);
    placeLayer=L.layerGroup().addTo(liveMap);
    nearby(24.8170,93.9368,true);
    setTimeout(()=>liveMap.invalidateSize(),150);
  }

  function updatePosition(pos,center){
    const lat=pos.coords.latitude,lng=pos.coords.longitude,acc=Math.max(5,pos.coords.accuracy||50);
    const moved=!lastPos||distance(lastPos.lat,lastPos.lng,lat,lng)>200;
    lastPos={lat,lng,acc};
    if(!userMarker)userMarker=L.marker([lat,lng],{icon:gpsIcon(),zIndexOffset:10000}).addTo(liveMap);
    else userMarker.setLatLng([lat,lng]);
    if(!accuracyCircle)accuracyCircle=L.circle([lat,lng],{radius:acc,color:'#1976ff',weight:1,fillOpacity:.08}).addTo(liveMap);
    else accuracyCircle.setLatLng([lat,lng]).setRadius(acc);
    if(center)liveMap.setView([lat,lng],16,{animate:true});
    setMapStatus('GPS LIVE · Current position · ±'+Math.round(acc)+'m');
    if(moved||Date.now()-lastFetch>60000)nearby(lat,lng,false);
  }

  function locate(){
    if(!navigator.geolocation){setMapStatus('GPS is not supported by this browser.');return}
    setMapStatus('Requesting GPS permission…');
    navigator.geolocation.getCurrentPosition(p=>updatePosition(p,true),()=>setMapStatus('GPS permission denied/unavailable. Enable Location for Imphal Connect.'),{enableHighAccuracy:true,timeout:12000,maximumAge:5000});
    if(watchId===null)watchId=navigator.geolocation.watchPosition(p=>updatePosition(p,false),()=>{}, {enableHighAccuracy:true,timeout:15000,maximumAge:5000});
  }

  function refreshMap(){if(lastPos)nearby(lastPos.lat,lastPos.lng,false);else nearby(24.8170,93.9368,false)}
  document.addEventListener('click',e=>{
    if(e.target.closest('#icLocateMe'))locate();
    if(e.target.closest('#icRefreshMap'))refreshMap();
    if(e.target.closest('#map')&&liveMap)setTimeout(()=>liveMap.invalidateSize(),180);
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&liveMap){liveMap.invalidateSize();refreshMap()}});
  window.initImphalLiveMap=initLiveMap;
  setTimeout(initLiveMap,700);

  const fab=byId('aiFab');
  if(fab&&!fab.dataset.ultraDrag){
    fab.dataset.ultraDrag='1';
    fab.style.position='fixed';fab.style.left='0px';fab.style.top='0px';fab.style.right='auto';fab.style.bottom='auto';
    fab.style.touchAction='none';fab.style.userSelect='none';fab.style.webkitUserSelect='none';fab.style.cursor='grab';fab.style.willChange='transform';
    let x=0,y=0,dx=0,dy=0,startX=0,startY=0,drag=null,raf=0;
    try{const s=JSON.parse(localStorage.getItem('ic_imphi_position')||'null');if(s){x=Number(s.x)||0;y=Number(s.y)||0}}catch{}
    const clamp=()=>{x=Math.max(4,Math.min(innerWidth-fab.offsetWidth-4,x));y=Math.max(4,Math.min(innerHeight-fab.offsetHeight-4,y))};
    const paint=()=>{raf=0;fab.style.transform='translate3d('+x+'px,'+y+'px,0)'};
    clamp();paint();
    fab.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse'&&e.button!==0)return;
      const r=fab.getBoundingClientRect();dx=e.clientX-r.left;dy=e.clientY-r.top;startX=r.left;startY=r.top;drag={id:e.pointerId,moved:false};
      try{fab.setPointerCapture(e.pointerId)}catch{};fab.style.cursor='grabbing';e.preventDefault();
    },{passive:false});
    fab.addEventListener('pointermove',e=>{
      if(!drag)return;
      x=e.clientX-dx;y=e.clientY-dy;
      if(Math.abs(e.clientX-startX)>3||Math.abs(e.clientY-startY)>3)drag.moved=true;
      clamp();cancelAnimationFrame(raf);raf=requestAnimationFrame(paint);e.preventDefault();
    },{passive:false});
    const end=e=>{
      if(!drag)return;cancelAnimationFrame(raf);clamp();paint();fab.style.cursor='grab';
      fab.dataset.wasDragged=drag.moved?'1':'0';
      try{localStorage.setItem('ic_imphi_position',JSON.stringify({x,y}))}catch{}
      drag=null;
    };
    fab.addEventListener('pointerup',end);fab.addEventListener('pointercancel',end);
    fab.addEventListener('click',e=>{if(fab.dataset.wasDragged==='1'){e.preventDefault();e.stopImmediatePropagation();fab.dataset.wasDragged='0'}},true);
    addEventListener('resize',()=>{clamp();paint()});
  }
})();
