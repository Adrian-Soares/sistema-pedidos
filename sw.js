/* Service worker do /v2/ — faz o sistema abrir sem internet.
   O escopo é apenas esta pasta, então não interfere no sistema antigo. */

const CACHE = "pedidos-3";
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

/* A pagina em si vem da rede primeiro, com o cache como rede de seguranca:
   assim uma versao nova chega sem precisar desinstalar nada. Os arquivos de
   apoio continuam vindo do cache primeiro, que e onde o ganho de velocidade esta. */
self.addEventListener("fetch", ev => {
  if(ev.request.method !== "GET") return;

  const ehPagina = ev.request.mode === "navigate" || ev.request.destination === "document";

  if(ehPagina){
    ev.respondWith(
      fetch(ev.request).then(rede => {
        const copia = rede.clone();
        caches.open(CACHE).then(c => c.put(ev.request, copia));
        return rede;
      }).catch(() => caches.match(ev.request).then(r => r || caches.match("./index.html")))
    );
    return;
  }

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
