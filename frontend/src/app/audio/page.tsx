"use client";
import { useState } from "react";
import { Mic, Upload, FileAudio, Globe } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function AudioPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [modelSize, setModelSize] = useState("base");
  const [translate, setTranslate] = useState(false);

  const transcribe = async () => {
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.post(
        `/api/v1/audio/transcribe?model_size=${modelSize}&translate=${translate}`, fd
      );
      setResult(res.data);
      toast.success("Transcription complete!");
    } catch { toast.error("Transcription failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Audio Transcription</h1>
          <p className="text-gray-400 text-sm mt-1">Transcribe and translate audio with Whisper</p>
        </div>

        <div className="max-w-2xl">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4">
            {/* Upload */}
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-indigo-500 transition-colors mb-4">
              <FileAudio size={24} className="text-gray-500 mb-2" />
              <p className="text-sm text-gray-400">{file ? file.name : "Click to upload audio (MP3, WAV, M4A)"}</p>
              <input type="file" className="hidden" accept="audio/*" onChange={e => setFile(e.target.files?.[0] || null)} />
            </label>

            {/* Options */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Model Size</label>
                <select
                  value={modelSize}
                  onChange={e => setModelSize(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {["tiny","base","small","medium","large"].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setTranslate(t => !t)}
                    className={`w-10 h-5 rounded-full transition-colors ${translate ? "bg-indigo-600" : "bg-gray-700"} relative`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${translate ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-sm text-gray-300 flex items-center gap-1">
                    <Globe size={12} /> Translate to English
                  </span>
                </label>
              </div>
            </div>

            <button
              onClick={transcribe}
              disabled={!file || loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm text-white font-medium"
            >
              {loading ? "Transcribing..." : "Transcribe"}
            </button>
          </div>

          {result && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-300">Result</h2>
                <span className="text-xs text-gray-500">Language: {result.language} · Model: {result.model}</span>
              </div>
              <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{result.text}</p>

              {result.segments?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-xs text-gray-500 mb-2">Segments</p>
                  <div className="space-y-1 max-h-48 overflow-auto">
                    {result.segments.map((s: any, i: number) => (
                      <div key={i} className="flex gap-3 text-xs">
                        <span className="text-indigo-400 flex-shrink-0">{s.start.toFixed(1)}s</span>
                        <span className="text-gray-400">{s.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
