const http = require('http');

// Configuration
const PORT = 3000;
// In production, this points to your deployed Fly.io proxy (e.g., https://voxon.fly.dev/v0/init)
const VOXON_URL = process.env.VOXON_PROXY_URL || 'http://localhost:4000/v0/init'; 
const VOXON_MASTER_KEY = process.env.VOXON_MASTER_API_KEY || 'default_local_secret';

const server = http.createServer((req, res) => {
    // Enable CORS for your local frontend file testing
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Secure endpoint for the browser client to hit
    if (req.method === 'POST' && req.url === '/api/session-init') {
        
        // TODO: This is where your customer would run their own auth check:
        // if (!req.headers.session_cookie) { return res.writeHead(401); }

        // Secure Server-to-Server call to the Voxon Proxy
        const proxyReq = http.request(VOXON_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${VOXON_MASTER_KEY}`,
                'Content-Type': 'application/json'
            }
        }, (proxyRes) => {
            let data = '';
            proxyRes.on('data', chunk => data += chunk);
            proxyRes.on('end', () => {
                res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
                res.end(data);
            });
        });

        proxyReq.on('error', (err) => {
            console.error("Failed to connect to Voxon:", err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "Voxon Proxy Unreachable" }));
        });

        proxyReq.end();
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`Node backend running at http://localhost:${PORT}`);
});
