defmodule ProxyWeb.InitController do
  use ProxyWeb, :controller

  alias ProxyWeb.SessionToken

  @doc """
  Exchanges the master API key (server-to-server) for a short-lived client
  token and the WebSocket URL the browser should connect to.
  """
  def create(conn, _params) do
    master_key = Application.fetch_env!(:proxy, :voxon_master_api_key)

    with ["Bearer " <> presented_key] <- get_req_header(conn, "authorization"),
         true <- Plug.Crypto.secure_compare(presented_key, master_key) do
      websocket_url =
        ProxyWeb.Endpoint.url()
        |> String.replace(~r/^http/, "ws")
        |> Kernel.<>("/stream/websocket")

      json(conn, %{token: SessionToken.sign(), websocket_url: websocket_url})
    else
      _ ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: "Invalid or missing Voxon Master API Key"})
    end
  end
end
