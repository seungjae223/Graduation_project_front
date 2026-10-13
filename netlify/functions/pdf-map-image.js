// Only public Kakao PNG map tiles; never accept arbitrary upstream hosts/paths.
exports.handler = async event => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method not allowed" };
  let url;
  try { url = new URL(event.queryStringParameters?.url); }
  catch { return { statusCode: 400, body: "Invalid map image" }; }
  if (url.protocol !== "https:" || url.hostname !== "mts.kakaocdn.net"
    || url.port || url.username || url.password || url.search || url.hash
    || !/^\/api\/v1\/tile\/(?:PNG02|PNGSD02)\/[A-Za-z0-9_]+\/latest\/\d+\/\d+\/\d+\.png$/.test(url.pathname)) {
    return { statusCode: 400, body: "Unsupported map image" };
  }
  try {
    const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15000) });
    if (!response.ok) return { statusCode: 502, body: "Map image upstream failed" };
    if (!response.headers.get("content-type")?.startsWith("image/png")) return { statusCode: 502, body: "Invalid image response" };
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 2 * 1024 * 1024) return { statusCode: 502, body: "Map image too large" };
    return {
      statusCode: 200, isBase64Encoded: true, body: bytes.toString("base64"),
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" },
    };
  } catch { return { statusCode: 502, body: "Map image unavailable" }; }
};
