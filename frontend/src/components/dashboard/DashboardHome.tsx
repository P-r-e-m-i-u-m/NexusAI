"use client";
import { useQuery } from "@tanstack/react-query";
import { Bot, GitBranch, Database, Activity, Zap, TrendingUp } from "lucide-react";
import { animate, useMotionValue, useTransform, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { Skeleton, useMinimumLoading } from "@/components/ui/Skeleton";

function AnimatedCounter({ value }: { value: number | string }) {
  const count = useMotionValue(0);
  const shouldReduceMotion = useReducedMotion();
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    if (typeof value === "number") {
      if (shouldReduceMotion) {
        count.set(value);
        return;
      }
      const controls = animate(count, value, { duration: 1 });
      return controls.stop;
    }
  }, [value, count, shouldReduceMotion]);

  if (typeof value !== "number") return <>{value}</>;
  return <motion.span>{rounded}</motion.span>;
}

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-gray-400">{label}</span>
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
        <Icon size={18} className="text-white" />
      </div>
    </div>
    <p className="text-3xl font-bold text-white"><AnimatedCounter value={value ?? "—"} /></p>
  </div>
);

const StatCardSkeleton = () => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
    <div className="flex items-center justify-between mb-3">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-9 w-9 rounded-lg" />
    </div>
    <Skeleton className="h-9 w-16" />
  </div>
);

const ProviderListSkeleton = () => (
  <div className="space-y-2">
    {[0, 1, 2, 3].map((item) => (
      <div key={item} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
        <Skeleton className="h-4 w-24" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

export function DashboardHome() {
  const healthQuery = useQuery({ queryKey: ["health"], queryFn: () => api.get("/health").then(r => r.data) });
  const providersQuery = useQuery({ queryKey: ["providers"], queryFn: () => api.get("/api/v1/llm/providers").then(r => r.data) });
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: () => api.get("/api/v1/agents/").then(r => r.data) });
  const workflowsQuery = useQuery({ queryKey: ["workflows"], queryFn: () => api.get("/api/v1/workflows/").then(r => r.data) });

  const health = healthQuery.data;
  const providers = providersQuery.data;
  const agents = agentsQuery.data;
  const workflows = workflowsQuery.data;
  const statsLoading = useMinimumLoading(
    healthQuery.isLoading || providersQuery.isLoading || agentsQuery.isLoading || workflowsQuery.isLoading
  );
  const providersLoading = useMinimumLoading(providersQuery.isLoading);
  const hasError = healthQuery.isError || providersQuery.isError || agentsQuery.isError || workflowsQuery.isError;

  const activeProviders = providers?.providers?.filter((p: any) => p.available).length ?? 0;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Status: <span className={`font-medium ${health?.status === "ok" ? "text-green-400" : "text-red-400"}`}>
            {health?.status === "ok" ? "All systems operational" : "Checking..."}
          </span>
        </p>
        {hasError && (
          <p className="text-sm text-red-400 mt-2">Some dashboard data failed to load. Please try again shortly.</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {statsLoading ? (
          [0, 1, 2, 3].map((item) => <StatCardSkeleton key={item} />)
        ) : (
          <>
            <StatCard icon={Bot} label="Agents" value={agents?.length ?? 0} color="bg-indigo-600" />
            <StatCard icon={GitBranch} label="Workflows" value={workflows?.length ?? 0} color="bg-purple-600" />
            <StatCard icon={Zap} label="LLM Providers" value={activeProviders} color="bg-amber-600" />
            <StatCard icon={Activity} label="Platform" value={health ? "Live" : "Offline"} color="bg-green-600" />
          </>
        )}
      </div>

      {/* Providers */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <Zap size={14} className="text-amber-400" /> LLM Providers
        </h2>
        {providersLoading ? (
          <ProviderListSkeleton />
        ) : providersQuery.isError ? (
          <p className="text-sm text-red-400 py-2">Unable to load providers.</p>
        ) : (
          <div className="space-y-2">
            {providers?.providers?.map((p: any) => (
              <div key={p.name} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <span className="text-sm text-gray-300 capitalize">{p.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{p.default_model}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.available ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-500"}`}>
                    {p.available ? "Connected" : "No key"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <TrendingUp size={14} className="text-indigo-400" /> Quick Start
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/agents", label: "Create Agent", desc: "Define a new AI agent" },
            { href: "/workflows", label: "Build Workflow", desc: "Design an automation" },
            { href: "/rag", label: "Add Knowledge", desc: "Upload documents" },
            { href: "/chat", label: "Start Chat", desc: "Talk to your agents" },
          ].map(item => (
            <a key={item.href} href={item.href}
              className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all motion-reduce:transition-none motion-reduce:transform-none duration-200 cursor-pointer active:scale-95">
              <p className="text-sm font-medium text-white">{item.label}</p>
              <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
