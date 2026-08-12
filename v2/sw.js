/* Service worker do /v2/ — faz o sistema abrir sem internet.
   O escopo é apenas esta pasta, então não interfere no sistema antigo. */

const CACHE = "pedidos-v2-1";
const ARQUIVOS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icone-192.png",
  "./icone-512.png"
];

self.addEventListener("install", ev => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ARQUIVOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", ev => {
  ev.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", ev => {
  if(ev.request.method !== "GET") return;
  ev.respondWith(
    caches.match(ev.request).then(resp => {
      if(resp) return resp;
      return fetch(ev.request).then(rede => {
        const copia = rede.clone();
        caches.open(CACHE).then(c => c.put(ev.request, copia));
        return rede;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
