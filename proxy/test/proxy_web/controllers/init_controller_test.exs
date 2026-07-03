defmodule ProxyWeb.InitControllerTest do
  use ProxyWeb.ConnCase, async: true

  alias ProxyWeb.SessionToken

  defp master_key, do: Application.fetch_env!(:proxy, :voxon_master_api_key)

  test "mints a verifiable session token for a valid master key", %{conn: conn} do
    conn =
      conn
      |> put_req_header("authorization", "Bearer " <> master_key())
      |> post(~p"/v0/init")

    assert %{"token" => token, "websocket_url" => websocket_url} = json_response(conn, 200)
    assert {:ok, %{authenticated: true}} = SessionToken.verify(token)
    assert String.starts_with?(websocket_url, "ws")
    assert String.ends_with?(websocket_url, "/stream/websocket")
  end

  test "rejects a wrong master key", %{conn: conn} do
    conn =
      conn
      |> put_req_header("authorization", "Bearer not-the-master-key")
      |> post(~p"/v0/init")

    assert json_response(conn, 401)["error"] =~ "Master API Key"
  end

  test "rejects a missing authorization header", %{conn: conn} do
    conn = post(conn, ~p"/v0/init")

    assert json_response(conn, 401)["error"] =~ "Master API Key"
  end

  test "rejects a malformed authorization header", %{conn: conn} do
    conn =
      conn
      |> put_req_header("authorization", master_key())
      |> post(~p"/v0/init")

    assert json_response(conn, 401)["error"] =~ "Master API Key"
  end
end
