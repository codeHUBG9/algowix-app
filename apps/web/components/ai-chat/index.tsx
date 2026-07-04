"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, Send, Copy, ThumbsUp, ThumbsDown, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAiChatStore } from "../../lib/stores/ai-chat-store";
import { useAiChat } from "../../lib/hooks/use-ai-chat";
import { suggestedPromptsForPath } from "./suggested-prompts";
import { cn } from "../../lib/utils";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded p-1 text-slate-400 hover:bg-surface-subtle hover:text-slate-600"
      aria-label="Copy message"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function FeedbackButtons() {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setFeedback("up")}
        className={cn("rounded p-1 hover:bg-surface-subtle", feedback === "up" ? "text-emerald-600" : "text-slate-400")}
        aria-label="Good response"
      >
        <ThumbsUp size={13} />
      </button>
      <button
        onClick={() => setFeedback("down")}
        className={cn("rounded p-1 hover:bg-surface-subtle", feedback === "down" ? "text-red-600" : "text-slate-400")}
        aria-label="Bad response"
      >
        <ThumbsDown size={13} />
      </button>
    </div>
  );
}

export function AiChatDrawer() {
  const pathname = usePathname() ?? "/";
  const { open, setOpen } = useAiChatStore();
  const { messages, sendMessage, isStreaming, error } = useAiChat(`User is on ${pathname}`);
  const [input, setInput] = useState("");

  function handleSubmit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    sendMessage(trimmed);
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-float transition-transform hover:scale-105"
          aria-label="Open AI Chat"
        >
          <Sparkles size={22} />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]"
              onClick={() => setOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-label="AI Chat"
              initial={{ x: 420 }}
              animate={{ x: 0 }}
              exit={{ x: 420 }}
              transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-border bg-surface shadow-modal"
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-brand-600" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">AlgoWix AI</span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-surface-subtle hover:text-slate-700"
                  aria-label="Close AI Chat"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-500">Try asking:</p>
                    {suggestedPromptsForPath(pathname).map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleSubmit(prompt)}
                        className="block w-full rounded-lg border border-border px-3 py-2 text-left text-sm text-slate-600 hover:border-brand-300 hover:bg-brand-50 dark:text-slate-300 dark:hover:bg-brand-950/30"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {messages.map((message) => (
                  <div key={message.id} className={cn("flex flex-col gap-1", message.role === "user" ? "items-end" : "items-start")}>
                    <div
                      className={cn(
                        "max-w-[90%] rounded-xl px-3 py-2 text-sm",
                        message.role === "user"
                          ? "bg-brand-600 text-white"
                          : "prose prose-sm max-w-none bg-surface-subtle text-slate-700 dark:text-slate-200 prose-pre:bg-surface-overlay"
                      )}
                    >
                      {message.role === "assistant" ? (
                        message.content ? (
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        ) : (
                          <span className="inline-flex gap-1">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                          </span>
                        )
                      ) : (
                        message.content
                      )}
                    </div>
                    {message.role === "assistant" && message.content && (
                      <div className="flex items-center gap-1 px-1">
                        <CopyButton text={message.content} />
                        <FeedbackButtons />
                      </div>
                    )}
                  </div>
                ))}

                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                    {error}
                  </p>
                )}
              </div>

              <form
                className="flex shrink-0 items-center gap-2 border-t border-border p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit(input);
                }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask AI about this page..."
                  className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
                <button
                  type="submit"
                  disabled={isStreaming || !input.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white disabled:opacity-50"
                  aria-label="Send"
                >
                  <Send size={15} />
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
