"use strict";

const CACHE_VERSION = "gilded-age-tycoon-v2";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/newsstand.svg",
  "./assets/icons/textile.svg",
  "./assets/icons/steel.svg",
  "./assets/icons/rail.svg",
  "./assets/icons/oil.svg",
  "./assets/icons/bank.svg",
  "./assets/icons/aether_foundry.svg",
  "./assets/icons/clockwork_automata.svg",
  "./assets/icons/zeppelin_dock.svg",
  "./assets/icons/tesla_exchange.svg",
  "./assets/icons/chronometer_vault.svg",
  "./assets/icons/upgrade-press.svg",
  "./assets/icons/upgrade-loom.svg",
  "./assets/icons/upgrade-bessemer.svg",
  "./assets/icons/upgrade-express.svg",
  "./assets/icons/upgrade-cracking.svg",
  "./assets/icons/upgrade-credit.svg",
  "./assets/icons/upgrade-campaign.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
