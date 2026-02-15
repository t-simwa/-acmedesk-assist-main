import { useState, useRef, useEffect, useCallback } from "react";
import React from "react";
import { X, ChevronDown, Trash2, Download } from "lucide-react";
import { ChatMessage, MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { MessageSkeleton } from "./MessageSkeleton";
import { chatApi, conversationsApi, type ChatResponse, type ApiError } from "@/lib/api";
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [sessionId] = useState<string>(() => `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);
  const [isClearing, setIsClearing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageCountRef = useRef(messages.length);
  
  // Track user message IDs for regenerate functionality
  const userMessageMapRef = useRef<Map<string, string>>(new Map()); // assistantMessageId -> userMessageId

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Track unread messages and trigger pulse animation
  useEffect(() => {
    if (!isOpen && messages.length > lastMessageCountRef.current) {
      // New messages arrived while chat is closed
      const newMessages = messages.slice(lastMessageCountRef.current);
      const assistantMessages = newMessages.filter(msg => msg.role === "assistant" && !msg.isError);
      
      if (assistantMessages.length > 0) {
        setUnreadCount(prev => prev + assistantMessages.length);
        setHasNewMessage(true);
        
        // Reset pulse animation after 3 seconds
        const timer = setTimeout(() => {
          setHasNewMessage(false);
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    } else if (isOpen) {
      // Chat is open, reset unread count and pulse
      setUnreadCount(0);
      setHasNewMessage(false);
      lastMessageCountRef.current = messages.length;
    }
  }, [messages, isOpen]);

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
      let userMessageId: string | undefined;
      if (!retryMessageId) {
        userMessageId = Date.now().toString();
        const userMsg: ChatMessage = {
          id: userMessageId,
          role: "user",
          content: text,
          timestamp: new Date(),
        };
        setMessages((prev) => {
          lastMessageCountRef.current = prev.length + 1;
          return [...prev, userMsg];
        });
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

      const assistantMsgId = (Date.now() + 1).toString();
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: formattedAnswer,
        timestamp: new Date(),
        sources: shouldShowSources ? numberedSources : undefined,
        userMessageId: userMessageId, // Track which user message triggered this
      };
      
      // Store mapping for regenerate functionality
      if (userMessageId) {
        userMessageMapRef.current.set(assistantMsgId, userMessageId);
      }

      setIsTyping(false);
      setMessages((prev) => {
        lastMessageCountRef.current = prev.length + 1;
        return [...prev, assistantMsg];
      });
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

      setMessages((prev) => {
        lastMessageCountRef.current = prev.length + 1;
        return [...prev, errorMsg];
      });
    }
  };

  const handleRegenerate = async (assistantMessageId: string, userMessageId: string) => {
    // Find the user message
    const userMessage = messages.find(msg => msg.id === userMessageId);
    if (!userMessage || userMessage.role !== "user") return;
    
    // Remove the assistant message
    setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
    
    // Regenerate by calling handleSend with the user message content
    await handleSend(userMessage.content);
  };

  const handleReactionChange = (messageId: string, reaction: "thumbs_up" | "thumbs_down" | null) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, reaction: reaction || undefined } : msg
      )
    );
  };

  const handleClearConversation = async () => {
    if (isClearing) return;
    
    if (!confirm("Are you sure you want to clear this conversation? This action cannot be undone.")) {
      return;
    }
    
    setIsClearing(true);
    try {
      await conversationsApi.deleteConversation(sessionId);
      
      // Reset to welcome message
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "Hi there! 👋 I'm here to help with questions about AcmeDesk — pricing, setup, integrations, and more. What can I help you with?",
          timestamp: new Date(),
        },
      ]);
      lastMessageCountRef.current = 1;
      userMessageMapRef.current.clear();
    } catch (error) {
      console.error("Failed to clear conversation:", error);
      alert("Failed to clear conversation. Please try again.");
    } finally {
      setIsClearing(false);
    }
  };

  const handleExportConversation = (format: "txt" | "pdf") => {
    const conversationText = messages
      .filter(msg => msg.id !== "welcome")
      .map((msg) => {
        const role = msg.role === "user" ? "You" : "AcmeDesk Assistant";
        const timestamp = new Date(msg.timestamp).toLocaleString();
        return `[${timestamp}] ${role}:\n${msg.content}\n`;
      })
      .join("\n---\n\n");

    if (format === "txt") {
      const blob = new Blob([conversationText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `acmedesk-conversation-${new Date().toISOString().split("T")[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // For PDF, we'll use a simple approach with window.print or a library
      // For now, let's create a simple HTML-based PDF export
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>AcmeDesk Conversation</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .message { margin-bottom: 20px; }
              .user { color: #0066cc; }
              .assistant { color: #666; }
              .timestamp { font-size: 12px; color: #999; }
            </style>
          </head>
          <body>
            <h1>AcmeDesk Conversation</h1>
            <p>Exported on ${new Date().toLocaleString()}</p>
            <hr>
            ${messages
              .filter(msg => msg.id !== "welcome")
              .map((msg) => {
                const role = msg.role === "user" ? "You" : "AcmeDesk Assistant";
                const timestamp = new Date(msg.timestamp).toLocaleString();
                return `
                  <div class="message">
                    <div class="timestamp">${timestamp}</div>
                    <div class="${msg.role}"><strong>${role}:</strong></div>
                    <div>${msg.content.replace(/\n/g, "<br>")}</div>
                  </div>
                `;
              })
              .join("")}
          </body>
        </html>
      `;
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `acmedesk-conversation-${new Date().toISOString().split("T")[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Suggested questions
  const suggestedQuestions = [
    "What is AcmeDesk?",
    "How much does AcmeDesk cost?",
    "What integrations does AcmeDesk support?",
    "How do I get started with AcmeDesk?",
  ];

  const handleSuggestedQuestion = (question: string) => {
    if (chatInputRef.current) {
      // Use the exposed setValue method if available, otherwise set directly
      if ((chatInputRef.current as any).setValue) {
        (chatInputRef.current as any).setValue(question);
      } else {
        chatInputRef.current.value = question;
        // Trigger input event to update state
        const event = new Event("input", { bubbles: true });
        chatInputRef.current.dispatchEvent(event);
      }
      chatInputRef.current.focus();
    }
  };

  // Check if conversation is empty (only welcome message)
  const isConversationEmpty = messages.length === 1 && messages[0].id === "welcome";

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
              <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center">
                <span className="text-[12px] font-bold text-background tracking-tight">A</span>
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
          <div className="flex items-center gap-1">
            {/* Export button */}
            {!isConversationEmpty && (
              <div className="relative group">
                <button
                  onClick={() => {
                    // Show dropdown menu (simplified - could use a proper dropdown component)
                    const format = prompt("Export format:\n1. TXT\n2. HTML (PDF-like)\n\nEnter 1 or 2:");
                    if (format === "1") {
                      handleExportConversation("txt");
                    } else if (format === "2") {
                      handleExportConversation("pdf");
                    }
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                  aria-label="Export conversation"
                  title="Export conversation"
                >
                  <Download size={16} />
                </button>
              </div>
            )}
            {/* Clear conversation button */}
            {!isConversationEmpty && (
              <button
                onClick={handleClearConversation}
                disabled={isClearing}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:opacity-50"
                aria-label="Clear conversation"
                title="Clear conversation"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              aria-label="Close chat"
            >
              <ChevronDown size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 chat-messages min-h-[280px] max-h-[380px] bg-background">
          {messages.map((msg, index) => (
            <React.Fragment key={msg.id}>
              <MessageBubble 
                message={msg} 
                onRetry={(messageId, retryMessage) => handleSend(retryMessage, messageId)}
                onRegenerate={handleRegenerate}
                onReactionChange={handleReactionChange}
              />
              {/* Suggested questions - show after welcome message */}
              {index === 0 && msg.id === "welcome" && isConversationEmpty && (
                <div className="space-y-2 mt-2">
                  <p className="text-[12px] text-muted-foreground font-medium">Suggested questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestedQuestion(question)}
                        className="px-3 py-1.5 text-[12px] text-foreground bg-muted hover:bg-muted/80 border border-border rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
          {isTyping && <MessageSkeleton />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput ref={chatInputRef} onSend={handleSend} disabled={isTyping} />
      </div>

      {/* Floating Button — clean, no generic icons */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            // Reset unread count when opening
            setUnreadCount(0);
            setHasNewMessage(false);
            lastMessageCountRef.current = messages.length;
          }
        }}
        className={`fixed bottom-6 right-6 z-50 flex items-center justify-center transition-all duration-300 ease-out hover:scale-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${
          isOpen
            ? "w-12 h-12 rounded-full bg-muted text-muted-foreground shadow-soft-md hover:shadow-soft-lg"
            : `h-12 px-5 rounded-full bg-foreground text-background shadow-soft-lg hover:shadow-soft-xl gap-2 ${
                hasNewMessage ? "animate-pulse-gentle" : ""
              }`
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
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold shadow-sm border-2 border-background animate-in zoom-in-95 fade-in-0">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </>
        )}
      </button>
    </>
  );
}
