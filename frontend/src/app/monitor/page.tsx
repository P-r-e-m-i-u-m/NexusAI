"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertCircle, CheckCircle2, Clock, Database, Server, Wifi } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { api } from "@/lib/api";
import { Skeleton, useMinimumLoading } from "@/components/ui/Skeleton";

type MetricSummary = {
  requestCount: string;
  averageLatency: string;
  activeRequests: string;
};

function parseMetricValue(metrics: string, name: string) {
  const line = metrics
    .split("\n")
    .find((entry) => entry.startsWith(name) && !entry.startsWith("#"));
  const value = Number(line?.trim().split(/\s+/).pop());
  return Number.isFinite(value) ? value : 0;
}

function summarizeMetrics(metrics?: string): MetricSummary {
  if (!metrics) {
    return { requestCount: "0", averageLatency: "0 ms", activeRequests: "0" };
  }

  const requestCount =
    parseMetricValue(metrics, "http_requests_total") ||
    parseMetricValue(metrics, "http_request_duration_seconds_count");
  const latencySum = parseMetricValue(metrics, "http_request_duration_seconds_sum");
  const latencyCount = parseMetricValue(metrics, "http_request_duration_seconds_count");
  const activeRequests = parseMetricValue(metrics, "http_requests_inprogress");
  const averageLatency = latencyCount > 0 ? `${Math.round((latencySum / latencyCount) * 1000)} ms` : "0 ms";

  return {
    requestCount: requestCount.toLocaleString(),
    averageLatency,
    activeRequests: activeRequests.toLocaleString(),
  };
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
        ok ? "bg-green-950 text-green-300" : "bg-red-950 text-red-300"
      }`}
    >
      {ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
      {label}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, tone }: any) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-gray-400">{label}</span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function MetricCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

export default function MonitorPage() {
  const healthQuery = useQuery({
    queryKey: ["monitor", "health"],
    queryFn: () => api.get("/health").then((response) => response.data),
    refetchInterval: 30_000,
  });
  const readyQuery = useQuery({
    queryKey: ["monitor", "ready"],
    queryFn: () => api.get("/health/ready").then((response) => response.data),
    refetchInterval: 30_000,
  });
  const metricsQuery = useQuery({
    queryKey: ["monitor", "metrics"],
    queryFn: () => api.get("/metrics", { responseType: "text" }).then((response) => response.data as string),
    refetchInterval: 30_000,
  });

  const loading = useMinimumLoading(healthQuery.isLoading || readyQuery.isLoading || metricsQuery.isLoading);
  const summary = useMemo(() => summarizeMetrics(metricsQuery.data), [metricsQuery.data]);
  const apiOnline = healthQuery.data?.status === "ok";
  const dependenciesReady = readyQuery.data?.status === "ready" || readyQuery.data?.ok === true;
  const hasError = healthQuery.isError || readyQuery.isError || metricsQuery.isError;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Monitor</h1>
            <p className="mt-1 text-sm text-gray-400">API health, dependencies, and runtime metrics</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <StatusPill ok={apiOnline} label={apiOnline ? "API online" : "API offline"} />
            <StatusPill ok={dependenciesReady} label={dependenciesReady ? "Ready" : "Not ready"} />
          </div>
        </div>

        {hasError && (
          <div className="mb-5 rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">
            Some monitor data failed to load. Confirm the backend is running and reachable.
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            [0, 1, 2, 3].map((item) => <MetricCardSkeleton key={item} />)
          ) : (
            <>
              <MetricCard icon={Server} label="API Status" value={apiOnline ? "Online" : "Offline"} tone="bg-green-600" />
              <MetricCard icon={Database} label="Dependencies" value={dependenciesReady ? "Ready" : "Check"} tone="bg-blue-600" />
              <MetricCard icon={Activity} label="Requests" value={summary.requestCount} tone="bg-indigo-600" />
              <MetricCard icon={Clock} label="Avg Latency" value={summary.averageLatency} tone="bg-amber-600" />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-5 xl:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <Wifi size={16} className="text-indigo-400" />
              <h2 className="text-sm font-semibold text-gray-300">Service Checks</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: "Health endpoint", value: healthQuery.data?.status ?? "unavailable", ok: apiOnline },
                { label: "Readiness endpoint", value: readyQuery.data?.status ?? "unavailable", ok: dependenciesReady },
                { label: "Metrics endpoint", value: metricsQuery.data ? "collecting" : "unavailable", ok: Boolean(metricsQuery.data) },
              ].map((check) => (
                <div key={check.label} className="flex items-center justify-between rounded-lg bg-gray-800 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{check.label}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{check.value}</p>
                  </div>
                  <StatusPill ok={check.ok} label={check.ok ? "OK" : "Issue"} />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Activity size={16} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-gray-300">Traffic</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500">Active requests</p>
                <p className="mt-1 text-xl font-semibold text-white">{summary.activeRequests}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Refresh interval</p>
                <p className="mt-1 text-xl font-semibold text-white">30s</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Metrics source</p>
                <p className="mt-1 text-sm text-gray-300">Prometheus `/metrics`</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
