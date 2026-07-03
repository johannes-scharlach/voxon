import type { CreateSession, CreateSessionOptions, VoiceSession } from "./types";

export interface CreateVoxonSessionFactoryOptions {
  /** URL of your session-init endpoint.
   *
   *  This is your backend, not voxon directly — your backend holds the
   *  VOXON_MASTER_API_KEY and calls voxon's `POST /v0/init`, then returns
   *  `{"token": "...", "websocket_url": "wss://..."}` to the browser. */
  endpoint: string;
  /** Extra headers for the session-init request (e.g. Authorization). */
  headers?: HeadersInit;
}

/** Returns a `CreateSession` that mints a voxon ephemeral token via your
 *  backend and opens the WebSocket. Pass this to `useVoiceRecorder`. */
export function createVoxonSession(
  factoryOpts: CreateVoxonSessionFactoryOptions,
): CreateSession {
  return async (opts?: CreateSessionOptions): Promise<VoiceSession> => {
    const res = await fetch(factoryOpts.endpoint, {
      method: "POST",
      headers: factoryOpts.headers,
      cache: "no-store",
      signal: opts?.signal,
    });

    if (!res.ok) {
      throw new Error(`Voxon session init failed: ${res.status}`);
    }

    const { token, websocket_url } = await res.json();
    const ws = new WebSocket(`${websocket_url}?token=${token}`);
    return { websocket: ws };
  };
}
