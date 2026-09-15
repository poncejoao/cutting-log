import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

// Lista de arquivos pra cache offline — injetada automaticamente pelo
// vite-plugin-pwa (estratégia injectManifest) no build.
precacheAndRoute(self.__WB_MANIFEST);

// Cache de runtime pras fontes do Google — antes vinha de graça com a
// estratégia generateSW; ao trocar pra injectManifest (necessário pra poder
// escrever os handlers de push abaixo), esse cache precisa ser escrito à mão.
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new CacheFirst({
    cacheName: "google-fonts-stylesheets",
    plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
);
registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts-webfonts",
    plugins: [
      new ExpirationPlugin({ maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

self.skipWaiting();
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Ação de atalho por tipo de lembrete — aparece como botão direto na
// notificação (inclusive na tela de bloqueio, dependendo do celular), sem
// precisar abrir o app pra descobrir onde tocar. O clique nela ainda abre o
// app (não dá pra gravar dado nenhum a partir do service worker sem risco de
// corromper o que já está salvo), só que já na aba certa.
const NOTIFICATION_ACTIONS = {
  treino: [{ action: "open", title: "Registrar treino" }],
  peso: [{ action: "open", title: "Registrar peso" }],
  agua: [{ action: "open", title: "Registrar água" }],
};

// Notificação push (lembrete de treino/peso/água/sincronização/recorde/meta)
// — chega mesmo com o app fechado, mandada pela função `send-reminders` da
// Supabase.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Cutting Log", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Cutting Log";
  const options = {
    body: data.body || "",
    icon: "/icon-192-v3.png",
    badge: "/icon-192-v3.png",
    data: { url: data.url || "/" },
    actions: NOTIFICATION_ACTIONS[data.kind] || [],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Clique na notificação — foca uma aba já aberta do app (na tela certa) ou
// abre uma nova.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.startsWith(self.location.origin));
      if (existing) {
        existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
