const test = require("node:test");
const assert = require("node:assert/strict");
const { handler } = require("../netlify/functions/pdf-map-image");
test("tile proxy refuses arbitrary hosts, secrets, redirects and non-image responses", async () => {
  const original = global.fetch;
  let calls = 0;
  global.fetch = async (_url, options) => {
    calls++;
    assert.equal(options.redirect, "error");
    return new Response("not an image", { headers: { "content-type": "text/html" } });
  };
  try {
    for (const url of ["http://127.0.0.1/private", "https://evil.test/a.png", "https://mts.kakaocdn.net@evil.test/a.png",
      "https://mts.kakaocdn.net/api/v1/tile/PNG02/v26_blse3/latest/6/249/111.png?key=secret"]) {
      assert.equal((await handler({ httpMethod: "GET", queryStringParameters: { url } })).statusCode, 400);
    }
    assert.equal(calls, 0);
    const url = "https://mts.kakaocdn.net/api/v1/tile/PNG02/v26_blse3/latest/6/249/111.png";
    assert.equal((await handler({ httpMethod: "GET", queryStringParameters: { url } })).statusCode, 502);
    assert.equal((await handler({ httpMethod: "POST", queryStringParameters: { url } })).statusCode, 405);
  } finally { global.fetch = original; }
});
test("tile proxy accepts only the observed PNG02 and PNGSD02 tile formats", async () => {
  const original = global.fetch;
  const fetched = [];
  global.fetch = async url => {
    fetched.push(url);
    return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { "content-type": "image/png" } });
  };
  try {
    for (const kind of ["PNG02", "PNGSD02"]) {
      const url = `https://mts.kakaocdn.net/api/v1/tile/${kind}/v25_ejoqw/latest/4/1002/445.png`;
      const result = await handler({ httpMethod: "GET", queryStringParameters: { url } });
      assert.equal(result.statusCode, 200);
      assert.equal(result.headers["Content-Type"], "image/png");
      assert.equal(result.isBase64Encoded, true);
    }
    for (const path of ["PNGHD02/v25_ejoqw/latest/4/1002/445.png", "PNGSD02/v25_ejoqw/latest/4/1002/445.jpg", "PNGSD02/v25_ejoqw/other/4/1002/445.png"]) {
      const result = await handler({ httpMethod: "GET", queryStringParameters: { url: `https://mts.kakaocdn.net/api/v1/tile/${path}` } });
      assert.equal(result.statusCode, 400);
    }
    assert.equal(fetched.length, 2);
  } finally { global.fetch = original; }
});
