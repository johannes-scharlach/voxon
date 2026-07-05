import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

// Minimal stand-in for *your* application backend: it holds the voxon
// master key, exchanges it for an ephemeral session token, and serves the
// built demo app. No dependencies.

const PORT = process.env.PORT || 3000;
// Base URL of the voxon proxy (e.g. https://voxon.fly.dev in production).
const VOXON_BASE_URL = process.env.VOXON_URL || "http://localhost:4000";
const VOXON_INIT_URL = `${VOXON_BASE_URL.replace(/\/?$/, "")}/v0/init`;
const VOXON_MASTER_KEY =
  process.env.VOXON_MASTER_API_KEY || "default_local_secret";

const DIST_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "dist");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/session-init") {
    // TODO: this is where your own backend would authenticate the user
    // before minting them a voxon session.
    try {
      const proxyRes = await fetch(VOXON_INIT_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${VOXON_MASTER_KEY}` },
      });
      const data = await proxyRes.text();
      res.writeHead(proxyRes.status, { "Content-Type": "application/json" });
      res.end(data);
    } catch (err) {
      console.error("Failed to connect to voxon:", err.message);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "voxon proxy unreachable" }));
    }
    return;
  }

  if (req.method !== "GET") {
    res.writeHead(404);
    res.end();
    return;
  }

  if (!existsSync(DIST_DIR)) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("dist/ not found — run `npm run build` first.");
    return;
  }

  // Static files from dist/, falling back to index.html.
  const urlPath = normalize(new URL(req.url, "http://x").pathname).replace(
    /^(\.\.[/\\])+/,
    "",
  );
  let filePath = join(DIST_DIR, urlPath);
  if (!filePath.startsWith(DIST_DIR) || !existsSync(filePath) || urlPath === "/") {
    filePath = join(DIST_DIR, "index.html");
  }

  res.writeHead(200, {
    "Content-Type": MIME_TYPES[extname(filePath)] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`voxon demo running at http://localhost:${PORT}`);
});
