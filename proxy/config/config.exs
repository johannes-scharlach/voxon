# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :proxy,
  generators: [timestamp_type: :utc_datetime]

# Hard cap on WebSocket session length. The proxy notifies the client and
# closes the socket once a session reaches this age.
config :proxy, session_max_duration_ms: 35 * 60 * 1000

# Configure the endpoint
config :proxy, ProxyWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [json: ProxyWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: Proxy.PubSub,
  live_view: [signing_salt: "OeVjM8M0"]

# Configure Elixir's Logger
config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
