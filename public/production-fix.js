(()=>{
  const bootFix=()=>{
    document.querySelectorAll('main#map').forEach((el,i)=>{if(i)el.remove()});
    const fake=[...document.querySelectorAll('.event h3')].find(h=>/imphal after hours/i.test(h.textContent||''));
    if(fake&&fake.closest('.section'))fake.closest('.section').remove();
    if(window.L&&document.getElementById('icHomeLiveMap')&&!window.__IC_HOME_MAP_READY__){
      const host=document.getElementById('icHomeLiveMap');
      host.innerHTML='<div style="width:100%;height:100%"></div>';
      const map=L.map(host.firstElementChild,{zoomControl:false,dragging:true,scrollWheelZoom:true}).setView([24.817,93.9368],13);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
      window.__IC_HOME_MAP_READY__=true;
      setTimeout(()=>map.invalidateSize(),100);
    }
    if(window.locateImphal){
      const old=window.locateImphal;
      window.locateImphal=()=>{
        const home=document.getElementById('icHomeLiveMap');
        if(home&&!window.__IC_HOME_MAP_READY__&&window.L){
          home.innerHTML='<div style="width:100%;height:100%"></div>';
          const map=L.map(home.firstElementChild,{zoomControl:false,dragging:true,scrollWheelZoom:true}).setView([24.817,93.9368],13);
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
          window.__IC_HOME_MAP_READY__=true;
        }
        return old();
      };
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootFix,{once:true});else bootFix();
})();