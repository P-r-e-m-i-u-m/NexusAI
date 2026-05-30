"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Bot,
  Workflow,
  BrainCircuit,
  MessageSquareText,
  AudioLines,
  Activity,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import { useSidebar } from "@/lib/sidebar-context";

const nav = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/agents", icon: Bot, label: "Agents" },
  { href: "/workflows", icon: Workflow, label: "Workflows" },
  { href: "/rag", icon: BrainCircuit, label: "Knowledge" },
  { href: "/chat", icon: MessageSquareText, label: "Chat" },
  { href: "/audio", icon: AudioLines, label: "Audio" },
  { href: "/monitor", icon: Activity, label: "Monitor", hasPulse: true },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const path = usePathname();
  const { isCollapsed, setCollapsed } = useSidebar();
  const [isMounted, setIsMounted] = useState(false);
  const [tooltip, setTooltip] = useState<{ label: string; top: number } | null>(null);
  const asideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleToggle = () => {
    setCollapsed(!isCollapsed);
  };

  return (
    <aside
      ref={asideRef}
      aria-label="Sidebar navigation"
      className={clsx(
        "flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 ease-in-out relative group/sidebar",
        isCollapsed ? "w-16" : "w-56"
      )}
    >
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:inset-x-0 focus:top-0 focus:p-3 focus:bg-indigo-600 focus:text-white focus:text-sm focus:text-center focus:z-[60]"
      >
        Skip to main content
      </a>
      {/* Collapse Toggle Button */}
      {isMounted && (
        <button
        onClick={handleToggle}
          className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-gray-800 border border-gray-700 text-gray-400 hover:text-white flex items-center justify-center shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 z-50 transition-all duration-200 hover:scale-110"
          aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      )}

      {/* Logo Section */}
      <div
        className={clsx(
          "p-4 border-b border-gray-800 flex items-center transition-all duration-300",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-600/30">
            <Zap size={16} className="text-white fill-white/20 animate-pulse" />
          </div>
          <div className={clsx("flex flex-col whitespace-nowrap transition-opacity duration-300", isCollapsed && "hidden")}>
            <span className="font-bold text-white text-base leading-none">NexusAI</span>
            <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase mt-1">
              Agent Platform
            </span>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav aria-label="Main navigation" className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label, hasPulse }) => {
          const isActive = path === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              onMouseEnter={(e) => {
                if (!isCollapsed || !asideRef.current) return;
                const linkRect = e.currentTarget.getBoundingClientRect();
                const asideRect = asideRef.current.getBoundingClientRect();
                setTooltip({ label, top: linkRect.top - asideRect.top });
              }}
              onMouseLeave={() => setTooltip(null)}
              onFocus={(e) => {
                if (!isCollapsed || !asideRef.current) return;
                const linkRect = e.currentTarget.getBoundingClientRect();
                const asideRect = asideRef.current.getBoundingClientRect();
                setTooltip({ label, top: linkRect.top - asideRect.top });
              }}
              onBlur={() => setTooltip(null)}
              className={clsx(
                "flex items-center rounded-lg text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                isCollapsed ? "justify-center p-2.5" : "px-3 py-2.5 gap-3",
                isActive
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-900/30 font-medium"
                  : "text-gray-400 hover:bg-gray-800/60 hover:text-white"
              )}
            >
              {/* Icon Container */}
              <div className="relative flex-shrink-0 flex items-center justify-center">
                <Icon
                  size={18}
                  className={clsx(
                    "transition-transform duration-200",
                    !isActive && "group-hover:scale-110"
                  )}
                />

                {hasPulse && (
                  <span className={clsx("absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-1 ring-gray-900 shadow-sm", !isCollapsed && "hidden")}>
                    <span className="absolute inset-0 bg-emerald-500 rounded-full  opacity-75" />
                  </span>
                )}
              </div>

              {/* Text Label */}
              <span className={clsx("flex-1 whitespace-nowrap transition-opacity duration-300", isCollapsed && "hidden")}>
                {label}
              </span>

              {hasPulse && (
                <span className={clsx("w-2.5 h-2.5 rounded-full bg-emerald-500 relative flex-shrink-0", isCollapsed && "hidden")}>
                  <span className="absolute inset-0 rounded-full bg-emerald-500  opacity-75" />
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      {isCollapsed && tooltip && (
        <div
          className="absolute left-full ml-3 z-50 px-2.5 py-1.5 bg-gray-950 border border-gray-800 text-xs font-semibold text-gray-200 rounded-md shadow-xl whitespace-nowrap pointer-events-none"
          style={{ top: tooltip.top }}
        >
          {tooltip.label}
        </div>
      )}

      {/* User Profile Section */}
      <div className="p-4 border-t border-gray-800">
        <div
          className={clsx(
            "flex items-center transition-all duration-300 relative group",
            isCollapsed ? "justify-center" : "gap-3"
          )}
        >
          {/* Avatar Container */}
          <button
            tabIndex={0}
            aria-label={`Admin User — admin@nexusai.com`}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-md flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400 transition-all duration-200"
          >
            A
          </button>

          {/* Expanded Profile Info */}
          <div className={clsx("flex flex-col overflow-hidden transition-opacity duration-300", isCollapsed && "hidden")}>
            <p className="text-xs font-semibold text-white leading-none whitespace-nowrap">
              Admin User
            </p>
            <p className="text-[10px] text-gray-500 truncate mt-1">
              admin@nexusai.com
            </p>
          </div>

          {/* Collapsed Hover Tooltip Profile */}
          <div className={clsx("absolute left-full ml-3 p-2 bg-gray-950 border border-gray-800 text-[10px] text-gray-200 rounded-md shadow-xl opacity-0 translate-x-[-4px] pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100 group-hover:translate-x-0 group-focus-within:translate-x-0 transition-all duration-200 z-50 whitespace-nowrap flex flex-col", !isCollapsed && "hidden")}>
            <span className="font-semibold text-white">Admin User</span>
            <span className="text-gray-500 mt-0.5">admin@nexusai.com</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
