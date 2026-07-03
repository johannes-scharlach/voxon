import { createContext, useCallback, useContext, useState } from "react";
import type { PromptInputController, PromptInputProviderProps } from "./types";

const PromptInputContext = createContext<PromptInputController | null>(null);

/** Optional global provider that lifts text-input state outside of your
 *  input component. Wrap your chat composer once; call
 *  `usePromptInputController()` from anywhere inside to read/set/clear the
 *  text. */
export function PromptInputProvider({
  initialInput = "",
  children,
}: PromptInputProviderProps & { children: React.ReactNode }) {
  const [value, setValue] = useState(initialInput);

  const setInput = useCallback((v: string) => setValue(v), []);
  const clear = useCallback(() => setValue(""), []);

  const controller: PromptInputController = {
    textInput: { value, setInput, clear },
  };

  return (
    <PromptInputContext.Provider value={controller}>
      {children}
    </PromptInputContext.Provider>
  );
}

export function usePromptInputController(): PromptInputController {
  const ctx = useContext(PromptInputContext);
  if (!ctx) {
    throw new Error(
      "Wrap your component inside <PromptInputProvider> to use usePromptInputController().",
    );
  }
  return ctx;
}
