"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Bot, GitBranch, Database,
  Mic, MessageSquare, Settings, Zap, Activity,
} from "lucide-react";
import { clsx } from "clsx";

const nav = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/agents", icon: Bot, label: "Agents" },
  { href: "/workflows", icon: GitBranch, label: "Workflows" },
  { href: "/rag", icon: Database, label: "Knowledge" },
  { href: "/chat", icon: MessageSquare, label: "Chat" },
  { href: "/audio", icon: Mic, label: "Audio" },
  { href: "/monitor", icon: Activity, label: "Monitor" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">NexusAI</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">Agent Platform</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all motion-reduce:transition-none motion-reduce:transform-none duration-200",
              path === href
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white hover:translate-x-1"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white">A</div>
          <div>
            <p className="text-xs font-medium text-white">Admin</p>
            <p className="text-xs text-gray-500">admin@nexusai.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
