// Serve the same restricted PDF tile function during CRA development.
const { handler } = require("../netlify/functions/pdf-map-image");
module.exports = app => {
  app.get("/.netlify/functions/pdf-map-image", async (req, res) => {
    const result = await handler({ httpMethod: req.method, queryStringParameters: req.query });
    res.status(result.statusCode).set(result.headers || {}).send(
      result.isBase64Encoded ? Buffer.from(result.body, "base64") : result.body
    );
  });
};
