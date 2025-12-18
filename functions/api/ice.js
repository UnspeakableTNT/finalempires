export async function onRequestOptions({ request }) {
  const origin = request.headers.get("Origin") || "*";
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    }
  });
}

export async function onRequestGet({ request, env }) {
  const origin = request.headers.get("Origin") || "*";

  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin"
  });

  const app = env.METERED_APPNAME;
  const apiKey = env.METERED_API_KEY;

  if (!app || !apiKey) {
    return new Response(JSON.stringify({
      error: "Server not configured",
      hint: "Set METERED_APPNAME and METERED_API_KEY as Pages environment variables."
    }), { status: 500, headers });
  }

  const url = `https://${app}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`;

  let resp;
  try {
    // Cache at the edge briefly to reduce API calls; credentials are short-lived anyway.
    resp = await fetch(url, { cf: { cacheTtl: 60, cacheEverything: true } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to reach Metered TURN API" }), { status: 502, headers });
  }

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    return new Response(JSON.stringify({
      error: "Metered TURN API returned an error",
      status: resp.status,
      body: txt.slice(0, 500)
    }), { status: 502, headers });
  }

  const iceServers = await resp.json();
  return new Response(JSON.stringify(iceServers), { status: 200, headers });
}
