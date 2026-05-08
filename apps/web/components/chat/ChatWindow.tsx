"use client";

import { useChat } from "ai/react";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTED = [
  "Which wallets are accumulating MNT this week?",
  "What is the current TVL trend on Mantle?",
  "Are there any anomalies in the last 15 minutes?",
  "How healthy is Agni Finance right now?",
  "Compare lending rates on Lendle vs Aurelius",
];

export function ChatWindow() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });

  return (
    <div className="flex flex-col h-full rounded-xl border border-border bg-card overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <Sparkles className="w-8 h-8 text-primary/60" />
            <p className="text-sm">Ask anything about Mantle on-chain activity</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => handleInputChange({ target: { value: q } } as React.ChangeEvent<HTMLInputElement>)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-secondary hover:bg-secondary/80 hover:text-foreground transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-secondary text-foreground rounded-tl-sm"
              )}
            >
              {m.content}
            </div>
            {m.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-muted-foreground">
              <span className="animate-pulse">Analyzing on-chain data...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about wallets, protocols, anomalies..."
          className="flex-1 bg-secondary rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
