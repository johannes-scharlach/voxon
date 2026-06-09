defmodule Scratch do
  def run do
    {:ok, ast} = Code.string_to_quoted(File.read!("deps/phoenix/lib/phoenix/socket/transport.ex"))
    IO.puts("File read")
  end
end
