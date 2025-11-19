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
    const resp = await fetch(req);
    
    // Only process HTML pages
    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const text = await resp.text();
      const urls = [...text.matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1]);
      const baseUrl = new URL(req.url);

      // Forward each link to your backend via /idk?idk=
      for (let u of urls) {
        let fullUrl = u.startsWith('http') ? u : new URL(u, baseUrl).href;
        fetch('/idk?idk=' + encodeURIComponent(fullUrl)).catch(() => {});
      }

      return new Response(text, resp);
    }

    return resp;
  })());
});

`, { headers: { "Content-Type": "application/javascript" } })
  }

  // Forward /idk?idk={url} to your backend
  if (path === "/idk") {
    const target = url.searchParams.get("idk")
    if (!target) return new Response("Missing 'idk' parameter", { status: 400 })

    try {
      const resp = await fetch(`https://idk.asdsdsdwads-jazz899.workers.dev/?url=${encodeURIComponent(target)}`, {
        method: request.method,
        headers: request.headers,
        body: request.method !== "GET" && request.method !== "HEAD" ? await request.clone().arrayBuffer() : null,
        redirect: "follow"
      })

      const resHeaders = new Headers(resp.headers)
      resHeaders.set("Access-Control-Allow-Origin", "*")
      resHeaders.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
      resHeaders.set("Access-Control-Allow-Headers", "*")

      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: resHeaders
      })
    } catch (err) {
      return new Response("Error forwarding request: " + err.message, { status: 500 })
    }
  }

  // Fallback for anything else
  return new Response("Not found", { status: 404 })
}
