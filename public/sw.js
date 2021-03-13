const CACHE_NAME = "V5";
const STATIC_CACHE_URLS = [
  "/",
  "/css/normalize.css",
  "/css/boilerplate.css",
  "/css/main.css",
  "/js/main.js",
  "/js/vendor/button.prod.min.js",
  "/js/vendor/jquery-3.4.1.min.js",
  "/js/vendor/localforage.min.js",
  "/js/vendor/modernizr-3.8.0.min.js",
];

self.addEventListener("install", (event) => {
  console.log("Service Worker installing.");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_CACHE_URLS))
  );
});

self.addEventListener("activate", (event) => {
  // delete any unexpected caches
  event.waitUntil(
    caches
      .keys()
      .then((keys) => keys.filter((key) => key !== CACHE_NAME))
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            console.log(`Deleting cache ${key}`);
            return caches.delete(key);
          })
        )
      )
  );
});

self.addEventListener("fetch", (event) => {
  // Cache-First Strategy
  if (
    event.request.url.includes("/css/") ||
    event.request.url.includes("/img/")
  ) {
    console.log("Event url: " + event.request.url.toString());
    event.respondWith(
      caches
        .match(event.request) // check if the request has already been cached
        .then((cached) => cached || fetch(event.request)) // otherwise request network
        .then(
          (response) =>
            cache(event.request, response) // put response in cache
              .then(() => response) // resolve promise with the network response
        )
    );
  }
});

function cache(request, response) {
  if (response.type === "error" || response.type === "opaque") {
    return Promise.resolve(); // do not put in cache network errors
  }

  return caches
    .open(CACHE_NAME)
    .then((cache) => cache.put(request, response.clone()));
}
