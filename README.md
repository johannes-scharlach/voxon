# voxon

An open-source, self-hostable WebSocket proxy for real-time AI voice transcription, built in Elixir/Phoenix. voxon keeps your provider API key on the server where it belongs, hands your browser clients short-lived session tokens instead, and pipes microphone audio to the provider's realtime API with one lightweight BEAM process per connection.

**Today voxon speaks to [Mistral's Voxtral realtime transcription API](https://docs.mistral.ai/). More providers are on the [roadmap](#roadmap).**

<!-- TODO: demo GIF — mic button → live transcript -->

## Why

Adding a real-time mic button to your app currently means solving three unrelated problems at once:

- **Key security.** Most realtime transcription providers have no client-safe ephemeral token mechanism. Shipping your master API key to the browser is not an option.
- **Stateful streaming.** Proxying a long-lived, bidirectional binary stream through a typical REST/serverless backend is awkward and expensive. WebSockets want a runtime built for hundreds of thousands of cheap, isolated, long-lived connections — which is exactly what the BEAM is.
- **Audio plumbing.** Browsers record Opus in WebM/Ogg containers; realtime models want raw 16-bit linear PCM at fixed sample rates. The conversion belongs on the client, and the included demo client shows how.

voxon is the piece in the middle: your backend exchanges a master key for an ephemeral token, your browser connects straight to voxon with that token, and voxon maintains the authenticated upstream connection to the provider.

## How it works

```mermaid
graph TD
    Client[Browser client] -->|1. request session| DevServer[Your application backend]
    DevServer -->|2. POST /v0/init with master key| Voxon[voxon proxy]
    Voxon -->|3. ephemeral token + wss URL| DevServer
    DevServer -->|4. token to browser| Client
    Client -->|5. wss connection with token| Voxon
    Voxon -->|6. authenticated upstream stream| Provider[Mistral Voxtral realtime API]
```

Inside the proxy, every session is two isolated processes — one facing the browser, one facing the provider — connected by message passing. A crash or disconnect on either side tears down only that session.

## Quickstart

Requirements: Elixir ≥ 1.15, a Mistral API key.

```sh
cd proxy
mix setup
MISTRAL_API_KEY=your-mistral-key mix phx.server
```

The proxy is now listening on `http://localhost:4000`. Mint a session token (in dev the master key defaults to `default_local_secret`):

```sh
curl -X POST http://localhost:4000/v0/init \
  -H "Authorization: Bearer default_local_secret"
# => {"token":"...","websocket_url":"ws://localhost:4000/stream/websocket"}
```

Connect a WebSocket to `websocket_url` with `?token=<token>` appended and start streaming audio frames.

### Run the demo client

`client/` contains a dependency-free browser demo (mic capture, Float32 → 16-bit PCM conversion, streaming) plus a minimal Node backend that plays the role of *your* application backend:

```sh
cd client
node server.js          # token-exchange backend on :3000
npx serve .             # or open index.html any other way
```

Click the mic button and talk.

## API

### `POST /v0/init`

Server-to-server only — call this from your backend, never from the browser.

- **Auth:** `Authorization: Bearer <VOXON_MASTER_API_KEY>`
- **Returns:** `{"token": "...", "websocket_url": "wss://.../stream/websocket"}`
- The token is signed (`Phoenix.Token`), single-purpose, and expires **60 seconds** after minting. It is verified once, at WebSocket connect time.

### `wss://…/stream/websocket?token=<token>`

The streaming socket. Frames are currently passed through to Mistral's realtime schema unchanged — send [`input_audio.append`](https://docs.mistral.ai/) messages with base64 PCM and receive `transcription.text.delta` / `transcription.segment` events back. (Schema normalization across providers is roadmap, not reality — see below.)

One voxon-specific event exists today:

```json
{"type": "session.hard_wall", "message": "Session reached its maximum duration. Reconnect to continue."}
```

## Operational limits

- **35-minute hard wall.** Sessions are closed after 35 minutes (configurable via `:session_max_duration_ms`). Realtime speech context degrades long before that, and the cap protects you from runaway provider bills on abandoned tabs.
- **Client-side transcoding.** The proxy does not transcode audio. Downsampling and Float32 → Int16 conversion happen in the browser (see `client/script.js`), keeping the proxy CPU-light.

## Deploying

The repo ships with a `Dockerfile` and `fly.toml` (WebSocket-aware concurrency limits, 5-minute graceful drain on redeploys). Required environment variables in production — the app refuses to boot without them:

| Variable | Purpose |
|---|---|
| `SECRET_KEY_BASE` | Signs session tokens. Generate with `mix phx.gen.secret`. |
| `VOXON_MASTER_API_KEY` | The secret your backend presents to `/v0/init`. Generate with `openssl rand -base64 32`. |
| `MISTRAL_API_KEY` | Upstream provider key. |
| `PHX_HOST` | Public hostname, used to build the returned `websocket_url`. |

```sh
cd proxy
fly secrets set SECRET_KEY_BASE=... VOXON_MASTER_API_KEY=... MISTRAL_API_KEY=...
fly deploy
```

Before production use, also set `check_origin` on the socket in `lib/proxy_web/endpoint.ex` to your app's origins.

## Current limitations

Honesty section. voxon is young:

- **One provider** (Mistral Voxtral realtime). The client speaks Mistral's message schema directly; there is no cross-provider abstraction yet.
- **One master key** — single-tenant self-hosting, no per-app key management.
- The demo client uses `ScriptProcessorNode` (deprecated); an `AudioWorklet`-based client SDK is planned.
- No usage metering or dashboards.

## Roadmap

See [VISION.md](VISION.md) for the long-term picture. Near-term, in rough order:

1. **Provider normalization** — one client-side schema, adapters for OpenAI Realtime, Gemini Live, and Mistral upstream.
2. **Client SDK** — an npm package with `AudioWorklet`-based capture/conversion, so the mic button is one function call.
3. **Server-side format rejection** — refuse WebM/Ogg containers explicitly instead of forwarding garbage upstream.
4. Managed cloud offering (multi-region, dashboards, usage aggregation).

Contributions and issue reports are very welcome.

## License

[Apache-2.0](LICENSE)
