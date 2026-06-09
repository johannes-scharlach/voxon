defmodule Proxy.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      ProxyWeb.Telemetry,
      {DNSCluster, query: Application.get_env(:proxy, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: Proxy.PubSub},
      # Start a worker by calling: Proxy.Worker.start_link(arg)
      # {Proxy.Worker, arg},
      # Start to serve requests, typically the last entry
      ProxyWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Proxy.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    ProxyWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
