"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";

export default function HomePage() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement;

  const isTyping =
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable;

  if (isTyping) return;

  if (e.key === "?" && e.shiftKey) {
    e.preventDefault();
    setOpen(true);
  }
};
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <DashboardHome />
      </main>

      <KeyboardShortcutsDialog
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}