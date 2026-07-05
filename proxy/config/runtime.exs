import Config

# config/runtime.exs is executed for all environments, including
# during releases. It is executed after compilation and before the
# system starts, so it is typically used to load production configuration
# and secrets from environment variables or elsewhere. Do not define
# any compile-time configuration in here, as it won't be applied.
# The block below contains prod specific runtime configuration.

# ## Using releases
#
# If you use `mix release`, you need to explicitly enable the server
# by passing the PHX_SERVER=true when you start it:
#
#     PHX_SERVER=true bin/proxy start
#
# Alternatively, you can use `mix phx.gen.release` to generate a `bin/server`
# script that automatically sets the env var above.
if System.get_env("PHX_SERVER") do
  config :proxy, ProxyWeb.Endpoint, server: true
end

config :proxy, ProxyWeb.Endpoint, http: [port: String.to_integer(System.get_env("PORT", "4000"))]

# API keys: required in prod, permissive defaults elsewhere so local
# development and tests work out of the box.
if config_env() == :prod do
  config :proxy,
    voxon_master_api_key:
      System.get_env("VOXON_MASTER_API_KEY") ||
        raise("""
        environment variable VOXON_MASTER_API_KEY is missing.
        This is the secret your application backend presents to POST /v0/init
        to mint ephemeral client tokens. Generate a strong random value, e.g.:
        openssl rand -base64 32
        """),
    mistral_api_key:
      System.get_env("MISTRAL_API_KEY") ||
        raise("""
        environment variable MISTRAL_API_KEY is missing.
        It is required to open upstream connections to Mistral's realtime API.
        """)
else
  config :proxy,
    voxon_master_api_key: System.get_env("VOXON_MASTER_API_KEY", "default_local_secret"),
    mistral_api_key: System.get_env("MISTRAL_API_KEY", "mock_key_for_now")
end

if config_env() == :prod do
  # The secret key base is used to sign/encrypt cookies and other secrets.
  # A default value is used in config/dev.exs and config/test.exs but you
  # want to use a different value for prod and you most likely don't want
  # to check this value into version control, so we use an environment
  # variable instead.
  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise """
      environment variable SECRET_KEY_BASE is missing.
      You can generate one by calling: mix phx.gen.secret
      """

  host = System.get_env("PHX_HOST") || "example.com"

  # PHX_SCHEME / URL_PORT control the public URL voxon advertises in
  # /v0/init's websocket_url (http => ws, https => wss). Defaults suit a
  # TLS-terminating host like Fly; override for reverse proxies on other
  # ports or plain-HTTP local setups (e.g. the docker compose demo).
  url_scheme = System.get_env("PHX_SCHEME") || "https"

  url_port =
    String.to_integer(
      System.get_env("URL_PORT") || if(url_scheme == "https", do: "443", else: "80")
    )

  # BIND_IP controls the listen address. The default "::" (all IPv6
  # interfaces) suits Fly's IPv6 private network; the listener is
  # v6-only, so IPv4-only networks (e.g. a default docker compose
  # bridge) must set BIND_IP=0.0.0.0.
  bind_ip =
    case System.get_env("BIND_IP", "::") |> String.to_charlist() |> :inet.parse_address() do
      {:ok, ip} -> ip
      {:error, _} -> raise "environment variable BIND_IP must be a valid IP address"
    end

  # Hosts that skip the force_ssl HTTPS redirect (comma-separated). The
  # docker compose demo adds "proxy", its internal hostname.
  config :proxy,
    ssl_exclude_hosts:
      System.get_env("SSL_EXCLUDE_HOSTS", "localhost,127.0.0.1")
      |> String.split(",", trim: true)

  config :proxy, :dns_cluster_query, System.get_env("DNS_CLUSTER_QUERY")

  config :proxy, ProxyWeb.Endpoint,
    url: [host: host, port: url_port, scheme: url_scheme],
    http: [ip: bind_ip],
    secret_key_base: secret_key_base

  # ## SSL Support
  #
  # To get SSL working, you will need to add the `https` key
  # to your endpoint configuration:
  #
  #     config :proxy, ProxyWeb.Endpoint,
  #       https: [
  #         ...,
  #         port: 443,
  #         cipher_suite: :strong,
  #         keyfile: System.get_env("SOME_APP_SSL_KEY_PATH"),
  #         certfile: System.get_env("SOME_APP_SSL_CERT_PATH")
  #       ]
  #
  # The `cipher_suite` is set to `:strong` to support only the
  # latest and more secure SSL ciphers. This means old browsers
  # and clients may not be supported. You can set it to
  # `:compatible` for wider support.
  #
  # `:keyfile` and `:certfile` expect an absolute path to the key
  # and cert in disk or a relative path inside priv, for example
  # "priv/ssl/server.key". For all supported SSL configuration
  # options, see https://hexdocs.pm/plug/Plug.SSL.html#configure/1
  #
  # We also recommend setting `force_ssl` in your config/prod.exs,
  # ensuring no data is ever sent via http, always redirecting to https:
  #
  #     config :proxy, ProxyWeb.Endpoint,
  #       force_ssl: [hsts: true]
  #
  # Check `Plug.SSL` for all available options in `force_ssl`.
end
