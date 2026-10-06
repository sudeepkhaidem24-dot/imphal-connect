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
    h.innerHTML='<div class="ic-final-shell"><div><h2 style="margin:0;font:900 21px Manrope;color:#07365d">'+esc(title)+'</h2><small style="color:#78909f">Real local catalog · no fabricated listings</small></div><div class="ic-final-toolbar" id="'+id+'FinalTabs">'+['All','Food','Shopping','Services','Stay','Resorts','Cafes','Restaurants','Hotels','Groceries','Electronics','Fashion','Handloom','Books','Hardware','Clinics','Hospitals','Pharmacies','Gyms','Salons','Education','Automotive','Banks','Tourism'].map(x=>'<button type="button" data-cat="'+x+'" class="'+(String(cat||'all').toLowerCase()===x.toLowerCase()?'active':'')+'">'+x+'</button>').join('')+'</div><div id="'+id+'FinalStatus" class="ic-final-status">Loading…</div><div id="'+id+'FinalGrid" class="ic-final-grid"></div></div>';
    const tabs=$(id+'FinalTabs'),grid=$(id+'FinalGrid'),st=$(id+'FinalStatus');
    const paint=async(c,qv)=>{status(st,'Loading local places…');try{const d=await catalog(),target=String(c||'all').toLowerCase(),terms={food:['food','restaurant','cafe','bakery'],shopping:['shop','store','market'],services:['service','office','repair'],stay:['hotel','guest','hostel','resort'],resorts:['resort','retreat'],cafes:['cafe','coffee'],restaurants:['restaurant','food'],hotels:['hotel','guest','hostel'],groceries:['grocery','supermarket','market'],electronics:['electronics','computer','mobile','phone'],fashion:['fashion','clothes','tailor'],handloom:['handloom','fabric','textile','tailor'],books:['book','stationery'],hardware:['hardware','building','plumbing','electrical'],clinics:['clinic','doctor','dentist'],hospitals:['hospital'],pharmacies:['pharmacy','chemist'],gyms:['gym','fitness'],salons:['salon','hair','beauty'],education:['school','college','university','coaching','tutor'],automotive:['car','auto','repair','tyre'],banks:['bank','atm'],tourism:['tourism','travel','attraction']}[target]||[];const qx=String(qv||'').trim().toLowerCase();const arr=(d.places||[]).filter(p=>{const hay=[p.name,p.type,p.category,p.address,p.city,p.phone].join(' ').toLowerCase();return (target==='all'||String(p.category||'').toLowerCase()===target||terms.some(t=>hay.includes(t)))&&(!qx||hay.includes(qx))}).slice(0,120);status(st,arr.length+' local places found','ok');grid.innerHTML=arr.length?arr.map(card).join(''):'<div class="ic-final-card" style="grid-column:1/-1;text-align:center"><b>No results found</b><br><small>Try another category or a broader search.</small></div>';bind(grid)}catch(e){status(st,e.message,'err');grid.innerHTML='<div class="ic-final-card" style="grid-column:1/-1">Discovery is temporarily unavailable. Please try again.</div>'}};
    tabs.querySelectorAll('button').forEach(b=>b.onclick=()=>{tabs.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));paint(b.dataset.cat,q)});
    await paint(cat,q);
  }

  function localFilterPlaces(places,q){
  const raw=String(q||'').trim().toLowerCase();
  if(!raw)return places;
  const aliases={resturent:'restaurant',restuarant:'restaurant',restraunt:'restaurant',cofee:'cafe',coffie:'cafe',pharmcy:'pharmacy',restuarant:'restaurant',saloon:'salon'};
  const qx=aliases[raw]||raw;
  const toks=qx.split(/\\s+/).filter(Boolean);
  return places.map(p=>{
    const hay=[p.name,p.type,p.category,p.address,p.city,p.description].join(' ').toLowerCase();
    let score=0;
    if(hay.includes(qx))score+=20;
    if(String(p.name||'').toLowerCase().startsWith(qx))score+=15;
    toks.forEach(t=>{if(hay.includes(t))score+=5});
    return {p,score};
  }).filter(x=>x.score>0).sort((x,y)=>y.score-x.score).map(x=>x.p);
}
window.renderHome=()=>renderHost('homeCards','Life around you','all','');
window.renderExplore=()=>renderHost('exploreCards','Discover Imphal','all',$('exploreSearch')?.value||'');
window.searchAll=()=>{const q=String($('search')?.value||'').trim();if(!q){$('search')?.focus();return}if(window.go)window.go('explore');if($('exploreSearch'))$('exploreSearch').value=q;window.renderExplore()};
window.filterCat=cat=>{if(window.go)window.go('explore');window.renderExplore().then(()=>{const b=$('exploreCards')?.querySelector('[data-cat="'+String(cat).replace(/"/g,'')+'"]');b?.click()})};
window.setExploreCat=()=>window.renderExplore();

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