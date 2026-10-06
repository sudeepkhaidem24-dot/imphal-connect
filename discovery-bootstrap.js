await import('dotenv/config');
const expressModule=await import('express');
const express=expressModule.default;
const {smartDiscovery,todayEvents}=await import('./discovery.js');
const originalGet=express.application.get;
let installed=false;
express.application.get=function(path,...handlers){
  if(!installed&&typeof path==='string'&&path.startsWith('/api/')&&handlers.some(h=>typeof h==='function')){
    installed=true;
    originalGet.call(this,'/api/discovery/smart',smartDiscovery);
    originalGet.call(this,'/api/events/today',todayEvents);
  }
  return originalGet.call(this,path,...handlers);
};