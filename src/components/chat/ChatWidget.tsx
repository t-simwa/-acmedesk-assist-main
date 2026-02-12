import { useState, useRef, useEffect, useCallback } from "react";
import { X, ChevronDown } from "lucide-react";
import { ChatMessage, MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";

const MOCK_RESPONSES: Record<string, string> = {
  pricing: "AcmeDesk offers three plans:\n\n• **Starter** — $29/mo (up to 3 agents)\n• **Pro** — $79/mo (up to 10 agents, analytics)\n• **Enterprise** — Custom pricing\n\nAll plans include a 14-day free trial. You can find more details in our pricing page.",
  integrations: "AcmeDesk integrates with Slack, Microsoft Teams, Jira, Salesforce, HubSpot, and Zendesk. We also offer a REST API and webhooks for custom integrations.",
  setup: "Getting started is simple:\n\n1. Sign up at acmedesk.com\n2. Add your first inbox (email, chat, or social)\n3. Invite your team members\n4. Install our widget on your website\n\nThe whole process takes about 10 minutes.",
  sla: "Our SLA response times depend on your plan:\n\n• **Starter** — 24 hours\n• **Pro** — 4 hours\n• **Enterprise** — 1 hour with dedicated support\n\nWe maintain 99.9% uptime across all plans.",
  default: "I found some relevant information in our documentation, but I'm not fully confident in my answer for this specific question. Let me connect you with a support agent who can help.\n\nWould you like me to escalate this to our team?",
};

function getMockResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("pric") || lower.includes("cost") || lower.includes("plan")) return MOCK_RESPONSES.pricing;
  if (lower.includes("integrat") || lower.includes("connect") || lower.includes("slack")) return MOCK_RESPONSES.integrations;
  if (lower.includes("setup") || lower.includes("start") || lower.includes("install") || lower.includes("begin")) return MOCK_RESPONSES.setup;
  if (lower.includes("sla") || lower.includes("uptime") || lower.includes("support")) return MOCK_RESPONSES.sla;
  return MOCK_RESPONSES.default;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi there! 👋 I'm here to help with questions about AcmeDesk — pricing, setup, integrations, and more. What can I help you with?",
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const handleSend = async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

    const response = getMockResponse(text);
    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: response,
      timestamp: new Date(),
      sources: ["Getting Started Guide", "FAQ"],
    };

    setIsTyping(false);
    setMessages((prev) => [...prev, assistantMsg]);
  };

  return (
    <>
      {/* Chat Panel */}
      <div
        ref={panelRef}
        className={`fixed bottom-24 right-6 z-50 w-[380px] max-h-[560px] flex flex-col rounded-2xl overflow-hidden bg-background shadow-chat border border-border transition-all duration-250 ease-out origin-bottom-right ${
          isOpen
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 translate-y-3 pointer-events-none"
        }`}
        style={{ transitionProperty: "opacity, transform" }}
      >
        {/* Header — Intercom-style with agent identity */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-background">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-[13px] font-semibold text-primary">
                A
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-status-online border-2 border-background" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-foreground leading-tight">
                AcmeDesk
              </h3>
              <p className="text-[12px] text-muted-foreground">
                Active now
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronDown size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 chat-messages min-h-[280px] max-h-[380px] bg-background">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={isTyping} />
      </div>

      {/* Floating Button — clean, no generic icons */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 ${
          isOpen
            ? "w-12 h-12 rounded-full bg-muted text-muted-foreground shadow-soft-md"
            : "h-12 px-5 rounded-full bg-foreground text-background shadow-soft-lg gap-2"
        }`}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <X size={18} />
        ) : (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-online opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-online" />
            </span>
            <span className="text-[13px] font-medium">Chat with us</span>
          </>
        )}
      </button>
    </>
  );
}
