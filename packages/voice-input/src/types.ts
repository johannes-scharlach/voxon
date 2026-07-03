// ── Session creation ──────────────────────────────────────────────────

export interface VoiceSession {
  websocket: WebSocket;
}

export interface CreateSessionOptions {
  signal?: AbortSignal;
}

export type CreateSession = (opts?: CreateSessionOptions) => Promise<VoiceSession>;

// ── Voice recorder ────────────────────────────────────────────────────

export interface UseVoiceRecorderOptions {
  createSession: CreateSession;
  onComplete?: (transcript: string) => void;
  onTranscriptUpdate?: (transcript: string) => void;
  onRecordingStart?: () => void;
  audio?: {
    sampleRate?: number;
    channelCount?: number;
  };
  finalizeTimeoutMs?: number;
}

export interface UseVoiceRecorderResult {
  isRecording: boolean;
  isFinalizing: boolean;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

// ── Prompt input controller ───────────────────────────────────────────

export interface PromptInputController {
  textInput: {
    value: string;
    setInput: (v: string) => void;
    clear: () => void;
  };
}

export interface PromptInputProviderProps {
  initialInput?: string;
}
