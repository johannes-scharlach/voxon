import { useRef, useState } from "react";
import {
  appendTranscript,
  createVoxonSession,
  PromptInputProvider,
  usePromptInputController,
  useVoiceRecorder,
} from "@voxon/voice-input";
import { VoiceMicButton } from "@/components/ui/voice-mic-button";
import { VoiceSendButton } from "@/components/ui/voice-send-button";
import { VoiceTranscriptField } from "@/components/ui/voice-transcript-field";

const createSession = createVoxonSession({ endpoint: "/api/session-init" });

export function App() {
  return (
    <PromptInputProvider>
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-end gap-6 p-6">
        <header>
          <h1 className="text-lg font-semibold">voxon demo</h1>
          <p className="text-sm text-muted-foreground">
            Click the mic, talk, watch the transcript stream in. Send appends
            the message below.
          </p>
        </header>
        <Composer />
      </main>
    </PromptInputProvider>
  );
}

function Composer() {
  const { textInput } = usePromptInputController();
  const [messages, setMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Text that was already in the field when recording started, so live
  // transcript updates append to it instead of replacing it.
  const baseTextRef = useRef("");
  // Set when the user hits send mid-recording: stop first, send on the
  // final transcript.
  const sendPendingRef = useRef(false);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, trimmed]);
    textInput.clear();
  };

  const recorder = useVoiceRecorder({
    createSession: async (opts) => {
      setError(null);
      try {
        return await createSession(opts);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        throw err;
      }
    },
    onRecordingStart: () => {
      baseTextRef.current = textInput.value;
    },
    onTranscriptUpdate: (transcript) => {
      textInput.setInput(appendTranscript(baseTextRef.current, transcript));
    },
    onComplete: (transcript) => {
      const text = appendTranscript(baseTextRef.current, transcript);
      if (sendPendingRef.current) {
        sendPendingRef.current = false;
        send(text);
      } else {
        textInput.setInput(text);
      }
    },
  });

  const handleSubmit = () => {
    if (recorder.isRecording) {
      sendPendingRef.current = true;
      recorder.stop();
    } else {
      send(textInput.value);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {messages.length > 0 && (
        <ul className="flex flex-col gap-2">
          {messages.map((message, i) => (
            <li
              key={`${i}-${message.slice(0, 16)}`}
              className="self-end rounded-2xl rounded-br-sm bg-primary/10 px-4 py-2 text-sm whitespace-pre-wrap"
            >
              {message}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="text-sm text-red-600">
          Session init failed: {error}. Is the proxy running?
        </p>
      )}

      <div className="flex items-end gap-2 rounded-2xl border border-border bg-white p-3 shadow-sm">
        <VoiceTranscriptField
          value={textInput.value}
          onChange={textInput.setInput}
          readOnly={recorder.isRecording}
          placeholder="Type, or use the mic…"
          className="min-h-16"
        />
        <VoiceMicButton
          isRecording={recorder.isRecording}
          isFinalizing={recorder.isFinalizing}
          onToggle={recorder.toggle}
        />
        <VoiceSendButton
          isRecording={recorder.isRecording}
          isFinalizing={recorder.isFinalizing}
          isEmpty={!textInput.value.trim()}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
