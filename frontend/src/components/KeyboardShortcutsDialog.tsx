"use client";

import * as Dialog from "@radix-ui/react-dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: Props) {
  const shortcuts = [
    ["Ctrl + K", "Open command palette"],
    ["Ctrl + N", "New chat"],
    ["Ctrl + Enter", "Send message"],
    ["Ctrl + /", "Focus chat input"],
    ["Ctrl + B", "Toggle sidebar"],
    ["Ctrl + S", "Save workflow"],
    ["Esc", "Close dialog"],
    ["?", "Show shortcuts help"],
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />

        <Dialog.Content className="fixed top-1/2 left-1/2 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-gray-900 p-6 text-white shadow-xl">
          <Dialog.Title className="text-xl font-bold mb-4">
            Keyboard Shortcuts
          </Dialog.Title>

          <div className="space-y-3">
            {shortcuts.map(([key, action]) => (
              <div
                key={key}
                className="flex items-center justify-between border-b border-gray-700 pb-2"
              >
                <kbd className="rounded bg-gray-800 px-2 py-1 text-sm">
                  {key}
                </kbd>

                <span className="text-sm text-gray-300">
                  {action}
                </span>
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}