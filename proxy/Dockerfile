# IMPORTANT: Use hexpm/elixir images, not the official `elixir` images on Docker Hub.
# The official images are larger, slower, and less frequently updated.
# Hexpm images are the Elixir community standard for production releases.
#
# For Fly.io deployments, always prefer hexpm images.

# Match these to your local versions from `elixir --version`
ARG ELIXIR_VERSION=1.20.0
ARG OTP_VERSION=29.0.1
ARG DEBIAN_VERSION=bookworm-20260518

ARG BUILDER_IMAGE="hexpm/elixir:${ELIXIR_VERSION}-erlang-${OTP_VERSION}-debian-${DEBIAN_VERSION}-slim"
ARG RUNNER_IMAGE="debian:${DEBIAN_VERSION}-slim"

# ------------------------------------------------------------------
# BUILDER STAGE: compile the Elixir release
# ------------------------------------------------------------------
FROM ${BUILDER_IMAGE} AS builder

# Install build tools
RUN apt-get update -y && \
    apt-get install -y build-essential git && \
    apt-get clean && rm -f /var/lib/apt/lists/*_*

WORKDIR /app

# Install Hex and Rebar (Elixir/Erlang package managers)
RUN mix local.hex --force && \
    mix local.rebar --force

ENV MIX_ENV="prod"

# Install dependencies first (for better Docker layer caching)
COPY mix.exs mix.lock ./
RUN mix deps.get --only $MIX_ENV
RUN mkdir config

# Copy compile-time configs before compiling deps
# (so config changes invalidate the dependency cache)
COPY config/config.exs config/prod.exs config/
RUN mix deps.compile

# Copy application code and compile
COPY lib lib
RUN mix compile

# Copy runtime config (changes here don't recompile code)
COPY config/runtime.exs config/

# Copy release overlays and build the release
COPY rel rel
RUN mix release

# ------------------------------------------------------------------
# RUNNER STAGE: minimal image for the compiled release
# ------------------------------------------------------------------
FROM ${RUNNER_IMAGE}

RUN apt-get update -y && \
    apt-get install -y libstdc++6 openssl libncurses6 locales && \
    apt-get clean && rm -f /var/lib/apt/lists/*_*

# Set UTF-8 locale
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

WORKDIR /app
RUN chown nobody /app

# Only copy the final release from the build stage
COPY --from=builder --chown=nobody:root /app/_build/prod/rel/proxy ./

USER nobody

# The `bin/server` script sets PHX_SERVER=true and starts the app
CMD ["/app/bin/server"]
