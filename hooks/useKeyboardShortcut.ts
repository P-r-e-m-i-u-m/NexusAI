"use client";

import { useEffect } from "react";

type Options = {
  ctrlOrCmd?: boolean;
  shift?: boolean;
  disabled?: boolean;
};

export function useKeyboardShortcut(
  key: string,
  callback: (e: KeyboardEvent) => void,
  options: Options = {}
) {
  const { ctrlOrCmd = false, shift = false, disabled = false } = options;

  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const ctrlOrCmdPressed = isMac ? e.metaKey : e.ctrlKey;

      if (ctrlOrCmd && !ctrlOrCmdPressed) return;
      if (shift && !e.shiftKey) return;
      if (e.key.toLowerCase() !== key.toLowerCase()) return;

      e.preventDefault();
      callback(e);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, callback, ctrlOrCmd, shift, disabled]);
}