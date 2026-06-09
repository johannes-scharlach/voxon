defmodule ProxyWeb.InitController do
  use ProxyWeb, :controller

  @salt "voxon-ephemeral-session-salt"

  def create(conn, _params) do
    # 1. Fetch the master key from environment variables
    master_key = System.get_env("VOXON_MASTER_API_KEY") || "default_local_secret"

    # 2. Extract the Authorization header
    case get_req_header(conn, "authorization") do
      ["Bearer " <> ^master_key] ->
        # Authorized! Generate the short-lived client token
        token = Phoenix.Token.sign(ProxyWeb.Endpoint, @salt, %{authenticated: true})

        # Determine the WebSocket URL using the application's configured Endpoint URL
        base_url = ProxyWeb.Endpoint.url()
        websocket_url = String.replace(base_url, ~r/^http/, "ws") <> "/stream/websocket"

        json(conn, %{token: token, websocket_url: websocket_url})

      _ ->
        # Unauthorized
        conn
        |> put_status(:unauthorized)
        |> json(%{error: "Invalid or missing Voxon Master API Key"})
    end
  end
end
