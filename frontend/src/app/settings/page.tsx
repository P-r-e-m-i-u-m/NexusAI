"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, KeyRound, Link2, Save, Server, Settings as SettingsIcon, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { api } from "@/lib/api";
import { Skeleton, useMinimumLoading } from "@/components/ui/Skeleton";

const defaultApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function ProviderSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-800 px-4 py-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-5 w-20 rounded-full" />
    </div>
  );
}

export default function SettingsPage() {
  const [apiUrl, setApiUrl] = useState(defaultApiUrl);
  const [token, setToken] = useState("");

  useEffect(() => {
    setApiUrl(localStorage.getItem("nexusai_api_url") || defaultApiUrl);
    setToken(localStorage.getItem("nexusai_token") || "");
  }, []);

  const providersQuery = useQuery({
    queryKey: ["settings", "providers"],
    queryFn: () => api.get("/api/v1/llm/providers").then((response) => response.data),
  });
  const healthQuery = useQuery({
    queryKey: ["settings", "health"],
    queryFn: () => api.get("/health").then((response) => response.data),
  });
  const providers = providersQuery.data?.providers ?? [];
  const providersLoading = useMinimumLoading(providersQuery.isLoading);

  const saveConnection = () => {
    localStorage.setItem("nexusai_api_url", apiUrl.trim() || defaultApiUrl);
    if (token.trim()) {
      localStorage.setItem("nexusai_token", token.trim());
    } else {
      localStorage.removeItem("nexusai_token");
    }
    toast.success("Settings saved");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="mt-1 text-sm text-gray-400">Connection, provider, and runtime preferences</p>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-5 xl:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <Link2 size={16} className="text-indigo-400" />
              <h2 className="text-sm font-semibold text-gray-300">API Connection</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Backend URL</label>
                <input
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                  value={apiUrl}
                  onChange={(event) => setApiUrl(event.target.value)}
                  placeholder="http://localhost:8000"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Access token</label>
                <input
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="Paste a bearer token for authenticated endpoints"
                  type="password"
                />
              </div>
              <button
                onClick={saveConnection}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                <Save size={15} />
                Save Settings
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Server size={16} className="text-green-400" />
              <h2 className="text-sm font-semibold text-gray-300">Runtime</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500">API health</p>
                <p className={`mt-1 text-xl font-semibold ${healthQuery.data?.status === "ok" ? "text-green-300" : "text-red-300"}`}>
                  {healthQuery.data?.status === "ok" ? "Operational" : "Unavailable"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Environment</p>
                <p className="mt-1 text-xl font-semibold text-white">Web app</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Authentication</p>
                <p className="mt-1 text-sm text-gray-300">{token ? "Token stored locally" : "No token stored"}</p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-5 xl:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <Zap size={16} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-gray-300">LLM Providers</h2>
            </div>
            {providersLoading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((item) => <ProviderSkeleton key={item} />)}
              </div>
            ) : providersQuery.isError ? (
              <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">
                Unable to load provider configuration.
              </div>
            ) : (
              <div className="space-y-2">
                {providers.map((provider: any) => (
                  <div key={provider.name} className="flex items-center justify-between rounded-lg bg-gray-800 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium capitalize text-white">{provider.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{provider.default_model}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                        provider.available ? "bg-green-950 text-green-300" : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      {provider.available && <CheckCircle2 size={12} />}
                      {provider.available ? "Connected" : "No key"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="mb-4 flex items-center gap-2">
              <SettingsIcon size={16} className="text-indigo-400" />
              <h2 className="text-sm font-semibold text-gray-300">Preferences</h2>
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between rounded-lg bg-gray-800 px-4 py-3">
                <span className="text-sm text-gray-300">Dark theme</span>
                <input type="checkbox" checked readOnly className="h-4 w-4 accent-indigo-600" />
              </label>
              <label className="flex items-center justify-between rounded-lg bg-gray-800 px-4 py-3">
                <span className="text-sm text-gray-300">30s monitor refresh</span>
                <input type="checkbox" checked readOnly className="h-4 w-4 accent-indigo-600" />
              </label>
              <div className="rounded-lg bg-gray-800 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <KeyRound size={14} className="text-gray-500" />
                  Secrets stay in backend environment variables.
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
