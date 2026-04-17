"use strict";

const CACHE_VERSION = "gilded-age-tycoon-v3";
const NETWORK_TIMEOUT_MS = 3000;
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

function openAppCache() {
  return caches.open(CACHE_VERSION);
}

function fetchWithTimeout(request, timeoutMs = NETWORK_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error("Network timeout")), timeoutMs);
    fetch(request)
      .then((response) => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetchWithTimeout(request);
    if (response && response.ok) {
      const cache = await openAppCache();
      cache.put("./index.html", response.clone());
    }
    return response;
  } catch (error) {
    const cachedPage = await caches.match("./index.html");
    if (cachedPage) {
      return cachedPage;
    }
    throw error;
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    const cache = await openAppCache();
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    openAppCache().then((cache) => cache.addAll(CORE_ASSETS))
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
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  event.respondWith(cacheFirstAsset(event.request));
});
