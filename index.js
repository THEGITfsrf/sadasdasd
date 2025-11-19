addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname

  // Serve index.html at /
  if (path === "/") {
    return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Mini Browser Tab</title>
<style>
  body { font-family: sans-serif; padding: 20px; }
  input, button { padding: 5px; font-size: 16px; margin: 5px 0; width: 100%; }
  iframe { width: 100%; height: 400px; border: 1px solid #ccc; margin-top: 10px; }
</style>
</head>
<body>
<h2>Mini Browser Tab</h2>
<input type="text" id="urlInput" placeholder="Enter URL here (with https://)">
<button id="loadBtn">Load URL</button>
<iframe id="browserFrame"></iframe>

<script>
// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(() => {
    console.log('Service worker registered.');
  });
}

const frame = document.getElementById('browserFrame');
const loadBtn = document.getElementById('loadBtn');
const urlInput = document.getElementById('urlInput');

loadBtn.addEventListener('click', () => {
  let url = urlInput.value.trim();
  if (!url.startsWith('http')) url = 'https://' + url;
  // Point iframe to Worker proxy
  frame.src = '/idk?idk=' + encodeURIComponent(url);
});
</script>
</body>
</html>
`, {
      headers: { "Content-Type": "text/html" }
    })
  }

  // Serve sw.js at /sw.js
  if (path === "/sw.js") {
    return new Response(`
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => clients.claim());

self.addEventListener('fetch', event => {
  event.respondWith((async () => {
    const req = event.request;
    const url = new URL(req.url);

    // Allow Worker’s own paths to go through unmodified
    if (url.pathname === '/' || url.pathname === '/sw.js' || url.pathname.startsWith('/idk')) {
      return fetch(req);
    }

    // Check if the request has a "Referer" pointing to a proxied page
    const referer = req.headers.get('Referer');
    let baseForRelative = referer || url.origin;

    // Treat all other requests as needing proxy
    let proxiedUrl;
    try {
      // Construct full URL relative to the page that initiated the request
      const resolved = new URL(req.url, baseForRelative);
      proxiedUrl = '/idk?idk=' + encodeURIComponent(resolved.href);
    } catch {
      proxiedUrl = '/idk?idk=' + encodeURIComponent(req.url);
    }

    return fetch(proxiedUrl, {
      method: req.method,
      headers: req.headers,
      body: req.method !== "GET" && req.method !== "HEAD" ? await req.clone().arrayBuffer() : null,
      redirect: "follow"
    });
  })());
});


`, { headers: { "Content-Type": "application/javascript" } })
  }

  // Forward /idk?idk={url} to your backend
  if (path === "/idk") {
  const target = url.searchParams.get("idk");
  if (!target) return new Response("Missing 'idk' parameter", { status: 400 });

  try {
    const resp = await fetch(target, {
      method: request.method,
      headers: request.headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? await request.clone().arrayBuffer() : null,
      redirect: "follow"
    });

    const resHeaders = new Headers(resp.headers);
    resHeaders.set("Access-Control-Allow-Origin", "*");
    resHeaders.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    resHeaders.set("Access-Control-Allow-Headers", "*");

    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: resHeaders
    });
  } catch (err) {
    return new Response("Error forwarding request: " + err.message, { status: 500 });
  }
}

  // Fallback for anything else
  return new Response("Not found", { status: 404 })
}
