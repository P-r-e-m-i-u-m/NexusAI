"use client";

import { useRef, useState } from "react";
import {
  FileAudio,
  Globe,
  Copy,
  Download,
  Upload,
} from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Sidebar } from "@/components/dashboard/Sidebar";

type Segment = {
  start: number;
  end: number;
  text: string;
};

type TranscriptionResult = {
  text: string;
  language: string;
  model: string;
  segments?: Segment[];
};

export default function AudioPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [modelSize, setModelSize] = useState("base");
  const [translate, setTranslate] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
  const ALLOWED_TYPES = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/x-m4a",
    "audio/aac",
    "audio/ogg",
    "audio/webm",
    "audio/flac",
  ];

  const validateAndSetFile = (selectedFile: File | null) => {
    if (!selectedFile) return;

    const isValidType =
      ALLOWED_TYPES.includes(selectedFile.type) ||
      /\.(mp3|wav|m4a|aac|ogg|webm|flac)$/i.test(selectedFile.name);

    if (!isValidType) {
      toast.error(
        "Please upload a valid audio file (MP3, WAV, M4A, AAC, OGG, WEBM, FLAC)"
      );
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("File size must be under 50 MB");
      return;
    }

    setFile(selectedFile);
    setResult(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndSetFile(e.target.files?.[0] || null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0] || null;
    validateAndSetFile(droppedFile);
  };

  const transcribe = async () => {
    if (!file) {
      toast.error("Please select an audio file first");
      return;
    }

    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await api.post(
        `/api/v1/audio/transcribe?model_size=${modelSize}&translate=${translate}`,
        fd
      );
      setResult(res.data);
      toast.success("Transcription complete!");
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ||
        "Transcription failed. Please make sure the backend is running.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!result?.text) return;

    try {
      await navigator.clipboard.writeText(result.text);
      toast.success("Transcript copied!");
    } catch {
      toast.error("Failed to copy transcript");
    }
  };

  const downloadText = () => {
    if (!result?.text) return;

    const blob = new Blob([result.text], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "transcript.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    const hh = String(hrs).padStart(2, "0");
    const mm = String(mins).padStart(2, "0");
    const ss = String(secs).padStart(2, "0");
    const mmm = String(ms).padStart(3, "0");

    return `${hh}:${mm}:${ss},${mmm}`;
  };

  const downloadSrt = () => {
    if (!result?.segments?.length) {
      toast.error("No segments available for SRT download");
      return;
    }

    const srtContent = result.segments
      .map((segment, index) => {
        return `${index + 1}
${formatTimestamp(segment.start)} --> ${formatTimestamp(segment.end)}
${segment.text.trim()}
`;
      })
      .join("\n");

    const blob = new Blob([srtContent], {
      type: "application/x-subrip;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "transcript.srt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar />

      <main id="main-content" className="flex-1 overflow-auto p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Audio Transcription</h1>
          <p className="mt-1 text-sm text-gray-400">
            Upload or drag-and-drop audio files to transcribe and translate with
            Whisper
          </p>
        </div>

        <div className="max-w-3xl">
          <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900 p-6">
            {/* Upload */}
            <div
              onClick={openFilePicker}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`mb-4 flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                dragActive
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-gray-700 hover:border-indigo-500"
              }`}
            >
              <div className="mb-3 rounded-full bg-gray-800 p-3">
                {file ? (
                  <FileAudio size={24} className="text-indigo-400" />
                ) : (
                  <Upload size={24} className="text-gray-400" />
                )}
              </div>

              <p className="text-sm font-medium text-white">
                {file ? file.name : "Drag & drop your audio file here"}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                {file
                  ? `${(file.size / (1024 * 1024)).toFixed(2)} MB selected`
                  : "or click to browse files"}
              </p>

              <p className="mt-3 text-xs text-gray-500">
                Supported: MP3, WAV, M4A, AAC, OGG, WEBM, FLAC · Max 50 MB
              </p>

              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".mp3,.wav,.m4a,.aac,.ogg,.webm,.flac,audio/*"
                onChange={handleFileInputChange}
              />
            </div>

            {/* Options */}
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end">
              <div className="w-full md:flex-1">
                <label className="mb-1 block text-xs text-gray-400">
                  Model Size
                </label>
                <select
                  value={modelSize}
                  onChange={(e) => setModelSize(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                >
                  {["tiny", "base", "small", "medium", "large"].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Larger models are slower but more accurate.
                </p>
              </div>

              <div className="flex md:pb-6">
                <button
                  type="button"
                  onClick={() => setTranslate((t) => !t)}
                  className="flex items-center gap-3 text-left"
                >
                  <div
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      translate ? "bg-indigo-600" : "bg-gray-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        translate ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </div>

                  <span className="flex items-center gap-1 text-sm text-gray-300">
                    <Globe size={12} /> Translate to English
                  </span>
                </button>
              </div>
            </div>

            <button
              onClick={transcribe}
              disabled={!file || loading}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Transcribing..." : "Transcribe"}
              {loading && (
                <div className="mt-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-indigo-300">
                    <span>Transcription in progress...</span>
                    <span>Processing...</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                  <div className="h-full w-full animate-pulse rounded-full bg-indigo-500" />
                </div>
                  <p className="mt-2 text-xs text-gray-400">
                    Processing audio...
                  </p>
                </div>
              )}
            </button>
          </div>

          {result && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-300">Result</h2>
                  <span className="text-xs text-gray-500">
                    Language: {result.language} · Model: {result.model}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-200 transition-colors hover:border-gray-600 hover:bg-gray-700"
                  >
                    <Copy size={14} />
                    Copy
                  </button>

                  <button
                    onClick={downloadText}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-200 transition-colors hover:border-gray-600 hover:bg-gray-700"
                  >
                    <Download size={14} />
                    TXT
                  </button>

                  <button
                    onClick={downloadSrt}
                    disabled={!result.segments?.length}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-200 transition-colors hover:border-gray-600 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download size={14} />
                    SRT
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
                  {result.text}
                </p>
              </div>

              {result.segments && result.segments.length > 0 && (
                <div className="mt-4 border-t border-gray-800 pt-4">
                  <p className="mb-2 text-xs text-gray-500">
                    Timestamped Segments
                  </p>
                  <div className="max-h-64 space-y-2 overflow-auto rounded-lg border border-gray-800 bg-gray-950 p-3">
                    {result.segments.map((segment, index) => (
                      <div
                        key={index}
                        className="flex gap-3 text-xs sm:text-sm"
                      >
                        <span className="w-24 flex-shrink-0 font-medium text-indigo-400">
                          {segment.start.toFixed(1)}s → {segment.end.toFixed(1)}s
                        </span>
                        <span className="text-gray-300">{segment.text}</span>
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