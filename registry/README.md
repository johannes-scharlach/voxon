# Voxon Registry

shadcn/ui-style copy-paste components for the `@voxon/voice-input` hooks. These are unstyled-by-default building blocks — you own the code after adding, so you can restyle freely.

## Adding components

```sh
npx shadcn@latest add https://raw.githubusercontent.com/johannes-scharlach/voxon/main/registry.json
```

This installs all three components into `components/ui/`. To add just one:

```sh
npx shadcn@latest add https://raw.githubusercontent.com/johannes-scharlach/voxon/main/registry.json --item voice-mic-button
```

## Components

### voice-mic-button

Mic button with idle / recording / finalizing states. Wire to `useVoiceRecorder`:

```tsx
<VoiceMicButton
  isRecording={recorder.isRecording}
  isFinalizing={recorder.isFinalizing}
  onToggle={recorder.toggle}
/>
```

### voice-transcript-field

Textarea for the live transcript. Set `readOnly` while recording:

```tsx
<VoiceTranscriptField
  value={textInput.value}
  onChange={textInput.setInput}
  readOnly={recorder.isRecording}
/>
```

### voice-send-button

Send button with stop-and-send, finalizing spinner, and disabled-when-empty:

```tsx
<VoiceSendButton
  isRecording={recorder.isRecording}
  isFinalizing={recorder.isFinalizing}
  isEmpty={!textInput.value.trim()}
  onSubmit={() => handleSubmit()}
/>
```

## Full example

```tsx
"use client";

import { useRef } from "react";
import {
  useVoiceRecorder,
  createVoxonSession,
  appendTranscript,
  usePromptInputController,
  PromptInputProvider,
} from "@voxon/voice-input";
import { VoiceMicButton } from "@/components/ui/voice-mic-button";
import { VoiceTranscriptField } from "@/components/ui/voice-transcript-field";
import { VoiceSendButton } from "@/components/ui/voice-send-button";

function VoiceInput() {
  const { textInput } = usePromptInputController();
  const baseInputRef = useRef("");
  const sendPendingRef = useRef(false);

  const recorder = useVoiceRecorder({
    createSession: createVoxonSession({ endpoint: "/api/voice-init" }),
    onRecordingStart: () => {
      baseInputRef.current = textInput.value;
    },
    onTranscriptUpdate: (transcript) => {
      textInput.setInput(appendTranscript(baseInputRef.current, transcript));
    },
    onComplete: (transcript) => {
      if (!sendPendingRef.current) return;
      sendPendingRef.current = false;
      const text = appendTranscript(baseInputRef.current, transcript).trim();
      if (text) console.log("Send:", text);
      textInput.clear();
    },
  });

  const handleSend = () => {
    if (recorder.isRecording) {
      sendPendingRef.current = true;
      recorder.stop();
      return;
    }
    const text = textInput.value.trim();
    if (text) console.log("Send:", text);
    textInput.clear();
  };

  return (
    <div className="flex items-end gap-2 p-4">
      <VoiceTranscriptField
        value={textInput.value}
        onChange={textInput.setInput}
        readOnly={recorder.isRecording}
        className="min-h-10 flex-1"
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
        onSubmit={handleSend}
      />
    </div>
  );
}

export function App() {
  return (
    <PromptInputProvider>
      <VoiceInput />
    </PromptInputProvider>
  );
}
```

## Prerequisites

- [`@voxon/voice-input`](../packages/voice-input/) — the hooks (`npm install @voxon/voice-input`)
- `cn()` utility from shadcn/ui (`@/lib/utils`)
- A Voxon proxy running (see [Quickstart](../README.md#quickstart))
- A session-init endpoint on your backend that proxies to Voxon's `POST /v0/init`
