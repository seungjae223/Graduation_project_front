// A release gate, not a workaround for missing backend TLS.
process.env.NODE_ENV = "production";
require("react-scripts/config/env");
const fs = require("fs");
const path = require("path");
const failures = [];
try {
  const url = new URL(process.env.REACT_APP_API_BASE_URL);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error();
} catch { failures.push("Configure a verified HTTPS REACT_APP_API_BASE_URL before release."); }
function inspect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) inspect(file);
    else if (file.endsWith(".map")) failures.push("Production source map found: " + file);
    else if (file.endsWith(".js") && fs.readFileSync(file, "utf8").includes("http://3.27.110.86")) {
      failures.push("Legacy HTTP API remains in the build: " + file);
    }
  }
}
if (fs.existsSync("build")) inspect("build");
else failures.push("Run npm run build first.");
if (failures.length) { failures.forEach(message => console.error(message)); process.exitCode = 1; }
else console.log("Static release checks passed; live HTTPS/CORS/OAuth/header tests are still required.");
