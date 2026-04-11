import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("nexusai_token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("nexusai_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// SSE streaming helper
export function streamChat(messages: any[], provider = "nvidia", onToken: (t: string) => void, onDone: () => void) {
  const token = localStorage.getItem("nexusai_token");
  const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/llm/chat`;

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages, provider, stream: true }),
  }).then(async (res) => {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") { onDone(); return; }
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) onToken(parsed.content);
          } catch {}
        }
      }
    }
    onDone();
  });
}
