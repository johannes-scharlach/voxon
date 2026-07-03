defmodule ProxyWeb.VoxonSocketTest do
  use ExUnit.Case, async: true

  alias ProxyWeb.SessionToken
  alias ProxyWeb.VoxonSocket

  describe "connect/1" do
    test "accepts a freshly signed token" do
      transport_info = %{params: %{"token" => SessionToken.sign()}}

      assert {:ok, ^transport_info} = VoxonSocket.connect(transport_info)
    end

    test "rejects a forged token" do
      assert :error = VoxonSocket.connect(%{params: %{"token" => "garbage"}})
    end

    test "rejects an expired token" do
      token = SessionToken.sign(signed_at: System.system_time(:second) - 61)

      assert :error = VoxonSocket.connect(%{params: %{"token" => token}})
    end

    test "rejects a connection without a token" do
      assert :error = VoxonSocket.connect(%{params: %{}})
    end
  end

  describe "session hard wall" do
    test "notifies the client, then closes on the follow-up message" do
      state = %{upstream: self()}

      assert {:push, {:text, notice}, ^state} =
               VoxonSocket.handle_info(:session_hard_wall, state)

      assert %{"type" => "session.hard_wall"} = Jason.decode!(notice)
      assert_received :session_hard_wall_close

      assert {:stop, :normal, ^state} =
               VoxonSocket.handle_info(:session_hard_wall_close, state)
    end
  end
end
