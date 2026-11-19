const C='reformandome-v25-turnos-nutricion';
const FILES=["cn_negro_basica_sin_alas.webp", "cn_negro_viajera_sin_alas.webp", "cn_negro_guerrera_sin_alas.webp", "cn_negro_hechicera_sin_alas.webp", "cn_negro_noble_sin_alas.webp", "cn_negro_basica_luz.webp", "cn_negro_viajera_luz.webp", "cn_negro_guerrera_luz.webp", "cn_negro_hechicera_luz.webp", "cn_negro_noble_luz.webp", "cn_negro_basica_draconicas.webp", "cn_negro_viajera_draconicas.webp", "cn_negro_guerrera_draconicas.webp", "cn_negro_hechicera_draconicas.webp", "cn_negro_noble_draconicas.webp", "cn_negro_basica_sombra.webp", "cn_negro_viajera_sombra.webp", "cn_negro_guerrera_sombra.webp", "cn_negro_hechicera_sombra.webp", "cn_negro_noble_sombra.webp", "cn_castano_basica_sin_alas.webp", "cn_castano_viajera_sin_alas.webp", "cn_castano_guerrera_sin_alas.webp", "cn_castano_hechicera_sin_alas.webp", "cn_castano_noble_sin_alas.webp", "cn_castano_basica_luz.webp", "cn_castano_viajera_luz.webp", "cn_castano_guerrera_luz.webp", "cn_castano_hechicera_luz.webp", "cn_castano_noble_luz.webp", "cn_castano_basica_draconicas.webp", "cn_castano_viajera_draconicas.webp", "cn_castano_guerrera_draconicas.webp", "cn_castano_hechicera_draconicas.webp", "cn_castano_noble_draconicas.webp", "cn_castano_basica_sombra.webp", "cn_castano_viajera_sombra.webp", "cn_castano_guerrera_sombra.webp", "cn_castano_hechicera_sombra.webp", "cn_castano_noble_sombra.webp", "cn_rubio_basica_sin_alas.webp", "cn_rubio_viajera_sin_alas.webp", "cn_rubio_guerrera_sin_alas.webp", "cn_rubio_hechicera_sin_alas.webp", "cn_rubio_noble_sin_alas.webp", "cn_rubio_basica_luz.webp", "cn_rubio_viajera_luz.webp", "cn_rubio_guerrera_luz.webp", "cn_rubio_hechicera_luz.webp", "cn_rubio_noble_luz.webp", "cn_rubio_basica_draconicas.webp", "cn_rubio_viajera_draconicas.webp", "cn_rubio_guerrera_draconicas.webp", "cn_rubio_hechicera_draconicas.webp", "cn_rubio_noble_draconicas.webp", "cn_rubio_basica_sombra.webp", "cn_rubio_viajera_sombra.webp", "cn_rubio_guerrera_sombra.webp", "cn_rubio_hechicera_sombra.webp", "cn_rubio_noble_sombra.webp", "cn_pelirrojo_basica_sin_alas.webp", "cn_pelirrojo_viajera_sin_alas.webp", "cn_pelirrojo_guerrera_sin_alas.webp", "cn_pelirrojo_hechicera_sin_alas.webp", "cn_pelirrojo_noble_sin_alas.webp", "cn_pelirrojo_basica_luz.webp", "cn_pelirrojo_viajera_luz.webp", "cn_pelirrojo_guerrera_luz.webp", "cn_pelirrojo_hechicera_luz.webp", "cn_pelirrojo_noble_luz.webp", "cn_pelirrojo_basica_draconicas.webp", "cn_pelirrojo_viajera_draconicas.webp", "cn_pelirrojo_guerrera_draconicas.webp", "cn_pelirrojo_hechicera_draconicas.webp", "cn_pelirrojo_noble_draconicas.webp", "cn_pelirrojo_basica_sombra.webp", "cn_pelirrojo_viajera_sombra.webp", "cn_pelirrojo_guerrera_sombra.webp", "cn_pelirrojo_hechicera_sombra.webp", "cn_pelirrojo_noble_sombra.webp"];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(C);
 await cache.addAll(['./','./index.html','./app.js','./manifest.json','./icon-192.png','./icon-512.png']);
 for(let i=0;i<FILES.length;i+=10){await Promise.allSettled(FILES.slice(i,i+10).map(f=>cache.add('./'+f)))}
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('reformandome-')&&k!==C).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const u=new URL(event.request.url);
 if(u.origin!==self.location.origin||!u.pathname.startsWith(new URL('./',self.location.href).pathname))return;
 event.respondWith(fetch(event.request).then(r=>{
  if(r.ok){const copy=r.clone();caches.open(C).then(c=>c.put(event.request,copy)).catch(()=>{})}
  return r;
 }).catch(()=>caches.match(event.request)));
});
