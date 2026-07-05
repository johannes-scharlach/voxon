# voxon

Open-source WebSocket proxy in Elixir/Phoenix that normalizes real-time AI transcription APIs. Currently targets Mistral's Voxtral realtime API.

## Repository layout

```
client/              Demo app — Vite + React + Tailwind v4, uses @voxon/voice-input (file: dep) + copies of the registry components (src/components/ui/); server.js serves dist/ + /api/session-init
packages/voice-input/ @voxon/voice-input — React hooks (useVoiceRecorder + PromptInputProvider) for the mic-button-to-transcript UX
registry/            shadcn-style copy-paste UI components (voice-mic-button, voice-transcript-field, voice-send-button)
proxy/               Elixir/Phoenix app (:proxy) — the proxy engine
```

The `client/`, `packages/voice-input/`, `registry/`, and `proxy/` directories are independent; the client is not served by Phoenix. Root `docker-compose.yml` runs proxy + demo together (`MISTRAL_API_KEY=... docker compose up --build`). The registry components in `client/src/components/ui/` are copies of `registry/*.tsx` — keep them in sync when editing either side.

### `packages/voice-input/`

React hooks published as `@voxon/voice-input` on npm. Zero runtime deps; React ≥ 18 as a peer dep.

- `src/use-voice-recorder.ts` — AudioWorklet capture, Mistral realtime protocol (input_audio.append/flush/end → transcription.done), two-phase stop.
- `src/prompt-input-controller.tsx` — `PromptInputProvider` + `usePromptInputController` (text-input state only).
- `src/create-voxon-session.ts` — default `CreateSession` factory that hits your backend's session-init endpoint.
- `src/append-transcript.ts` — smart spacing utility.
- `src/worklet-source.ts` — PCM capture AudioWorklet processor source as a string.
- `test/` — vitest tests for `appendTranscript`.

Build: `npm run build` (tsc → `dist/`). Typecheck: `npm run typecheck`. Test: `npm run test`.

### `registry/`

shadcn/ui-style copy-paste components. Not part of the npm package — consumers add them via `npx shadcn@latest add`. Each component uses `cn()` from `@/lib/utils` (shadcn convention) and is fully restyleable.

- `voice-mic-button.tsx` — idle / recording / finalizing states.
- `voice-transcript-field.tsx` — textarea, read-only while recording.
- `voice-send-button.tsx` — stop-and-send, finalizing spinner, disabled-when-empty.
- `registry.json` (at repo root) — shadcn CLI manifest.
- `_placeholder.ts` — stub `cn()` so the registry's tsconfig resolves without a full shadcn project.

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
