export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Expect these to be set as (Production) environment variables in Cloudflare Pages:
  // METERED_APP = your Metered subdomain (e.g., riseofempires)
  // METERED_API_KEY = your Metered API key
  const app = env.METERED_APP;
  const key = env.METERED_API_KEY;

  if (!app || !key) {
    return new Response(JSON.stringify({ iceServers: [] }), {
      status: 500,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const upstream = `https://${app}.metered.live/api/v1/turn/credentials?apiKey=${key}`;

  const r = await fetch(upstream, { cf: { cacheTtl: 60, cacheEverything: true } });
  if (!r.ok) {
    return new Response(JSON.stringify({ iceServers: [] }), {
      status: 502,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Metered returns an array of ICE servers. We wrap it in { iceServers: ... }.
  const iceServersArray = await r.json();

  return new Response(JSON.stringify({ iceServers: iceServersArray }), {
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60",
    },
  });
}
