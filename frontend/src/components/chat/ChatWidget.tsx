import { useState, useRef, useEffect, useCallback } from "react";
import { X, ChevronDown } from "lucide-react";
import { ChatMessage, MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { MessageSkeleton } from "./MessageSkeleton";
import { chatApi, type ChatResponse, type ApiError } from "@/lib/api";
import { formatResponse } from "@/utils/formatResponse";

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
  const [sessionId] = useState<string>(() => `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // F4.1 - Keyboard Navigation: Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs, textareas, or when a modal is open
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        document.querySelector('[role="dialog"]')
      ) {
        return;
      }

      // `/` key to focus chat input (only when chat is open)
      if (e.key === "/" && isOpen) {
        e.preventDefault();
        chatInputRef.current?.focus();
      }

      // `Esc` key to close chat widget
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
        // Return focus to the floating button
        setTimeout(() => {
          const floatingButton = document.querySelector('[aria-label*="chat"]') as HTMLButtonElement;
          floatingButton?.focus();
        }, 100);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSend = async (text: string, retryMessageId?: string) => {
    // If retrying, remove the error message first
    if (retryMessageId) {
      setMessages((prev) => prev.filter((msg) => msg.id !== retryMessageId));
    }

    // Add user message (only if not retrying)
    if (!retryMessageId) {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
    }

    setIsTyping(true);

    try {
      const response: ChatResponse = await chatApi.sendMessage({
        session_id: sessionId,
        message: text,
      });

      // Format the answer first (normalizes citations and structure)
      const formattedAnswer = formatResponse(response.answer);
      
      // Extract citations from formatted answer
      const citationPattern = /\[(\d+)\]/g;
      const citations = new Set<number>();
      let match;
      while ((match = citationPattern.exec(formattedAnswer)) !== null) {
        citations.add(parseInt(match[1]));
      }

      // Map sources by their position (citation numbers are 1-indexed, matching chunk order)
      // The backend returns sources in the order they were used (chunk 1, chunk 2, etc.)
      const numberedSources: Array<{ index: number; title: string; doc_id: string }> = [];
      const seenDocIds = new Set<string>();
      
      // Process sources in order and assign citation numbers
      response.sources.forEach((source, idx) => {
        const citationNum = idx + 1; // 1-indexed citation number
        
        // Only include if this citation number appears in the answer
        if (citations.has(citationNum)) {
          // Deduplicate by doc_id (if same doc appears multiple times, only show once)
          const key = source.doc_id || 'unknown';
          if (!seenDocIds.has(key)) {
            // Use title if available, otherwise format doc_id
            let displayName = source.title;
            if (!displayName && source.doc_id) {
              displayName = source.doc_id
                .replace(/-/g, ' ')
                .replace(/_/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            }
            
            numberedSources.push({
              index: citationNum,
              title: displayName || 'Unknown',
              doc_id: source.doc_id,
            });
            seenDocIds.add(key);
          }
        }
      });

      // If no citations found but sources exist, number them sequentially
      if (numberedSources.length === 0 && response.sources.length > 0) {
        const uniqueSources = new Map<string, { doc_id: string; title: string }>();
        response.sources.forEach((source) => {
          const key = source.doc_id || 'unknown';
          if (!uniqueSources.has(key)) {
            let displayName = source.title;
            if (!displayName && source.doc_id) {
              displayName = source.doc_id
                .replace(/-/g, ' ')
                .replace(/_/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            }
            uniqueSources.set(key, {
              doc_id: source.doc_id,
              title: displayName || 'Unknown',
            });
          }
        });
        
        Array.from(uniqueSources.values()).forEach((source, idx) => {
          numberedSources.push({
            index: idx + 1,
            title: source.title,
            doc_id: source.doc_id,
          });
        });
      }


      // Only include sources if:
      // 1. There are numbered sources
      // 2. The answer contains citations
      // 3. The answer is not a "no information" message
      const noInfoMessages = [
        "i don't have enough information",
        "i don't have sufficient information",
        "i cannot find",
        "no information available",
        "not enough information"
      ];
      const answerLower = formattedAnswer.toLowerCase().trim();
      const isNoInfoResponse = noInfoMessages.some(msg => answerLower.includes(msg));
      const hasCitations = citations.size > 0;
      
      // Only show sources if we have citations and it's not a "no info" response
      const shouldShowSources = numberedSources.length > 0 && hasCitations && !isNoInfoResponse;

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: formattedAnswer,
        timestamp: new Date(),
        sources: shouldShowSources ? numberedSources : undefined,
      };

      setIsTyping(false);
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      setIsTyping(false);
      
      // Determine error message based on error type
      let errorMessage = "Sorry, I encountered an error while processing your message. Please try again.";
      let errorType: "network" | "rate_limit" | "timeout" | "server_error" | "unknown" = "unknown";

      if (error && typeof error === "object" && "errorType" in error) {
        const apiError = error as ApiError;
        errorType = apiError.errorType || "unknown";
        
        switch (apiError.errorType) {
          case "network":
            errorMessage = "Unable to connect to the server. Please check your internet connection and try again.";
            break;
          case "rate_limit":
            errorMessage = apiError.message || "Rate limit exceeded. Please wait a moment and try again.";
            break;
          case "timeout":
            errorMessage = "Request took too long. Please check your connection and try again.";
            break;
          case "server_error":
            errorMessage = "Server error occurred. Please try again later.";
            break;
          default:
            errorMessage = apiError.message || errorMessage;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Create error message with retry option
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: errorMessage,
        timestamp: new Date(),
        isError: true,
        errorType,
        retryMessage: text,
      };

      setMessages((prev) => [...prev, errorMsg]);
    }
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
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            aria-label="Close chat"
          >
            <ChevronDown size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 chat-messages min-h-[280px] max-h-[380px] bg-background">
          {messages.map((msg) => (
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              onRetry={(messageId, retryMessage) => handleSend(retryMessage, messageId)}
            />
          ))}
          {isTyping && <MessageSkeleton />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput ref={chatInputRef} onSend={handleSend} disabled={isTyping} />
      </div>

      {/* Floating Button — clean, no generic icons */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${
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
