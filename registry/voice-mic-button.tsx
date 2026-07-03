"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface VoiceMicButtonProps {
  isRecording: boolean;
  isFinalizing: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * Mic button with three visual states: idle, recording (pulsing), and
 * finalizing (disabled). Wire it to `useVoiceRecorder`'s output.
 *
 * @example
 * <VoiceMicButton
 *   isRecording={recorder.isRecording}
 *   isFinalizing={recorder.isFinalizing}
 *   onToggle={recorder.toggle}
 * />
 */
export function VoiceMicButton({
  isRecording,
  isFinalizing,
  onToggle,
  disabled,
  className,
  children,
}: VoiceMicButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled || isFinalizing}
      aria-label={isRecording ? "Stop recording" : "Start recording"}
      className={cn(
        "inline-flex items-center justify-center rounded-full size-10 shrink-0 transition-all",
        isRecording
          ? "bg-primary text-primary-foreground animate-pulse ring-4 ring-primary/30"
          : "text-muted-foreground hover:text-primary hover:bg-primary/10",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {children ?? <MicIcon />}
    </button>
  );
}

function MicIcon() {
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
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}
