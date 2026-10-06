/* Imphal Connect — final production interaction, data and QA hardening layer. */
(() => {
  'use strict';
  if (window.__IC_FINAL_LAYER__) return;
  window.__IC_FINAL_LAYER__ = true;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  const css=document.createElement('style');
  css.textContent='.ic-final-shell{display:grid;gap:14px}.ic-final-toolbar{display:flex;gap:8px;overflow:auto;scrollbar-width:none;padding:2px 0 4px}.ic-final-toolbar button{flex:0 0 auto;min-height:40px;padding:10px 13px;border:1px solid #d9ebf3;background:#fff;color:#315b70;border-radius:999px;font:800 10px Manrope}.ic-final-toolbar button.active{background:#07365d;color:#fff;border-color:#07365d}.ic-final-card{background:#fff;border:1px solid #dceef5;border-radius:20px;padding:15px;box-shadow:0 10px 30px rgba(7,54,93,.07)}.ic-final-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.ic-final-field{display:grid;gap:6px}.ic-final-field.full{grid-column:1/-1}.ic-final-field label{font:800 9px Manrope;color:#315b70}.ic-final-field input,.ic-final-field textarea,.ic-final-field select{margin:0;min-height:44px}.ic-final-field textarea{min-height:100px}.ic-final-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.ic-final-actions button,.ic-final-actions a{min-height:42px;padding:11px 14px;border-radius:12px;border:1px solid #d5eaf2;background:#fff;color:#07588e;font:900 10px Manrope;text-decoration:none}.ic-final-actions .primary{background:#07365d;color:#fff;border-color:#07365d}.ic-final-status{padding:11px 13px;border-radius:13px;background:#f7fcfe;border:1px solid #dceef5;color:#5e7888;font-size:10px}.ic-final-status.ok{background:#eefaf4;border-color:#ccebd9;color:#147449}.ic-final-status.err{background:#fff7f7;border-color:#efd1d1;color:#9c4d4d}.ic-final-list{display:grid;gap:9px}.ic-final-row{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:11px 0;border-bottom:1px solid #edf4f7}.ic-final-row:last-child{border-bottom:0}.ic-final-review{padding:12px;border:1px solid #e0eef4;border-radius:14px;background:#fbfeff}@media(max-width:680px){.ic-final-grid{grid-template-columns:1fr}.ic-final-field.full{grid-column:auto}.ic-final-card{border-radius:18px;padding:13px}}';
  document.head.appendChild(css);

  async function token(){try{return window.icSupabase?(await window.icSupabase.auth.getSession()).data.session?.access_token||'':''}catch{return ''}}
  async function api(path,opts={}){
    const t=await token(),headers={'content-type':'application/json',...(opts.headers||{})};
    if(t)headers.Authorization='Bearer '+t;
    const r=await fetch(path,{...opts,headers}),d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d?.error||'That action could not be completed. Please try again.');
    return d;
  }
  async function login(){if(await token())return true;if(window.IC?.openAuth){window.IC.openAuth(true)}else if($('icAuthModal'))$('icAuthModal').hidden=false;throw new Error('Please sign in to continue.')}
  function status(el,msg,kind=''){if(!el)return;el.className='ic-final-status '+kind;el.textContent=msg}
  function modal(html){if(typeof window.openCustom==='function')window.openCustom(html);else{$('sheet').innerHTML=html;$('modal').classList.add('open')}}
  function close(){if(typeof window.closeSheet==='function')window.closeSheet();else if($('modal'))$('modal').classList.remove('open')}
  function maps(p){return p?.mapsUrl||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([p?.name,p?.address,'Imphal','Manipur'].filter(Boolean).join(', '))}
  function directions(p){return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(p?.latitude!=null&&p?.longitude!=null?p.latitude+','+p.longitude:[p?.name,p?.address,'Imphal','Manipur'].filter(Boolean).join(', '))}
  function wa(p){const n=String(p||'').replace(/\D/g,'');return n?'https://wa.me/'+n:''}
  async function catalog(){if(window.__IC_LOCAL_CATALOG__)return window.__IC_LOCAL_CATALOG__;const r=await fetch('/api/discovery/catalog',{cache:'force-cache'}),d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.error||'Local discovery is temporarily unavailable.');window.__IC_LOCAL_CATALOG__=d;return d}

  function card(p){
    const id=esc(p.placeId||''),img=p.coverUrl||p.logoUrl||'',src=p.source==='imphal-connect'?(p.isVerified?'VERIFIED LISTING':'LOCAL LISTING'):p.source==='manipur-tourism'?'MANIPUR TOURISM':'OPENSTREETMAP DATA';
    const open=p.openNow===true?'OPEN NOW':p.openNow===false?'CLOSED':'HOURS UNKNOWN';
    let saved=[];try{saved=JSON.parse(localStorage.getItem('ic_saved_businesses')||'[]')}catch{}
    const sv=saved.includes(p.placeId);
    return '<article class="ic-final-card" data-final-place="'+id+'" tabindex="0" role="button"><div style="height:180px;border-radius:15px;overflow:hidden;background:#edf7fa;display:grid;place-items:center">'+(img?'<img src="'+esc(img)+'" alt="'+esc(p.name)+'" loading="lazy" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover">':'<b style="font:900 30px Manrope;color:#07365d">'+esc((p.name||'I').slice(0,1).toUpperCase())+'</b>')+'</div><div style="display:flex;justify-content:space-between;gap:8px;margin-top:11px"><div><h3 style="margin:0;font:900 15px Manrope;color:#07365d">'+esc(p.name)+'</h3><small style="color:#78909f">'+esc(p.category||p.type||'Local business')+'</small></div><small>'+open+'</small></div><p style="margin:8px 0;color:#5e7888;font-size:9px">'+esc(p.address||'Imphal, Manipur')+'</p><small style="color:#78909f">'+esc(src)+' · '+esc(p.hoursLabel||'Hours not listed')+'</small><div class="ic-final-actions"><a class="primary" href="'+esc(directions(p))+'" target="_blank" rel="noopener">Directions</a><a href="'+esc(maps(p))+'" target="_blank" rel="noopener">Map</a>'+(p.phone?'<a href="tel:'+esc(p.phone)+'">Call</a><a href="'+esc(wa(p.phone))+'" target="_blank" rel="noopener">WhatsApp</a>':'')+'<button type="button" data-final-save="'+id+'">'+(sv?'Saved':'Save')+'</button></div></article>';
  }
  function bind(host){
    host?.querySelectorAll('[data-final-place]').forEach(el=>{const open=()=>{const p=(window.__IC_LOCAL_CATALOG__?.places||[]).find(x=>x.placeId===el.dataset.finalPlace);if(p)profile(p)};el.onclick=e=>{if(e.target.closest('a,button'))return;open()};el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}}});
    host?.querySelectorAll('[data-final-save]').forEach(b=>b.onclick=e=>{e.stopPropagation();let a=[];try{a=JSON.parse(localStorage.getItem('ic_saved_businesses')||'[]')}catch{}const id=b.dataset.finalSave;a=a.includes(id)?a.filter(x=>x!==id):a.concat(id);localStorage.setItem('ic_saved_businesses',JSON.stringify(a));b.textContent=a.includes(id)?'Saved':'Save';window.toast?.(a.includes(id)?'Saved to your places':'Removed from saved')});
  }

  async function profile(p){
    let d={business:null,items:[],offers:[],stories:[],reviews:[],reviewSummary:{average:null,ratingCount:0}};
    if(p.source==='imphal-connect'&&p.placeId){try{const id=p.placeId.replace(/^ic-/,'');const r=await fetch('/api/businesses/'+encodeURIComponent(p.slug||''));if(r.ok)d=await r.json()}catch{}}
    const b=d.business||p,avg=d.reviewSummary?.average;
    const reviews=(d.reviews||[]).slice(0,8).map(r=>'<div class="ic-final-review"><b style="color:#b97809">'+('★'.repeat(Number(r.rating||0)))+('☆'.repeat(5-Number(r.rating||0)))+'</b><div style="font-size:10px;margin-top:4px">'+esc(r.body)+'</div><small style="color:#78909f">'+esc(r.author||'Local customer')+'</small></div>').join('')||'<div class="ic-final-status">No reviews yet.</div>';
    const contact=b.whatsapp||b.phone||'';
    modal('<div class="grab"></div><span class="pill">'+esc(b.category||b.type||'LOCAL BUSINESS')+'</span><h2>'+esc(b.name)+'</h2><p>'+esc(b.address||'Imphal, Manipur')+'</p><div class="ic-final-card" style="box-shadow:none"><b>'+(avg!=null?'★ '+avg:'No rating yet')+'</b> <small>('+Number(d.reviewSummary?.ratingCount||0)+' reviews)</small><p>'+esc(b.description||'Local business listing on Imphal Connect.')+'</p><div class="ic-final-actions"><a class="primary" href="'+esc(directions(b))+'" target="_blank" rel="noopener">Directions</a><a href="'+esc(maps(b))+'" target="_blank" rel="noopener">Map</a>'+(b.phone?'<a href="tel:'+esc(b.phone)+'">Call</a>':'')+(contact?'<a href="'+esc(wa(contact))+'" target="_blank" rel="noopener">WhatsApp</a>':'')+'<button id="icFinalWriteReview">Write review</button></div></div><h3>Reviews</h3><div class="ic-final-list">'+reviews+'</div>'+(d.items?.length?'<h3>Products & services</h3><div class="ic-final-list">'+d.items.slice(0,12).map(i=>'<div class="ic-final-row"><span><b>'+esc(i.name)+'</b><br><small>'+esc(i.description||'')+'</small></span><b>'+(i.price==null?'Ask':'₹'+Number(i.price).toLocaleString('en-IN'))+'</b></div>').join('')+'</div>':'')+(d.offers?.length?'<h3>Active offers</h3><div class="ic-final-list">'+d.offers.map(o=>'<div class="ic-final-row"><span><b>'+esc(o.title)+'</b><br><small>'+esc(o.description||o.discount_text||'')+'</small></span><b>'+esc(o.discount_text||'')+'</b></div>').join('')+'</div>':''));
    const rb=$('icFinalWriteReview');if(rb)rb.onclick=async()=>{try{await login();modal('<div class="grab"></div><span class="pill">LOCAL REVIEW</span><h2>Review '+esc(b.name)+'</h2><div class="ic-final-field"><label>RATING</label><select id="icFinalRating"><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Average</option><option value="2">2 — Poor</option><option value="1">1 — Bad</option></select></div><div class="ic-final-field"><label>REVIEW</label><textarea id="icFinalReviewBody" maxlength="2000"></textarea></div><div id="icFinalReviewStatus" class="ic-final-status">One review per account per business.</div><div class="ic-final-actions"><button class="primary" id="icFinalReviewSave">Publish review</button><button id="icFinalReviewCancel">Cancel</button></div>');$('icFinalReviewCancel').onclick=()=>profile(p);$('icFinalReviewSave').onclick=async()=>{const st=$('icFinalReviewStatus');status(st,'Publishing…');try{await api('/api/reviews',{method:'POST',body:JSON.stringify({business_id:p.placeId.replace(/^ic-/,''),rating:Number($('icFinalRating').value),body:$('icFinalReviewBody').value.trim()})});status(st,'Review published.','ok');await sleep(400);profile(p)}catch(e){status(st,e.message,'err')}}}catch{}};
  }

  async function renderHost(id,title,cat,q){
    const h=$(id);if(!h)return;
    h.innerHTML='<div class="ic-final-shell"><div><h2 style="margin:0;font:900 21px Manrope;color:#07365d">'+esc(title)+'</h2><small style="color:#78909f">Real local catalog · no fabricated listings</small></div><div class="ic-final-toolbar ic-primary-cats" id="'+id+'FinalTabs" role="tablist" aria-label="Explore categories">'+['All','Food','Shopping','Services','Stay'].map(x=>'<button type="button" data-cat="'+x+'" role="tab" class="'+(String(cat||'all').toLowerCase()===x.toLowerCase()?'active':'')+'">'+x+'</button>').join('')+'</div><div id="'+id+'FinalStatus" class="ic-final-status">Loading…</div><div id="'+id+'FinalGrid" class="ic-final-grid"></div></div>';
    const tabs=$(id+'FinalTabs'),grid=$(id+'FinalGrid'),st=$(id+'FinalStatus');
    const paint=async(c,qv)=>{status(st,'Loading local places…');try{const d=await catalog(),target=String(c||'all').toLowerCase(),groups={food:['food','cafes','restaurants'],shopping:['shopping','groceries','fashion','electronics','hardware','books','handloom'],services:['services','clinics','hospitals','pharmacies','salons','gyms','education','automotive','banks'],stay:['hotels','resorts']},terms=groups[target]||[];let arr=(d.places||[]).filter(p=>{const hay=[p.name,p.type,p.category,p.address,p.city,p.phone,p.description].join(' ').toLowerCase();const exact=String(p.category||'').toLowerCase();return target==='all'||terms.includes(exact)||(target==='food'&&/(restaurant|cafe|food|bakery|fast food|fast_food)/i.test(hay))||(target==='stay'&&/(hotel|guest|hostel|motel|resort|stay)/i.test(hay))||(target==='shopping'&&/(shop|store|market|shopping)/i.test(hay))||(target==='services'&&/(service|office|repair|clinic|hospital|pharmacy|salon|gym|fitness)/i.test(hay))});arr=localFilterPlaces(arr,qv).slice(0,120);status(st,arr.length+' local places found','ok');grid.innerHTML=arr.length?arr.map(card).join(''):'<div class="ic-final-card" style="grid-column:1/-1;text-align:center"><b>No results found</b><br><small>Try another search or category.</small></div>';bind(grid)}catch(e){status(st,e.message,'err');grid.innerHTML='<div class="ic-final-card" style="grid-column:1/-1">Discovery is temporarily unavailable. Please try again.</div>'}};
    tabs.querySelectorAll('button').forEach(b=>b.onclick=()=>{tabs.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));paint(b.dataset.cat,qvFor(b.dataset.cat))});
    const qvFor=c=>String(c).toLowerCase()==='all'?q:(q||'');
    await paint(cat,q);
  }

  function localFilterPlaces(places,q){
  const raw=String(q||'').trim().toLowerCase().replace(/\\s+/g,' ');
  if(!raw)return places;
  const aliases={resturent:'restaurant',restuarant:'restaurant',restraunt:'restaurant',cofee:'cafe',coffie:'cafe',pharmcy:'pharmacy',saloon:'salon',grosery:'grocery',groccery:'grocery',eletronic:'electronics'};
  const qx=aliases[raw]||raw;
  const intents={
    food:['food','restaurant','restaurants','cafe','cafes','coffee','bakery','fast food','fast_food','food court','food_court','ice cream','bar','pub'],
    restaurant:['restaurant','restaurants','food','fast food','fast_food','food court','food_court'],
    cafe:['cafe','cafes','coffee','bakery'],
    coffee:['cafe','cafes','coffee','bakery'],
    shopping:['shopping','shop','store','market','fashion','clothes','electronics','hardware','books','groceries'],
    pharmacy:['pharmacy','pharmacies','chemist','medicine'],
    hotel:['hotel','hotels','guest house','guest_house','hostel','motel','resort','stay'],
    hotels:['hotel','hotels','guest house','guest_house','hostel','motel','resort','stay'],
    stay:['hotel','hotels','guest house','guest_house','hostel','motel','resort','stay'],
    resort:['resort','hotel','hotels','retreat'],
    gym:['gym','gyms','fitness','fitness centre','fitness_centre'],
    fitness:['gym','gyms','fitness','fitness centre','fitness_centre'],
    salon:['salon','salons','hair','hairdresser','beauty'],
    beauty:['salon','salons','hair','hairdresser','beauty'],
    clinic:['clinic','clinics','doctor','doctors','dentist'],
    hospital:['hospital','hospitals'],
    health:['health','clinic','clinics','doctor','doctors','dentist','pharmacy'],
    electronics:['electronics','computer','mobile','phone','appliance','telecommunication'],
    fashion:['fashion','clothes','clothing','tailor','shoes'],
    clothing:['fashion','clothes','clothing','tailor','shoes']
  };
  const terms=intents[qx]||[qx];
  const tokens=qx.split(/\\s+/).filter(Boolean);
  return places.map(p=>{
    const hay=[p.name,p.type,p.category,p.address,p.city,p.phone,p.description].join(' ').toLowerCase();
    const category=String(p.category||'').toLowerCase();
    let score=0;
    if(hay.includes(qx)||category.includes(qx))score+=30;
    if(String(p.name||'').toLowerCase().startsWith(qx))score+=20;
    terms.forEach(t=>{if(hay.includes(t))score+=8;if(category.includes(t))score+=14});
    tokens.forEach(t=>{if(hay.includes(t)||category.includes(t))score+=4});
    return {p,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).map(x=>x.p);
}
window.__IC_SEARCH_SELFTEST__=()=>{const d=window.__IC_LOCAL_CATALOG__?.places||[];return {catalog:d.length,queries:Object.fromEntries(['food','restaurant','cafe','coffee','shopping','pharmacy','hotel','resort','gym','salon','electronics','fashion','clinic','hospital'].map(q=>[q,localFilterPlaces(d,q).length]))};};\nwindow.renderHome=()=>renderHost('homeCards','Life around you','all','');
window.renderExplore=()=>renderHost('exploreCards','Discover Imphal','all',$('exploreSearch')?.value||'');
window.searchAll=()=>{const q=String($('search')?.value||'').trim();if(!q){$('search')?.focus();return}if(window.go)window.go('explore');if($('exploreSearch'))$('exploreSearch').value=q;window.renderExplore()};
window.filterCat=cat=>{if(window.go)window.go('explore');window.renderExplore().then(()=>{const b=$('exploreCards')?.querySelector('[data-cat="'+String(cat).replace(/"/g,'')+'"]');b?.click()})};
window.setExploreCat=(cat)=>{window.exploreCat=String(cat||'All').toLowerCase();const input=$('exploreSearch');if(input&&window.exploreCat!=='all')input.value='';window.renderExplore()};\nconst icExploreStyle=document.createElement('style');icExploreStyle.id='ic-explore-mobile-fix';icExploreStyle.textContent='@media(max-width:600px){#explore{padding-top:env(safe-area-inset-top,0px)}.ic-primary-cats{display:flex;gap:10px;overflow-x:auto;scrollbar-width:none;padding:4px 2px 8px}.ic-primary-cats::-webkit-scrollbar{display:none}.ic-primary-cats button{flex:0 0 auto;min-width:76px;min-height:46px;border-radius:999px;padding:0 18px}.ic-final-grid{padding-bottom:calc(96px + env(safe-area-inset-bottom,0px))}.ic-final-card{min-width:0}.ic-final-actions{flex-wrap:wrap}.ic-final-actions a,.ic-final-actions button{min-height:40px}}@media(min-width:601px){.ic-primary-cats{display:flex;gap:10px;overflow-x:auto;scrollbar-width:none}.ic-primary-cats::-webkit-scrollbar{display:none}}';document.head.appendChild(icExploreStyle);

window.renderEvents=async()=>{const h=$('eventList');if(!h)return;h.innerHTML='<div class="ic-final-status">Loading today’s public event listings…</div>';try{const d=await fetch('/api/events/today',{cache:'no-store'}).then(r=>r.json());const a=d.events||[];h.innerHTML=a.length?a.map(e=>'<article class="ic-final-card"><span class="pill">TODAY IN IMPHAL</span><h3>'+esc(e.title)+'</h3><p>'+esc(e.venue||'Imphal')+'</p><small>'+esc(e.date||'Today')+'</small></article>').join(''):'<div class="ic-final-status">No public events found for today.</div>'}catch{h.innerHTML='<div class="ic-final-status err">Today’s event feed is temporarily unavailable.</div>'}};
  window.renderDeals=async()=>{const h=$('dealList');if(!h)return;h.innerHTML='<div class="ic-final-status">Checking active offers…</div>';try{const d=await fetch('/api/offers',{cache:'no-store'}).then(r=>r.json());const a=d.offers||[];h.innerHTML=a.length?a.map(o=>'<article class="ic-final-card"><span class="pill">ACTIVE OFFER</span><h3>'+esc(o.title)+'</h3><p>'+esc(o.business?.name||'Local business')+' · '+esc(o.description||o.discount_text||'Local offer')+'</p>'+(o.expires_at?'<small>Valid until '+new Date(o.expires_at).toLocaleDateString('en-IN')+'</small>':'')+'</article>').join(''):'<div class="ic-final-status">No active offers are published yet.</div>'}catch{h.innerHTML='<div class="ic-final-status err">Offers are temporarily unavailable.</div>'}};window.renderCommunity=async()=>{const h=$('communityGrid');if(!h)return;try{const d=await catalog(),a=(d.places||[]).slice(0,12);h.innerHTML=a.length?a.map(card).join(''):'<div class="ic-final-status">No local community listings yet.</div>';bind(h)}catch{h.innerHTML='<div class="ic-final-status err">Local community discovery is temporarily unavailable.</div>'}};

  window.openBusinessTab=async function(tab,btn){
    document.querySelectorAll('[data-btab]').forEach(x=>x.classList.toggle('active',x===btn));
    const h=$('businessWorkspace');if(!h)return;h.className='ic-final-shell';h.innerHTML='<div class="ic-final-status">Loading your business workspace…</div>';
    try{
      await login();const me=await api('/api/me'),b=me.business;
      if(!b){h.innerHTML='<div class="ic-final-card"><h3>No business profile yet</h3><p>Create your listing and it will be stored in Supabase.</p><button class="primary" id="icFinalCreateBiz">Create business</button></div>';$('icFinalCreateBiz').onclick=()=>window.openSheet('business');return}
      if(tab==='profile'){
        const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],hours=b.opening_hours||{};
        h.innerHTML='<div class="ic-final-card"><h3>Business profile</h3><p>Database-backed owner editing.</p><div class="ic-final-grid"><div class="ic-final-field"><label>NAME</label><input id="fbName" value="'+esc(b.name)+'"></div><div class="ic-final-field"><label>CATEGORY</label><input id="fbCat" value="'+esc(b.category)+'"></div><div class="ic-final-field full"><label>DESCRIPTION</label><textarea id="fbDesc">'+esc(b.description||'')+'</textarea></div><div class="ic-final-field"><label>PHONE</label><input id="fbPhone" value="'+esc(b.phone||'')+'"></div><div class="ic-final-field"><label>WHATSAPP</label><input id="fbWa" value="'+esc(b.whatsapp||'')+'"></div><div class="ic-final-field full"><label>ADDRESS</label><input id="fbAddress" value="'+esc(b.address||'')+'"></div><div class="ic-final-field"><label>WEBSITE</label><input id="fbWeb" value="'+esc(b.website||'')+'"></div><div class="ic-final-field"><label>INSTAGRAM</label><input id="fbIg" value="'+esc(b.instagram_url||'')+'"></div></div><h4>Opening hours</h4><div class="ic-final-grid">'+days.map(x=>'<div class="ic-final-field"><label>'+x+'</label><input data-fb-hour="'+x+'" value="'+esc(hours[x]||'')+'" placeholder="09:00-18:00 or Closed"></div>').join('')+'</div><div id="fbStatus" class="ic-final-status">Press Save to persist changes.</div><div class="ic-final-actions"><button class="primary" id="fbSave">Save profile</button></div></div>';
        $('fbSave').onclick=async()=>{const st=$('fbStatus');status(st,'Saving…');try{const opening_hours={};h.querySelectorAll('[data-fb-hour]').forEach(x=>opening_hours[x.dataset.fbHour]=x.value.trim());await api('/api/business',{method:'PATCH',body:JSON.stringify({name:$('fbName').value.trim(),category:$('fbCat').value.trim(),description:$('fbDesc').value.trim(),phone:$('fbPhone').value.trim(),whatsapp:$('fbWa').value.trim(),address:$('fbAddress').value.trim(),website:$('fbWeb').value.trim(),instagram_url:$('fbIg').value.trim(),opening_hours})});status(st,'Saved to database.','ok')}catch(e){status(st,e.message,'err')}};
      }else if(tab==='catalog'){
        let items=[];try{items=(await fetch('/api/businesses/'+encodeURIComponent(b.slug)).then(r=>r.json())).items||[]}catch{}
        h.innerHTML='<div class="ic-final-card"><h3>Catalog</h3><div class="ic-final-list">'+(items.length?items.map(i=>'<div class="ic-final-row"><span><b>'+esc(i.name)+'</b><br><small>'+esc(i.description||'')+'</small></span><b>'+(i.price==null?'Ask':'₹'+Number(i.price).toLocaleString('en-IN'))+'</b></div>').join(''):'<div class="ic-final-status">No catalog entries yet.</div>')+'</div><div id="fcStatus" class="ic-final-status">Active Pro/Elite is required to publish.</div><div class="ic-final-actions"><button class="primary" id="fcAdd">Add product/service</button></div></div>';
        $('fcAdd').onclick=()=>window.openOwnerStudio();
      }else if(tab==='leads'){
        const d=await api('/api/leads'),a=d.leads||[];h.innerHTML='<div class="ic-final-card"><h3>Lead centre</h3><div class="ic-final-list">'+(a.length?a.map(l=>'<div class="ic-final-row"><span><b>'+esc(l.customer_name)+'</b><br><small>'+esc(l.message)+'</small><br><small>'+esc(l.customer_phone||l.customer_email||'No contact')+'</small></span><span>'+esc(l.status)+'</span></div>').join(''):'<div class="ic-final-status">No enquiries yet.</div>')+'</div></div>';
      }else{
        const d=await api('/api/analytics/owner'),t=d.totals||{};h.innerHTML='<div class="ic-final-card"><h3>Insights</h3><div class="ic-final-grid">'+[['Profile views',t.views],['Enquiries',t.enquiries],['Saves',t.saves],['Product views',t.product_views],['Calls',t.call],['WhatsApp',t.whatsapp],['Offer clicks',t.offer_click]].map(x=>'<div class="ic-final-card"><small>'+x[0]+'</small><h2 style="margin:5px 0;color:#07365d">'+Number(x[1]||0).toLocaleString('en-IN')+'</h2></div>').join('')+'</div><p style="font-size:9px;color:#78909f">Stored analytics only; no demo metrics.</p></div>';
      }
    }catch(e){h.innerHTML='<div class="ic-final-status err">'+esc(e.message)+'</div>'}
  };

  window.openOwnerStudio=async()=>{
    try{await login()}catch{return}
    modal('<div class="grab"></div><span class="pill">CATALOG EDITOR</span><h2>Add product or service</h2><div class="ic-final-field"><label>NAME</label><input id="fsName"></div><div class="ic-final-field"><label>PRICE</label><input id="fsPrice" inputmode="decimal"></div><div class="ic-final-field"><label>DESCRIPTION</label><textarea id="fsDesc"></textarea></div><div id="fsStatus" class="ic-final-status">Active Pro/Elite required.</div><div class="ic-final-actions"><button class="primary" id="fsSave">Save to database</button><button id="fsClose">Cancel</button></div>');
    $('fsClose').onclick=close;$('fsSave').onclick=async()=>{const st=$('fsStatus');status(st,'Saving…');try{await api('/api/items',{method:'POST',body:JSON.stringify({name:$('fsName').value.trim(),price:$('fsPrice').value,description:$('fsDesc').value.trim()})});status(st,'Saved to database.','ok')}catch(e){status(st,e.message,'err')}};
  };
  window.openStoryStudio=async()=>{
    try{await login()}catch{return}
    modal('<div class="grab"></div><span class="pill">24-HOUR STORY</span><h2>Publish a business story</h2><div class="ic-final-field"><label>TITLE</label><input id="fStory"></div><div id="fStoryStatus" class="ic-final-status">Active Pro/Elite required.</div><div class="ic-final-actions"><button class="primary" id="fStorySave">Publish</button><button id="fStoryClose">Cancel</button></div>');
    $('fStoryClose').onclick=close;$('fStorySave').onclick=async()=>{const st=$('fStoryStatus');status(st,'Publishing…');try{await api('/api/stories',{method:'POST',body:JSON.stringify({title:$('fStory').value.trim(),image_url:''})});status(st,'Published for 24 hours.','ok')}catch(e){status(st,e.message,'err')}};
  };

  const oldSheet=window.openSheet;
  window.openSheet=function(type){
    if(type!=='business')return oldSheet?oldSheet(type):undefined;
    modal('<div class="grab"></div><span class="pill">BUSINESS ONBOARDING</span><h2>Create your Imphal Connect business</h2><div class="ic-final-grid"><div class="ic-final-field"><label>BUSINESS NAME *</label><input id="frName"></div><div class="ic-final-field"><label>CATEGORY</label><input id="frCat" placeholder="Restaurant, salon, clinic…"></div><div class="ic-final-field full"><label>DESCRIPTION</label><textarea id="frDesc"></textarea></div><div class="ic-final-field"><label>PHONE</label><input id="frPhone"></div><div class="ic-final-field"><label>WHATSAPP</label><input id="frWa"></div><div class="ic-final-field full"><label>ADDRESS</label><input id="frAddress"></div></div><div id="frStatus" class="ic-final-status">Your listing starts as a private draft.</div><div class="ic-final-actions"><button class="primary" id="frSave">Create business</button><button id="frClose">Cancel</button></div>');
    $('frClose').onclick=close;$('frSave').onclick=async()=>{const st=$('frStatus');status(st,'Creating…');try{await login();await api('/api/business',{method:'POST',body:JSON.stringify({name:$('frName').value.trim(),category:$('frCat').value.trim()||'Services',description:$('frDesc').value.trim(),phone:$('frPhone').value.trim(),whatsapp:$('frWa').value.trim(),address:$('frAddress').value.trim(),city:'Imphal'})});status(st,'Business created and saved.','ok');await sleep(500);close();window.openBusinessTab('profile',document.querySelector('[data-btab="profile"]'))}catch(e){status(st,e.message,'err')}};
  };

  const nativeGo=window.go;
  window.go=id=>{if(!$(id))return;const cur=[...document.querySelectorAll('.view')].find(v=>v.classList.contains('active'))?.id||'home';if(cur===id)return;nativeGo?.(id);try{history.pushState({icView:id},'',location.pathname+location.search+'#'+id)}catch{}};
  addEventListener('popstate',e=>{const id=e.state?.icView||'home';if($(id))nativeGo?.(id)});
  try{history.replaceState({icView:'home'},'',location.pathname+location.search+'#home')}catch{}

  window.locateImphal=()=>{if($('icMapStatus'))$('icMapStatus').textContent='Finding your position…';if(!navigator.geolocation){if($('icMapStatus'))$('icMapStatus').textContent='Location unavailable · showing Imphal';window.refreshImphalMap?.();return}navigator.geolocation.getCurrentPosition(p=>{window.__IC_USER_POSITION__={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy};if($('icMapStatus'))$('icMapStatus').textContent='GPS LIVE · Current position · ±'+Math.round(p.coords.accuracy||0)+'m';window.refreshImphalMap?.()},()=>{if($('icMapStatus'))$('icMapStatus').textContent='Location access unavailable · showing Imphal';window.refreshImphalMap?.()},{enableHighAccuracy:true,timeout:15000,maximumAge:30000})};

  addEventListener('load',()=>setTimeout(()=>{window.renderHome?.();window.renderExplore?.();window.renderEvents?.();window.renderDeals?.();window.renderCommunity?.()},80),{once:true});
})();
/* ===== ELITE PRODUCTION EXPERIENCE LAYER ===== */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const style=document.createElement('style');
  style.id='ic-elite-production-skin';
  style.textContent=`
    :root{--bg:#f8faf7!important;--card:#fff!important;--blue:#1e6b4d!important;--cyan:#b7d7b8!important;--navy:#173a2c!important;--ink:#17241d!important;--muted:#66736b!important;--line:#dfe7e0!important;--green:#1e6b4d!important;--gold:#b48a43!important;--shadow:0 12px 34px rgba(23,58,44,.07)!important}
    body{background:#f8faf7!important;color:#17241d!important}
    header{background:linear-gradient(#f8faf7 78%,transparent)!important}
    .logo{background:#1e6b4d!important;box-shadow:none!important}
    .hero{background:#fff!important;border:1px solid #e1e8e2!important;box-shadow:0 18px 50px rgba(23,58,44,.06)!important}
    .hero h1,.section-head h2,.ic-final-card h2{color:#173a2c!important}
    .hero p{color:#5f6d64!important}
    .search{border:1px solid #d8e3da!important;box-shadow:0 10px 30px rgba(23,58,44,.07)!important}
    .search button,.chip.active,.ic-final-toolbar button.active,.business button{background:#1e6b4d!important;border-color:#1e6b4d!important}
    .chip,.ic-final-toolbar button{border-color:#dfe7e0!important}
    .card,.feature,.offer,.money-card,.plan,.business,.product,.ic-final-card{box-shadow:0 10px 30px rgba(23,58,44,.055)!important;border-color:#e0e7e1!important}
    .bottom{height:62px!important;border-radius:19px!important;background:rgba(255,255,255,.96)!important;border-color:#dbe5dd!important;box-shadow:0 16px 38px rgba(23,58,44,.12)!important}
    .nav{border-radius:14px!important}.nav.active{background:#edf5ef!important;color:#1e6b4d!important}
    .imphi-hero-wrap,#aiFab,.ai,#icCityStory,.ambient-orbs{display:none!important}
    #home .instant-studio,#home .ic-business-tabs{display:none!important}
    .ic-final-actions .primary,.sheet .primary{background:#1e6b4d!important;border-color:#1e6b4d!important}
    .pill,.eyebrow{background:#f0f6f1!important;color:#1e6b4d!important}
    .ic-elite-nav{display:none}
    @media(min-width:900px){
      .ic-elite-nav{display:flex;align-items:center;justify-content:center;gap:28px;margin:2px auto 0;padding:8px 0;color:#52635a;font:700 12px Manrope}
      .ic-elite-nav a{padding:6px 0}.ic-elite-nav a:hover{color:#1e6b4d}
      .app{padding-bottom:50px!important}
      .bottom{display:none!important}
      .grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}
      .hero{min-height:330px!important}
    }
    @media(max-width:899px){.app{padding-bottom:100px!important}.ic-elite-nav{display:none}}
  `;
  document.head.appendChild(style);

  function installNav(){
    const top=document.querySelector('header .top');
    if(top&&!document.querySelector('.ic-elite-nav')){
      const n=document.createElement('nav');n.className='ic-elite-nav';n.innerHTML='<a href="javascript:go(\'home\')">Home</a><a href="javascript:go(\'explore\')">Explore</a><a href="javascript:go(\'categories\')">Categories</a><a href="javascript:go(\'offers\')">Offers</a><a href="/business.html">For Business</a>';
      top.parentElement.appendChild(n);
    }
    const s=$('search');if(s){s.placeholder='Search restaurants, shops, doctors, salons, services…';s.setAttribute('aria-label','Search Imphal businesses and services')}
  }

  const categoryMap={All:'all',Food:'food',Shopping:'shopping',Health:'services',Beauty:'services',Fitness:'services',Stay:'stay',Education:'services',Automotive:'services',Technology:'shopping','Local Products':'shopping',Services:'services'};
  function upgradeExploreToolbar(){
    const bars=document.querySelectorAll('.ic-primary-cats');
    bars.forEach(bar=>{
      if(bar.dataset.eliteDone==='1')return;
      bar.dataset.eliteDone='1';
      const labels=['All','Food','Shopping','Health','Beauty','Fitness','Stay','Education','Automotive','Technology','Local Products','Services'];
      bar.innerHTML=labels.map(x=>'<button type="button" role="tab" data-elite-cat="'+x+'">'+x+'</button>').join('');
      bar.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{
        const mapped=categoryMap[btn.dataset.eliteCat]||'all';
        window.exploreCat=mapped;
        bar.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===btn));
        const q=$('exploreSearch');if(q&&mapped!=='all')q.value='';
        if(typeof window.renderExplore==='function')window.renderExplore();
      });
      bar.querySelector('button')?.classList.add('active');
    });
  }

  function normalizeBusinessCopy(){
    document.querySelectorAll('a,button,span,.ic-trust,.ic-enterprise-primary').forEach(el=>{
      if(!el.childNodes.length)return;
      const t=el.textContent||'';
      if(/Business plans · ₹499\/mo|Pro · ₹499\/month|Elite · ₹1,499\/month|Free listing/i.test(t) && !/product|service/i.test(t)){
        el.textContent=t.replace(/Business plans · ₹499\/mo/g,'Business Owner · ₹120/year').replace(/Free listing/g,'₹120/year owner membership').replace(/Pro · ₹499\/month/g,'No monthly billing').replace(/Elite · ₹1,499\/month/g,'Secure account');
      }
    });
  }

  function init(){
    installNav();upgradeExploreToolbar();normalizeBusinessCopy();document.querySelectorAll('a[href="javascript:IC.openOwner()"],a[href="javascript:IC.openOwner()"] .ic-enterprise-secondary').forEach(a=>{a.href='/dashboard.html'});
    if(location.search.includes('owner=1') && window.IC?.createBusiness){setTimeout(()=>window.IC.createBusiness(),500)}
    const obs=new MutationObserver(()=>{installNav();upgradeExploreToolbar();normalizeBusinessCopy()});
    obs.observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>obs.disconnect(),15000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
