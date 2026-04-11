"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Zap } from "lucide-react";
import { streamChat } from "@/lib/api";
import { Sidebar } from "@/components/dashboard/Sidebar";

interface Message { role: "user" | "assistant"; content: string; }

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [provider, setProvider] = useState("nvidia");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    if (!input.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: input };
    const allMsgs = [...messages, userMsg];
    setMessages(allMsgs);
    setInput("");
    setStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages(m => [...m, assistantMsg]);

    streamChat(
      allMsgs,
      provider,
      (token) => setMessages(m => {
        const copy = [...m];
        copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + token };
        return copy;
      }),
      () => setStreaming(false),
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-white">Chat</h1>
            <p className="text-xs text-gray-400">Powered by {provider}</p>
          </div>
          <select
            value={provider}
            onChange={e => setProvider(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
          >
            {["nvidia","openai","groq","mistral","together"].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <Bot size={48} className="mx-auto mb-3 text-indigo-500 opacity-50" />
              <p className="text-gray-400">Start a conversation with your AI</p>
              <p className="text-xs text-gray-600 mt-1">Connected to NVIDIA · {provider}</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === "user" ? "bg-indigo-600" : "bg-gray-700"}`}>
                {msg.role === "user" ? <User size={14} className="text-white" /> : <Bot size={14} className="text-gray-300" />}
              </div>
              <div className={`max-w-2xl px-4 py-3 rounded-xl text-sm whitespace-pre-wrap ${msg.role === "user" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-200"}`}>
                {msg.content}
                {streaming && i === messages.length - 1 && msg.role === "assistant" && (
                  <span className="inline-block w-1 h-4 bg-gray-400 ml-1 animate-pulse" />
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-gray-800">
          <div className="flex gap-3 items-end">
            <textarea
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none max-h-32"
              placeholder="Message NexusAI..."
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || streaming}
              className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl flex items-center justify-center"
            >
              <Send size={16} className="text-white" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
