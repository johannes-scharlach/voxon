import Config

# Force using SSL in production. This also sets the "strict-security-transport" header,
# known as HSTS. If you have a health check endpoint, you may want to exclude it below.
# Note `:force_ssl` is required to be set at compile-time.
# Excluded hosts are resolved at runtime from SSL_EXCLUDE_HOSTS — see
# ProxyWeb.ForceSSL and config/runtime.exs.
config :proxy, ProxyWeb.Endpoint,
  force_ssl: [
    rewrite_on: [:x_forwarded_proto],
    exclude: [conn: {ProxyWeb.ForceSSL, :excluded?, []}]
  ]

# Do not print debug messages in production
config :logger, level: :info

# Runtime production configuration, including reading
# of environment variables, is done on config/runtime.exs.
