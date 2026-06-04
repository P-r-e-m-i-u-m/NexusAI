"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Plus, Play, Trash2, Zap } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Skeleton, useMinimumLoading } from "@/components/ui/Skeleton";

function AgentModal({ onClose, onSave }: any) {
  const shouldReduceMotion = useReducedMotion();
  const [form, setForm] = useState({
    name: "", role: "", goal: "", backstory: "",
    model: "openai/gpt-oss-120b", provider: "nvidia",
  });

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }} animate={{ opacity: 1 }} exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
    >
      <motion.div
        initial={shouldReduceMotion ? { scale: 1, opacity: 1 } : { scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={shouldReduceMotion ? { scale: 1, opacity: 1 } : { scale: 0.95, opacity: 0 }}
        className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg"
      >
        <h2 className="text-lg font-bold text-white mb-4">New Agent</h2>
        <div className="space-y-3">
          {[
            { key: "name", label: "Name", placeholder: "e.g. Senior Researcher" },
            { key: "role", label: "Role", placeholder: "e.g. Research Analyst" },
            { key: "goal", label: "Goal", placeholder: "What this agent tries to achieve" },
            { key: "backstory", label: "Backstory", placeholder: "Background and personality" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-gray-400 mb-1 block">{label}</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                placeholder={placeholder}
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Provider</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                value={form.provider}
                onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
              >
                {["nvidia","openai","groq","mistral","together"].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Model</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                value={form.model}
                onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:bg-gray-800 active:scale-95 transition-all motion-reduce:transition-none motion-reduce:transform-none">Cancel</button>
          <button onClick={() => onSave(form)} className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm text-white font-medium active:scale-95 transition-all motion-reduce:transition-none motion-reduce:transform-none">Create Agent</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RunModal({ agent, onClose }: any) {
  const shouldReduceMotion = useReducedMotion();
  const [task, setTask] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/api/v1/agents/${agent.id}/run`, { task });
      setResult(res.data.result);
    } catch {
      toast.error("Agent run failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }} animate={{ opacity: 1 }} exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
    >
      <motion.div
        initial={shouldReduceMotion ? { scale: 1, opacity: 1 } : { scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={shouldReduceMotion ? { scale: 1, opacity: 1 } : { scale: 0.95, opacity: 0 }}
        className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg"
      >
        <h2 className="text-lg font-bold text-white mb-1">Run Agent</h2>
        <p className="text-sm text-gray-400 mb-4">{agent.name} · {agent.role}</p>
        <textarea
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 h-24 resize-none"
          placeholder="Describe the task..."
          value={task}
          onChange={e => setTask(e.target.value)}
        />
        {result && (
          <div className="mt-3 p-3 bg-gray-800 rounded-lg text-sm text-gray-300 max-h-48 overflow-auto whitespace-pre-wrap">
            {result}
          </div>
        )}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:bg-gray-800 active:scale-95 transition-all motion-reduce:transition-none motion-reduce:transform-none">Close</button>
          <button onClick={run} disabled={loading || !task} className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm text-white font-medium disabled:opacity-50 active:scale-95 transition-all motion-reduce:transition-none motion-reduce:transform-none">
            {loading ? "Running..." : "Run"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AgentCardSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-4 w-28 mt-2" />
      <Skeleton className="h-7 w-full mt-4 rounded-lg" />
    </div>
  );
}

export default function AgentsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [runAgent, setRunAgent] = useState<any>(null);

  const agentsQuery = useQuery({
    queryKey: ["agents"],
    queryFn: () => api.get("/api/v1/agents/").then(r => r.data),
  });
  const agents = agentsQuery.data ?? [];
  const showLoading = useMinimumLoading(agentsQuery.isLoading);

  const create = useMutation({
    mutationFn: (data: any) => api.post("/api/v1/agents/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agents"] }); setShowCreate(false); toast.success("Agent created!"); },
    onError: () => toast.error("Failed to create agent"),
  });

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Agents</h1>
            <p className="text-gray-400 text-sm mt-1">Create and manage AI agents</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white font-medium active:scale-95 transition-all motion-reduce:transition-none motion-reduce:transform-none">
            <Plus size={16} /> New Agent
          </button>
        </div>

        {showLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((item) => <AgentCardSkeleton key={item} />)}
          </div>
        ) : agentsQuery.isError ? (
          <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-5 text-sm text-red-300">
            Unable to load agents. Please check the API connection and try again.
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Bot size={48} className="mx-auto mb-3 opacity-30" />
            <p>No agents yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {agents.map((agent: any) => (
              <div key={agent.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 transition-all motion-reduce:transition-none motion-reduce:transform-none duration-200 hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-900 flex items-center justify-center">
                    <Bot size={20} className="text-indigo-400" />
                  </div>
                  <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded-full">{agent.provider}</span>
                </div>
                <h3 className="font-semibold text-white">{agent.name}</h3>
                <p className="text-sm text-gray-400 mt-1">{agent.role}</p>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setRunAgent(agent)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs text-white active:scale-95 transition-all motion-reduce:transition-none motion-reduce:transform-none">
                    <Play size={12} /> Run
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {showCreate && <AgentModal onClose={() => setShowCreate(false)} onSave={(d: any) => create.mutate(d)} />}
        </AnimatePresence>
        <AnimatePresence>
          {runAgent && <RunModal agent={runAgent} onClose={() => setRunAgent(null)} />}
        </AnimatePresence>
      </main>
    </div>
  );
}
