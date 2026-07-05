# @voxon/voice-input

React hooks for real-time voice transcription with [Voxon](https://github.com/johannes-scharlach/voxon) + Mistral Voxtral. Streaming audio capture, two-phase stop, and a prompt input controller for the live-transcript UX.

## Install

```sh
npm install @voxon/voice-input
```

Peer dependency: React ≥ 18.

## Quickstart

```tsx
import {
  useVoiceRecorder,
  createVoxonSession,
  appendTranscript,
  PromptInputProvider,
  usePromptInputController,
} from "@voxon/voice-input";

function VoiceChatInput() {
  const { textInput } = usePromptInputController();
  const baseInputRef = useRef("");

  const recorder = useVoiceRecorder({
    createSession: createVoxonSession({ endpoint: "/api/voice-init" }),
    onRecordingStart: () => {
      baseInputRef.current = textInput.value;
    },
    onTranscriptUpdate: (transcript) => {
      textInput.setInput(appendTranscript(baseInputRef.current, transcript));
    },
    onComplete: (transcript) => {
      const text = appendTranscript(baseInputRef.current, transcript).trim();
      if (text) onSubmit({ text });
      textInput.clear();
    },
  });

  return (
    <>
      <textarea value={textInput.value} onChange={(e) => textInput.setInput(e.target.value)} />
      <button onClick={recorder.toggle}>
        {recorder.isRecording ? "Stop" : "Record"}
      </button>
      {recorder.isFinalizing && <span>Transcribing…</span>}
    </>
  );
}

// Wrap with the provider once, above the input
export function App() {
  return (
    <PromptInputProvider>
      <VoiceChatInput />
    </PromptInputProvider>
  );
}
```

## API

### `useVoiceRecorder(options)`

Manages a single voice-recording session: AudioWorklet capture, Mistral realtime protocol, and a two-phase stop that waits for the final transcript before firing `onComplete`.

**Options**

| Option | Type | Default | Description |
|---|---|---|---|
| `createSession` | `(opts?) => Promise<{ websocket: WebSocket }>` | — | **Required.** Opens the transcription WebSocket. Use `createVoxonSession()` or provide your own. |
| `onComplete` | `(transcript: string) => void` | — | Called once with the authoritative final transcript (from `transcription.done`). |
| `onTranscriptUpdate` | `(transcript: string) => void` | — | Called with the cumulative transcript as deltas stream in. |
| `onRecordingStart` | `() => void` | — | Called right after recording starts. Use to snapshot pre-existing input. |
| `audio.sampleRate` | `number` | `16000` | Audio capture sample rate. |
| `audio.channelCount` | `number` | `1` | Audio capture channel count. |
| `finalizeTimeoutMs` | `number` | `5000` | Backstop timeout for the finalize phase. |

**Returns**

| Field | Type | Description |
|---|---|---|
| `isRecording` | `boolean` | True while the microphone is active. |
| `isFinalizing` | `boolean` | True after stop, while waiting for `transcription.done`. |
| `start` | `() => void` | Starts recording. |
| `stop` | `() => void` | Stops the mic, signals end-of-stream, waits for the final transcript. |
| `toggle` | `() => void` | Starts or stops recording. |

#### Two-phase stop

When you call `stop()` (or `toggle()` while recording):

1. **Phase 1 — capture stop**: stops the mic, sends `input_audio.flush` + `input_audio.end` to the server, keeps the WebSocket open.
2. **Phase 2 — finalize**: waits for `transcription.done` (or the backstop timeout), then fires `onComplete` with the final transcript and closes the socket.

`isFinalizing` is `true` during phase 2 — use it to show a spinner.

### `createVoxonSession(options)`

Returns a `CreateSession` that mints a Voxon ephemeral token via your backend and opens the WebSocket.

| Option | Type | Description |
|---|---|---|
| `endpoint` | `string` | URL of your session-init endpoint (your backend, not Voxon directly). Must return `{ token, websocket_url }`. |
| `headers` | `HeadersInit` | Extra headers for the session-init request. |

Your backend endpoint should proxy to Voxon's `POST /v0/init`:

```ts
// app/api/voice-init/route.ts
export async function POST() {
  const res = await fetch(`${VOXON_URL}/v0/init`, {
    method: "POST",
    headers: { Authorization: `Bearer ${VOXON_MASTER_API_KEY}` },
  });
  return Response.json(await res.json());
}
```

### `PromptInputProvider` / `usePromptInputController()`

Optional provider that lifts text-input state outside your input component, so live transcript deltas append cleanly to existing text.

```tsx
<PromptInputProvider initialInput="">
  <YourInput />
</PromptInputProvider>
```

```tsx
const { textInput } = usePromptInputController();
// textInput.value, textInput.setInput(v), textInput.clear()
```

### `appendTranscript(existingText, transcript)`

Appends a transcript to existing text with smart spacing — no doubled or missing spaces.

```ts
appendTranscript("hello", "world")   // "hello world"
appendTranscript("hello ", "world")  // "hello world"
appendTranscript("", "world")        // "world"
appendTranscript("hello", "")        // "hello"
```

### `WORKLET_SOURCE`

The PCM capture AudioWorklet processor source as a string constant. The hook uses this internally; it's exported in case you want to host the worklet as a separate file (for CSP compatibility).

## Direct Mistral (without Voxon)

```tsx
const recorder = useVoiceRecorder({
  createSession: async () => {
    const ws = new WebSocket(
      `wss://api.mistral.ai/v1/audio/transcriptions/realtime?model=voxtral-mini-transcribe-realtime-2602&api_key=${apiKey}`,
    );
    return { websocket: ws };
  },
  onComplete: (transcript) => console.log("Final:", transcript),
});
```

## How it works

```
Browser                 Voxon                  Mistral
  │  AudioWorklet          │                      │
  │  (16kHz PCM)           │                      │
  │──── input_audio.append ──────────────────────→│
  │←── transcription.text.delta ──────────────────│
  │                        │                      │
  │  stop() called         │                      │
  │──── input_audio.flush ───────────────────────→│
  │──── input_audio.end ─────────────────────────→│
  │←── transcription.done ────────────────────────│
  │  onComplete(text)      │                      │
```

## License

Apache-2.0
