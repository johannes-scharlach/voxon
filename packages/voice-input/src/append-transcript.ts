/** Appends a transcript to existing text with smart spacing — no doubled or
 *  missing spaces between the existing text and the transcript. */
export function appendTranscript(
  existingText: string,
  transcript: string,
): string {
  const trimmedTranscript = transcript.trim();
  if (!trimmedTranscript) return existingText;
  if (!existingText) return trimmedTranscript;

  const separator = /\s$/.test(existingText) ? "" : " ";
  return `${existingText}${separator}${trimmedTranscript}`;
}
