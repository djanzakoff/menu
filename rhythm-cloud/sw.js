const CACHE='my-rhythm-v10';
const CORE=['./','./index.html','./manifest.webmanifest','./photo-icon.jpg','./firebase-sync.js','./firebase-config.json'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(CORE.map(url=>cache.add(url)))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('my-rhythm-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(request,{cache:'no-store'});
      if(response.ok){
        const copy=response.clone();
        event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{}));
      }
      return response;
    }catch(error){
      const cached=await caches.match(request);
      if(cached)return cached;
      throw error;
    }
  })());
});
self.addEventListener('push',event=>{let payload={title:'Мой ритм',body:'Время заглянуть в дневник'};try{if(event.data)payload={...payload,...event.data.json()}}catch{}event.waitUntil(self.registration.showNotification(payload.title,{body:payload.body,icon:'./photo-icon.jpg',badge:'./photo-icon.jpg',tag:payload.tag||'rhythm-reminder',data:{url:'./'}}))});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{const existing=windows.find(w=>w.url.includes('/rhythm-cloud/'));if(existing)return existing.focus();return clients.openWindow('./')}))});
