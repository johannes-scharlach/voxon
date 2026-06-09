# proxy — voxon engine

Elixir/Phoenix WebSocket proxy for normalizing real-time AI transcription. See `/AGENTS.md` at repo root for full project overview.

## Project-specific commands (run from this directory)

```
mix setup              # install deps
mix phx.server         # start dev server on port 4000
mix precommit          # compile --warnings-as-errors, deps.unlock --unused, format, test
mix test               # run all tests
mix test test/path.exs # run a single test file
mix test --failed      # rerun only failed tests
```

Always run `mix precommit` before considering work done.

## Architecture notes

- **No database** — no Ecto, no repo. Pure WebSocket proxy.
- **WebSocket transport** (`ProxyWeb.VoxonSocket`) uses `Phoenix.Socket.Transport` behaviour — raw WebSocket, **not** Phoenix Channels.
- **Upstream connection** (`Proxy.MistralClient`) uses `WebSockex`, not `brain` / `mint_websocket` / `Req`.
- `VoxonSocket.child_spec/1` returns `:ignore` — sockets are dynamic per-connection, not supervised in the app tree.

## Environment

- `MISTRAL_API_KEY` env var required for Mistral upstream.
- Port: 4000 (dev), 4002 (test), configurable via `PORT` env var.

## Testing

- Uses `ProxyWeb.ConnCase` (in `test/support/conn_case.ex`).
- Test server on port 4002, server not auto-started.
- No database sandbox needed.
- **Use `start_supervised!/1`** to start processes in tests — guarantees cleanup.
- **Avoid `Process.sleep/1`** — use `Process.monitor` + `assert_receive` on DOWN message.
- Sync with `_ = :sys.get_state/1` instead of sleeping.