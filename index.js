addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  try {
    // Parse URL from query, or you can hardcode the target API
    const url = new URL(request.url)
    const targetAPI = url.searchParams.get("url") // e.g. ?url=https://example.com/api/data

    if (!targetAPI) {
      return new Response("Missing 'url' parameter", { status: 400 })
    }

    // Fetch the target API
    const apiResponse = await fetch(targetAPI, {
      method: request.method,           // Forward GET/POST etc
      headers: request.headers,         // Forward headers (optional: filter sensitive ones)
      body: request.body ? request.body : null,
      redirect: "follow"
    })

    // Clone response to modify headers
    const res = new Response(apiResponse.body, apiResponse)
    // Allow your frontend to read it (bypass CORS)
    res.headers.set("Access-Control-Allow-Origin", "*")
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
    res.headers.set("Access-Control-Allow-Headers", "*")

    return res
  } catch (err) {
    return new Response("Error: " + err.message, { status: 500 })
  }
}
