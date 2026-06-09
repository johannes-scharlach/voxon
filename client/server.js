const http = require("http");

// Configuration
const PORT = 3000;
// In production, this points to your deployed Fly.io proxy base URL (e.g., https://voxon.fly.dev)
const VOXON_BASE_URL =
  process.env.VOXON_URL ||
  process.env.VOXON_PROXY_URL ||
  "http://localhost:4000";

// Clean up the URL just in case it contains the old /v0/init path
const baseUrl = VOXON_BASE_URL.replace(/\/v0\/init\/?$/, "");
const VOXON_INIT_URL = `${baseUrl}/v0/init`;
const VOXON_MASTER_KEY =
  process.env.VOXON_MASTER_API_KEY || "default_local_secret";

const server = http.createServer(async (req, res) => {
  // Enable CORS for your local frontend file testing
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Secure endpoint for the browser client to hit
  if (req.method === "POST" && req.url === "/api/session-init") {
    // TODO: This is where your customer would run their own auth check:
    // if (!req.headers.session_cookie) { return res.writeHead(401); }

    // Secure Server-to-Server call to the Voxon Proxy
    try {
      const proxyRes = await fetch(VOXON_INIT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VOXON_MASTER_KEY}`,
          "Content-Type": "application/json",
        },
      });
      const data = await proxyRes.text();
      console.log("Voxon Proxy Response:", data);
      res.writeHead(proxyRes.status, { "Content-Type": "application/json" });
      res.end(data);
    } catch (err) {
      console.error("Failed to connect to Voxon:", err.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Voxon Proxy Unreachable" }));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Node backend running at http://localhost:${PORT}`);
});
