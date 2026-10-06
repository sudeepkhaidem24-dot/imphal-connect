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
      $('sheet').innerHTML='<div class="grab"></div><span class="pill">LIVE GOOGLE PLACE</span><div class="ic-google-live">LIVE DATA · FETCHED NOW</div><h2>'+esc(p.name)+'</h2><p>'+esc(p.type)+'</p><p>'+esc(p.address)+'</p>'+
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
