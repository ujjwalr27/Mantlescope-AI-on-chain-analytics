import { MessageSquare } from "lucide-react";
import { ChatWindow } from "@/components/chat/ChatWindow";

export default function ChatPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold">AI Chat</h1>
        <span className="ml-auto text-xs text-muted-foreground">Powered by Groq · llama-3.3-70b-versatile</span>
      </div>
      <ChatWindow />
    </div>
  );
}
