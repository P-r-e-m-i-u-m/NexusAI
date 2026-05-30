"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Database, Upload, Search, Plus, FileText } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function RAGPage() {
  const qc = useQueryClient();
  const [selectedKb, setSelectedKb] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [kbName, setKbName] = useState("");

  const { data: kbs = [] } = useQuery({
    queryKey: ["kbs"],
    queryFn: () => api.post("/api/v1/rag/kb", { name: "__list__" }).then(() => []).catch(() => []),
  });

  const createKb = async () => {
    if (!kbName) return;
    try {
      const res = await api.post("/api/v1/rag/kb", { name: kbName });
      setSelectedKb(res.data.id);
      setKbName("");
      toast.success("Knowledge base created!");
    } catch { toast.error("Failed to create KB"); }
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedKb || !e.target.files?.[0]) return;
    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    try {
      const res = await api.post(`/api/v1/rag/kb/${selectedKb}/upload`, formData);
      toast.success(`Indexed ${res.data.chunks} chunks from ${res.data.filename}`);
    } catch { toast.error("Upload failed"); }
  };

  const query = async () => {
    if (!selectedKb || !question) return;
    setLoading(true);
    try {
      const res = await api.post(`/api/v1/rag/kb/${selectedKb}/query`, { question, provider: "nvidia" });
      setAnswer(res.data);
    } catch { toast.error("Query failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar />
      <main id="main-content" className="flex-1 overflow-auto p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
          <p className="text-gray-400 text-sm mt-1">Upload documents and query with RAG</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create KB */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Plus size={14} /> New Knowledge Base
            </h2>
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 mb-3"
              placeholder="KB name..."
              value={kbName}
              onChange={e => setKbName(e.target.value)}
            />
            <button onClick={createKb} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white">
              Create
            </button>

            {selectedKb && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-400 mb-2">Upload to selected KB</p>
                <label className="flex items-center gap-2 py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-pointer text-sm text-gray-300">
                  <Upload size={14} /> Upload Document
                  <input type="file" className="hidden" accept=".pdf,.txt,.md,.docx" onChange={uploadFile} />
                </label>
              </div>
            )}
          </div>

          {/* Query */}
          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Search size={14} /> Ask Your Documents
            </h2>
            {!selectedKb ? (
              <p className="text-gray-500 text-sm py-8 text-center">Create a knowledge base first</p>
            ) : (
              <>
                <div className="flex gap-2 mb-4">
                  <input
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
                    placeholder="Ask a question about your documents..."
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && query()}
                  />
                  <button onClick={query} disabled={loading || !question}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white disabled:opacity-50">
                    {loading ? "..." : "Ask"}
                  </button>
                </div>

                {answer && (
                  <div className="space-y-3">
                    <div className="p-4 bg-gray-800 rounded-lg">
                      <p className="text-xs text-indigo-400 mb-2 font-medium">Answer</p>
                      <p className="text-sm text-gray-200 whitespace-pre-wrap">{answer.answer}</p>
                    </div>
                    {answer.sources?.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Sources</p>
                        {answer.sources.map((s: any, i: number) => (
                          <div key={i} className="p-3 bg-gray-800 rounded-lg mb-2 text-xs">
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-400 flex items-center gap-1"><FileText size={10} /> {s.filename}</span>
                              <span className="text-indigo-400">{(s.score * 100).toFixed(0)}%</span>
                            </div>
                            <p className="text-gray-500 line-clamp-2">{s.chunk}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
