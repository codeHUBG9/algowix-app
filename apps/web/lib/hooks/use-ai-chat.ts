"use client";

import { useCallback, useRef, useState } from "react";
import { useAiChatStore, type ChatMessage } from "../stores/ai-chat-store";

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `msg_${Date.now()}_${idCounter}`;
}

export function useAiChat(pageContext: string) {
  const { messages, addMessage, updateLastMessage } = useAiChatStore();
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      setError(null);
      const userMessage: ChatMessage = { id: nextId(), role: "user", content };
      addMessage(userMessage);
      addMessage({ id: nextId(), role: "assistant", content: "" });

      const history = [...messages, userMessage].map((m) => ({ role: m.role, content: m.content }));

      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      try {
        const res = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, pageContext }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "AI Chat request failed");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6);
            if (payload === "[DONE]") continue;
            const parsed = JSON.parse(payload) as { text?: string; error?: string };
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              accumulated += parsed.text;
              updateLastMessage(accumulated);
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, addMessage, updateLastMessage, pageContext]
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return { messages, sendMessage, isStreaming, error, stop };
}
