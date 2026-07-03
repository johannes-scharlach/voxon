"use client";

import { cn } from "@/lib/utils";

export interface VoiceTranscriptFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Textarea that displays the live transcript. When recording, it should be
 * read-only so the user can watch the transcript stream in without
 * accidentally editing mid-stream.
 *
 * @example
 * <VoiceTranscriptField
 *   value={textInput.value}
 *   onChange={(v) => textInput.setInput(v)}
 *   readOnly={recorder.isRecording}
 * />
 */
export function VoiceTranscriptField({
  value,
  onChange,
  placeholder,
  readOnly,
  className,
  autoFocus,
}: VoiceTranscriptFieldProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      autoFocus={autoFocus}
      className={cn(
        "w-full resize-none bg-transparent outline-none text-sm leading-relaxed",
        "placeholder:text-muted-foreground/50",
        readOnly && "opacity-70 cursor-not-allowed",
        className,
      )}
    />
  );
}
