"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface VoiceSendButtonProps {
  isRecording: boolean;
  isFinalizing: boolean;
  isEmpty: boolean;
  onSubmit: () => void;
  className?: string;
  children?: ReactNode;
}

/**
 * Send button that handles the three states of the voice input flow:
 * - While recording: acts as "stop & send" (triggers phase 1 → 2).
 * - While finalizing: shows a spinner, disabled.
 * - Otherwise: standard send, disabled when empty.
 *
 * @example
 * <VoiceSendButton
 *   isRecording={recorder.isRecording}
 *   isFinalizing={recorder.isFinalizing}
 *   isEmpty={!textInput.value.trim()}
 *   onSubmit={() => handleSubmit({ text: textInput.value })}
 * />
 */
export function VoiceSendButton({
  isRecording,
  isFinalizing,
  isEmpty,
  onSubmit,
  className,
  children,
}: VoiceSendButtonProps) {
  if (isFinalizing) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          "inline-flex items-center justify-center rounded-full size-10 shrink-0",
          "bg-primary text-primary-foreground opacity-70",
          className,
        )}
      >
        <Spinner />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSubmit}
      disabled={isRecording ? false : isEmpty}
      aria-label={isRecording ? "Stop and send" : "Send"}
      className={cn(
        "inline-flex items-center justify-center rounded-full size-10 shrink-0 transition-all",
        "bg-primary text-primary-foreground hover:opacity-90",
        (isRecording ? false : isEmpty) && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {children ?? <SendIcon />}
    </button>
  );
}

function SendIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
