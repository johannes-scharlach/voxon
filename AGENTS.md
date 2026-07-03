# voxon

Open-source WebSocket proxy in Elixir/Phoenix that normalizes real-time AI transcription APIs. Currently targets Mistral's Voxtral realtime API.

## Repository layout

```
client/          Standalone browser client (vanilla HTML/JS) — mic capture, PCM conversion, WebSocket send
proxy/           Elixir/Phoenix app (:proxy) — the proxy engine
```

The `client/` and `proxy/` directories are independent; the client is not served by Phoenix.

## Commands (run from `proxy/`)

```
mix setup              # install deps
mix phx.server         # start dev server on port 4000
mix precommit          # compile --warnings-as-errors, deps.unlock --unused, format, test
mix test               # run all tests
mix test test/path.exs # run a single test file
mix test --failed      # rerun only failed tests
```

Always run `mix precommit` before considering work done.

## Architecture

- **No database** — this is a pure WebSocket proxy, no Ecto, no repo.
- **WebSocket transport layer** (`ProxyWeb.VoxonSocket`) uses `Phoenix.Socket.Transport` behaviour (raw WebSocket), **not** Phoenix Channels.
- **Upstream connection** (`Proxy.MistralClient`) uses `WebSockex` to maintain a persistent WebSocket to Mistral's realtime API.
- **Message flow**: Browser WebSocket → `VoxonSocket.handle_in/2` → `MistralClient` → Mistral API. Responses flow back via `handle_info/2` → reply to browser.
- `ProxyWeb.VoxonSocket.child_spec/1` returns `:ignore` — sockets are started dynamically per-connection, not supervised in the application tree.

## Environment

- API keys are read from app config (`:proxy, :mistral_api_key` / `:proxy, :voxon_master_api_key`), set in `config/runtime.exs`: required in prod (boot fails without them), env-var override with permissive defaults in dev/test.
- `MISTRAL_API_KEY` env var required for real upstream Mistral connections.
- `VOXON_MASTER_API_KEY` is the secret backends present to `POST /v0/init`; dev default is `default_local_secret`.
- Ephemeral session tokens are signed/verified by `ProxyWeb.SessionToken` (60s expiry, checked at WebSocket connect only).
- Sessions are hard-capped via `:proxy, :session_max_duration_ms` (default 35 min).
- Port defaults to 4000 (dev), 4002 (test). Set via `PORT` env var in prod.

## Key dependencies

- `bandit` — HTTP/WebSocket server
- `websockex` — upstream WebSocket client to AI providers
- `corsica` — CORS (currently wide-open for dev)
- `jason` — JSON codec

## Elixir / Phoenix patterns

- **Scope alias** — Phoenix router `scope` blocks include an optional alias prefixed to all routes within that scope. You never need your own `alias` for route definitions.
- `String.to_atom/1` on user input leaks atoms permanently. Never use it on untrusted data.
- Structs do not implement the Access behaviour — use `my_struct.field`, not `my_struct[:field]`.
- Variables are immutable but can be rebound. For `if`/`case`/`cond`, bind the result to a variable; don't rebind inside the block.

## Testing

- Use `ProxyWeb.ConnCase` (in `test/support/conn_case.ex`).
- Test server on port 4002, not auto-started (set `server: true` in config if needed).
- No database sandbox needed.
- **Use `start_supervised!/1`** to start processes in tests — guarantees cleanup between tests.
- **Avoid `Process.sleep/1`**. Instead monitor the process and assert on the DOWN message:

      ref = Process.monitor(pid)
      assert_receive {:DOWN, ^ref, :process, ^pid, :normal}

- To synchronize before the next call, use `_ = :sys.get_state/1` to ensure the process has handled prior messages.
- Avoid `mix deps.clean --all` unless you have a specific reason.
