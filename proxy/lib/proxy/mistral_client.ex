defmodule Proxy.MistralClient do
  @moduledoc """
  WebSocket client that maintains the upstream connection to Mistral's
  realtime transcription API and forwards frames back to the browser-facing
  `ProxyWeb.VoxonSocket` process via message passing.
  """
  use WebSockex

  def start_link(client_pid, api_key) do
    # Mistral Realtime API Endpoint for Voxtral
    url =
      "wss://api.mistral.ai/v1/audio/transcriptions/realtime?model=voxtral-mini-transcribe-realtime-2602"

    headers = [
      {"Authorization", "Bearer #{api_key}"},
      {"Content-Type", "application/json"}
    ]

    WebSockex.start_link(url, __MODULE__, %{client_pid: client_pid}, extra_headers: headers)
  end

  # Handle text frames arriving FROM Mistral, forward straight to frontend process
  def handle_frame({:text, msg}, state) do
    send(state.client_pid, {:upstream_msg, msg})
    {:ok, state}
  end

  def handle_frame(_frame, state), do: {:ok, state}

  def handle_disconnect(status_map, state) do
    require Logger
    Logger.error("Mistral disconnected! Reason: #{inspect(status_map.reason)}")
    send(state.client_pid, :upstream_closed)
    {:ok, state}
  end
end
