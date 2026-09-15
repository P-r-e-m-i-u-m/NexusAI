import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const baseURL = localStorage.getItem("nexusai_api_url");
    const token = localStorage.getItem("nexusai_token");

    if (baseURL) config.baseURL = baseURL;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
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

// SSE streaming helper.
//
// Uses `fetch` rather than the axios instance above, so the axios `timeout`
// does not apply here. Without an explicit timeout a stalled backend leaves the
// caller waiting forever with no way to recover (see issue #20), so the stream
// is guarded by an inactivity timeout and an AbortController.

/** Milliseconds of silence (no response, or no further tokens) before giving up. */
export const CHAT_STREAM_TIMEOUT_MS = 30_000;

export interface StreamChatOptions {
  /** Override the inactivity timeout. Pass `0` to disable it entirely. */
  timeoutMs?: number;
}

/**
 * Streams a chat completion, invoking `onToken` per token and `onDone` once the
 * stream settles for any reason. `onError` fires before `onDone` on failure.
 *
 * Returns a cancel function. Calling it aborts the request silently — no
 * callbacks fire — so callers can clean up on unmount without a state update
 * landing on an unmounted component.
 */
export function streamChat(
  messages: any[],
  provider = "nvidia",
  onToken: (t: string) => void,
  onDone: () => void,
  onError?: (message: string) => void,
  options: StreamChatOptions = {},
): () => void {
  const timeoutMs = options.timeoutMs ?? CHAT_STREAM_TIMEOUT_MS;
  const controller = new AbortController();

  let settled = false;
  let timedOut = false;
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const clearTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  // Re-armed on every chunk, so a long but healthy stream is never cut off —
  // only genuine silence trips the timeout.
  const armTimeout = () => {
    if (!timeoutMs) return;
    clearTimer();
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
  };

  const finish = (errorMessage?: string) => {
    if (settled) return;
    settled = true;
    clearTimer();
    if (errorMessage) onError?.(errorMessage);
    onDone();
  };

  const token =
    typeof window !== "undefined" ? localStorage.getItem("nexusai_token") : null;
  const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/llm/chat`;

  armTimeout();

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages, provider, stream: true }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(
          `Chat request failed (${res.status}${res.statusText ? ` ${res.statusText}` : ""})`,
        );
      }
      if (!res.body) {
        throw new Error("Chat request failed — the response contained no data.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        armTimeout();
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") { finish(); return; }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) onToken(parsed.content);
            } catch {}
          }
        }
      }
      finish();
    })
    .catch((error) => {
      if (cancelled) return;
      if (timedOut) {
        finish(
          `No response from the ${provider} provider after ${Math.round(timeoutMs / 1000)}s. Please try again.`,
        );
        return;
      }
      finish(error?.message || "Chat request failed");
    });

  return () => {
    if (settled) return;
    settled = true;
    cancelled = true;
    clearTimer();
    controller.abort();
  };
}
