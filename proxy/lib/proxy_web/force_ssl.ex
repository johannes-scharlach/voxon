defmodule ProxyWeb.ForceSSL do
  @moduledoc """
  Runtime exclusion hook for the compile-time `force_ssl` endpoint setting.

  `force_ssl` must be set at compile time (config/prod.exs), but which hosts
  skip the HTTPS redirect is a deployment concern — e.g. the docker compose
  demo talks to the proxy as plain `http://proxy:4000` on an internal
  network. Hosts are read from `:proxy, :ssl_exclude_hosts`, set from the
  `SSL_EXCLUDE_HOSTS` env var in config/runtime.exs.
  """

  def excluded?(conn) do
    conn.host in Application.fetch_env!(:proxy, :ssl_exclude_hosts)
  end
end
