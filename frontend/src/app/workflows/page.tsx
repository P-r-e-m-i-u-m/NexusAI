"use client";
import { useState, useCallback } from "react";
import ReactFlow, {
  addEdge, Background, Controls, MiniMap,
  useNodesState, useEdgesState, Connection,
} from "reactflow";
import "reactflow/dist/style.css";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GitBranch, Plus, Save, Play } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Sidebar } from "@/components/dashboard/Sidebar";

const NODE_TYPES_LIST = [
  { type: "llm", label: "LLM Call", color: "bg-indigo-600" },
  { type: "agent", label: "Agent", color: "bg-purple-600" },
  { type: "rag", label: "RAG Query", color: "bg-blue-600" },
  { type: "input", label: "Input", color: "bg-green-600" },
  { type: "output", label: "Output", color: "bg-amber-600" },
  { type: "condition", label: "Condition", color: "bg-red-600" },
];

let nodeId = 1;

export default function WorkflowsPage() {
  const qc = useQueryClient();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [wfName, setWfName] = useState("My Workflow");
  const [selectedWf, setSelectedWf] = useState<any>(null);

  const { data: workflows = [] } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => api.get("/api/v1/workflows/").then(r => r.data),
  });

  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({ ...params, animated: true, style: { stroke: "#6366f1" } }, eds));
  }, [setEdges]);

  const addNode = (type: string, label: string) => {
    const id = `node_${nodeId++}`;
    setNodes(ns => [...ns, {
      id,
      type: "default",
      position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 },
      data: { label: `${label}\n#${nodeId}` },
      style: { background: "#1f2937", color: "#f3f4f6", border: "1px solid #374151", borderRadius: 8, fontSize: 12 },
    }]);
  };

  const save = useMutation({
    mutationFn: () => api.post("/api/v1/workflows/", {
      name: wfName,
      graph: { nodes: nodes.map(n => ({ id: n.id, type: n.data.label, position: n.position })), edges },
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workflows"] }); toast.success("Workflow saved!"); },
  });

  const runWf = async (id: string) => {
    try {
      await api.post(`/api/v1/workflows/${id}/run`, { input_data: {} });
      toast.success("Workflow started!");
    } catch { toast.error("Run failed"); }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar />
      <main id="main-content" className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <input
              className="bg-transparent text-white font-bold text-lg border-b border-transparent hover:border-gray-600 focus:border-indigo-500 focus:outline-none px-1"
              value={wfName}
              onChange={e => setWfName(e.target.value)}
            />
          </div>
          <button onClick={() => save.mutate()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white">
            <Save size={14} /> Save
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Node palette */}
          <div className="w-48 flex-shrink-0 bg-gray-900 border-r border-gray-800 p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Add Nodes</p>
            <div className="space-y-1">
              {NODE_TYPES_LIST.map(({ type, label, color }) => (
                <button
                  key={type}
                  onClick={() => addNode(type, label)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 text-sm text-gray-300 text-left"
                >
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-800">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Saved</p>
              {workflows.map((wf: any) => (
                <div key={wf.id} className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 truncate flex-1">{wf.name}</span>
                  <button onClick={() => runWf(wf.id)} className="text-indigo-400 hover:text-indigo-300 ml-2">
                    <Play size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
            >
              <Background color="#374151" gap={20} />
              <Controls />
              <MiniMap style={{ background: "#111827" }} />
            </ReactFlow>
          </div>
        </div>
      </main>
    </div>
  );
}
