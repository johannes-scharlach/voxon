import { useCallback, useEffect, useRef, useState } from "react";
import type {
  UseVoiceRecorderOptions,
  UseVoiceRecorderResult,
} from "./types";
import { WORKLET_SOURCE } from "./worklet-source";

const DEFAULT_SAMPLE_RATE = 16000;
const DEFAULT_CHANNEL_COUNT = 1;
const DEFAULT_FINALIZE_TIMEOUT_MS = 5000;

/** Manages a single voice-recording session: AudioWorklet capture, Mistral
 *  realtime protocol, and a two-phase stop that waits for the final
 *  transcript before firing `onComplete`.
 *
 *  Phase 1 (`stop`): stops the mic, sends `input_audio.flush` +
 *  `input_audio.end`, keeps the WS open.
 *  Phase 2 (`finalize`): waits for `transcription.done` (or WS close, or
 *  backstop timeout), then fires `onComplete` with the authoritative
 *  transcript. */
export function useVoiceRecorder({
  createSession,
  onComplete,
  onRecordingStart,
  onTranscriptUpdate,
  audio,
  finalizeTimeoutMs = DEFAULT_FINALIZE_TIMEOUT_MS,
}: UseVoiceRecorderOptions): UseVoiceRecorderResult {
  const sampleRate = audio?.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const channelCount = audio?.channelCount ?? DEFAULT_CHANNEL_COUNT;

  const [isRecording, setIsRecording] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef("");
  const audioBufferRef = useRef<string[]>([]);
  const finalizingRef = useRef(false);
  const finalizedRef = useRef(false);
  const finalizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onCompleteRef = useRef(onComplete);
  const onTranscriptUpdateRef = useRef(onTranscriptUpdate);
  const onRecordingStartRef = useRef(onRecordingStart);
  const createSessionRef = useRef(createSession);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onTranscriptUpdateRef.current = onTranscriptUpdate;
    onRecordingStartRef.current = onRecordingStart;
    createSessionRef.current = createSession;
  }, [onComplete, onTranscriptUpdate, onRecordingStart, createSession]);

  const finalizeRecording = useCallback(
    (finalTranscript?: string) => {
      if (finalizedRef.current) return;
      finalizedRef.current = true;
      finalizingRef.current = false;
      setIsFinalizing(false);

      if (finalizeTimerRef.current) {
        clearTimeout(finalizeTimerRef.current);
        finalizeTimerRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        if (
          wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING
        ) {
          wsRef.current.close();
        }
        wsRef.current = null;
      }

      const transcript = finalTranscript ?? transcriptRef.current;
      onCompleteRef.current?.(transcript);
    },
    [],
  );

  const stopCapture = useCallback(() => {
    if (finalizingRef.current || finalizedRef.current) return;
    finalizingRef.current = true;
    setIsRecording(false);
    setIsFinalizing(true);

    if (processorRef.current) {
      processorRef.current.port.close();
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      finalizeRecording();
      return;
    }

    ws.send(JSON.stringify({ type: "input_audio.flush" }));
    ws.send(JSON.stringify({ type: "input_audio.end" }));

    finalizeTimerRef.current = setTimeout(() => {
      console.warn("useVoiceRecorder: finalize timed out, closing.");
      finalizeRecording();
    }, finalizeTimeoutMs);
  }, [finalizeRecording, finalizeTimeoutMs]);

  const start = useCallback(async () => {
    if (wsRef.current || finalizingRef.current) {
      stopCapture();
      return;
    }

    finalizedRef.current = false;

    try {
      setIsRecording(true);
      onRecordingStartRef.current?.();
      transcriptRef.current = "";
      audioBufferRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      localStreamRef.current = stream;

      const audioContext = new (
        window.AudioContext ||
        // biome-ignore lint/suspicious/noExplicitAny: non-standard webkit prop
        (window as any).webkitAudioContext
      )({ sampleRate });
      audioContextRef.current = audioContext;

      const workletBlob = new Blob([WORKLET_SOURCE], {
        type: "application/javascript",
      });
      await audioContext.audioWorklet.addModule(
        URL.createObjectURL(workletBlob),
      );

      const source = audioContext.createMediaStreamSource(stream);
      const processor = new AudioWorkletNode(audioContext, "pcm-capture", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount,
      });
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        const bytes = new Uint8Array(e.data);
        let binary = "";
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Audio = window.btoa(binary);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({ type: "input_audio.append", audio: base64Audio }),
          );
        } else {
          audioBufferRef.current.push(base64Audio);
        }
      };

      const session = await createSessionRef.current();
      if (finalizingRef.current || finalizedRef.current) {
        session.websocket.close();
        return;
      }

      const ws = session.websocket;
      wsRef.current = ws;

      ws.onopen = () => {
        if (audioBufferRef.current.length > 0) {
          for (const buffered of audioBufferRef.current) {
            ws.send(
              JSON.stringify({ type: "input_audio.append", audio: buffered }),
            );
          }
          audioBufferRef.current = [];
        }
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "transcription.text.delta") {
          const newText = data.delta?.text || data.text || "";
          transcriptRef.current += newText;
          onTranscriptUpdateRef.current?.(transcriptRef.current);
        } else if (data.type === "transcription.segment") {
          const newText = `\n${data.segment?.text || data.text || ""}`;
          transcriptRef.current += newText;
          onTranscriptUpdateRef.current?.(transcriptRef.current);
        } else if (data.type === "transcription.done") {
          const finalText =
            typeof data.text === "string" ? data.text : transcriptRef.current;
          transcriptRef.current = finalText;
          onTranscriptUpdateRef.current?.(finalText);
          finalizeRecording(finalText);
        }
      };

      ws.onclose = () => {
        if (wsRef.current === ws) finalizeRecording();
      };

      ws.onerror = () => {
        if (wsRef.current === ws) finalizeRecording();
      };
    } catch (error) {
      console.error("useVoiceRecorder: error starting:", error);
      stopCapture();
    }
  }, [stopCapture, sampleRate, channelCount]);

  const stop = useCallback(() => {
    stopCapture();
  }, [stopCapture]);

  const toggle = useCallback(() => {
    if (isRecording || isFinalizing) {
      stopCapture();
    } else {
      start();
    }
  }, [isRecording, isFinalizing, start, stopCapture]);

  useEffect(() => {
    return () => {
      if (finalizeTimerRef.current) {
        clearTimeout(finalizeTimerRef.current);
        finalizeTimerRef.current = null;
      }
      if (processorRef.current) {
        processorRef.current.port.close();
        processorRef.current.disconnect();
      }
      if (audioContextRef.current?.state !== "closed") {
        audioContextRef.current?.close();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { isRecording, isFinalizing, start, stop, toggle };
}
