const { WebSocketServer, WebSocket } = require('ws');

const port = 8080;
const wss = new WebSocketServer({ port });

// Read Mistral API Key from environment variable
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

if (!MISTRAL_API_KEY) {
    console.error("MISTRAL_API_KEY environment variable is not set!");
    process.exit(1);
}

console.log(`Node.js WebSocket proxy running on ws://localhost:${port}`);

wss.on('connection', function connection(clientWs) {
    console.log("Client connected. Opening upstream connection to Mistral...");

    const url = "wss://api.mistral.ai/v1/audio/transcriptions/realtime?model=voxtral-mini-transcribe-realtime-2602";
    const mistralWs = new WebSocket(url, {
        headers: {
            "Authorization": `Bearer ${MISTRAL_API_KEY}`,
            "Content-Type": "application/json"
        }
    });

    mistralWs.on('open', () => {
        console.log("Mistral upstream connected!");
    });

    mistralWs.on('message', (data, isBinary) => {
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data, { binary: isBinary });
        }
    });

    mistralWs.on('close', (code, reason) => {
        console.log(`Mistral disconnected: ${code} - ${reason}`);
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close(code, reason);
        }
    });

    mistralWs.on('error', (error) => {
        console.error("Mistral WebSocket Error:", error);
    });

    clientWs.on('message', (data, isBinary) => {
        if (mistralWs.readyState === WebSocket.OPEN) {
            mistralWs.send(data, { binary: isBinary });
        } else {
            console.log("Warning: Mistral not ready yet. Dropping client frame.");
        }
    });

    clientWs.on('close', () => {
        console.log("Client disconnected.");
        if (mistralWs.readyState === WebSocket.OPEN) {
            mistralWs.close();
        }
    });
});
