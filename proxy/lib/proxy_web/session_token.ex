defmodule ProxyWeb.SessionToken do
  @moduledoc """
  Signs and verifies the ephemeral session tokens minted by `POST /v0/init`
  and checked when a browser opens the WebSocket.

  Tokens are single-purpose: they gate connection establishment only and
  expire 60 seconds after signing. An established session is never
  re-verified — session length is bounded by the hard wall in
  `ProxyWeb.VoxonSocket` instead.
  """

  @salt "voxon-ephemeral-session-salt"
  @max_age_seconds 60

  @doc """
  Signs a fresh session token.

  Options are forwarded to `Phoenix.Token.sign/4` (`:signed_at` is useful
  for testing expiry).
  """
  def sign(opts \\ []) do
    Phoenix.Token.sign(ProxyWeb.Endpoint, @salt, %{authenticated: true}, opts)
  end

  @doc """
  Verifies a session token, enforcing the #{@max_age_seconds}-second expiry.
  """
  def verify(token) do
    Phoenix.Token.verify(ProxyWeb.Endpoint, @salt, token, max_age: @max_age_seconds)
  end
end
