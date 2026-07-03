defmodule ProxyWeb.VoxonSocket do
  @moduledoc """
  Browser-facing WebSocket transport.

  Verifies the ephemeral session token at connect time, starts a dedicated
  upstream provider connection per session, and pipes frames between the
  two. Sessions are hard-capped at 35 minutes (see `:session_max_duration_ms`).
  """
  @behaviour Phoenix.Socket.Transport

  require Logger

  alias Proxy.MistralClient
  alias ProxyWeb.SessionToken

  # Real-time speech contexts degrade past this mark, and the cap protects
  # self-hosters from runaway provider bills on abandoned sessions.
  @default_session_max_ms 35 * 60 * 1000

  # Sockets are started dynamically per-connection, not supervised here.
  def child_spec(_opts), do: :ignore

  def connect(%{params: %{"token" => token}} = transport_info) do
    case SessionToken.verify(token) do
      {:ok, _data} ->
        {:ok, transport_info}

      {:error, reason} ->
        Logger.warning("WebSocket connection rejected: #{inspect(reason)}")
        :error
    end
  end

  def connect(_transport_info) do
    Logger.warning("WebSocket connection rejected: missing token")
    :error
  end

  def init(state) do
    api_key = Application.fetch_env!(:proxy, :mistral_api_key)

    case MistralClient.start_link(self(), api_key) do
      {:ok, upstream_pid} ->
        Process.send_after(self(), :session_hard_wall, session_max_ms())
        {:ok, Map.put(state, :upstream, upstream_pid)}

      {:error, reason} ->
        Logger.error("Failed to connect upstream: #{inspect(reason)}")
        {:stop, :normal, state}
    end
  end

  # Frames from the browser are passed directly upstream.
  def handle_in({client_json, opts}, state) do
    opcode = Keyword.get(opts, :opcode, :text)
    WebSockex.send_frame(state.upstream, {opcode, client_json})
    {:ok, state}
  end

  def handle_info({:upstream_msg, msg}, state) do
    {:push, {:text, msg}, state}
  end

  def handle_info(:upstream_closed, state) do
    {:stop, :normal, state}
  end

  # Push the notice first, then stop on the follow-up message so the final
  # frame is flushed to the client before the socket closes.
  def handle_info(:session_hard_wall, state) do
    send(self(), :session_hard_wall_close)

    notice =
      Jason.encode!(%{
        type: "session.hard_wall",
        message: "Session reached its maximum duration. Reconnect to continue."
      })

    {:push, {:text, notice}, state}
  end

  def handle_info(:session_hard_wall_close, state), do: {:stop, :normal, state}

  def handle_info(_info, state), do: {:ok, state}

  def terminate(_reason, state) do
    if Map.has_key?(state, :upstream), do: Process.exit(state.upstream, :shutdown)
    :ok
  end

  defp session_max_ms do
    Application.get_env(:proxy, :session_max_duration_ms, @default_session_max_ms)
  end
end
