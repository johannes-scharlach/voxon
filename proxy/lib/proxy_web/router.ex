defmodule ProxyWeb.Router do
  use ProxyWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", ProxyWeb do
    pipe_through :api
  end

  scope "/v0", ProxyWeb do
    pipe_through :api
    post "/init", InitController, :create
  end
end
