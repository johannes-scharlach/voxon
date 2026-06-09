defmodule ProxyWeb.VoxonSocket do
  @behaviour Phoenix.Socket.Transport

  alias Proxy.MistralClient

  # Automatically accept any local connection for Slice 1
  def child_spec(_opts), do: :ignore

  def connect(transport_info) do
    {:ok, transport_info}
  end

  def init(state) do
    api_key = System.get_env("MISTRAL_API_KEY") || "mock_key_for_now"

    case MistralClient.start_link(self(), api_key) do
      {:ok, upstream_pid} ->
        {:ok, Map.put(state, :upstream, upstream_pid)}

      {:error, reason} ->
        require Logger
        Logger.error("Failed to connect upstream: #{inspect(reason)}")
        {:stop, :normal, state}
    end
  end

  # Handle raw audio frames coming FROM the browser microphone
  def handle_in({client_json, opts}, state) do
    # Slice 1: Pass the raw text/audio data directly upstream to Mistral
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

  def handle_info(_info, state), do: {:ok, state}

  def terminate(_reason, state) do
    if Map.has_key?(state, :upstream), do: Process.exit(state.upstream, :shutdown)
    :ok
  end
end
