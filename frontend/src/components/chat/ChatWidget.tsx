import { useState, useRef, useEffect, useCallback } from "react";
import React from "react";
import { X, ChevronDown, Trash2, Download } from "lucide-react";
import { ChatMessage, MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { MessageSkeleton } from "./MessageSkeleton";
import { chatApi, conversationsApi, type ChatResponse, type ApiError } from "@/lib/api";
import { formatResponse } from "@/utils/formatResponse";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { Logo } from "@/components/Branding/Logo";
import { ConfirmationDialog } from "@/components/feedback/ConfirmationDialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const CHAT_GREETING_KEY = "nexachat-chat-greeting";

function LeadCaptureInlineForm({
  onSubmit,
  onSkip,
}: {
  onSubmit: (name: string, email: string) => void;
  onSkip: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  return (
    <div className="px-4 py-3 border-t border-border bg-muted/30 space-y-2">
      <p className="text-sm font-medium text-foreground">
        Leave your details so we can follow up:
      </p>
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSubmit(name.trim(), email.trim())}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
        >
          Submit
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-md border border-border px-3 py-1.5 text-sm"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

export function ChatWidget() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  // Load custom greeting or use default
  const getGreetingMessage = (): string => {
    const stored = localStorage.getItem(CHAT_GREETING_KEY);
    return stored || t("chat.greeting");
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: getGreetingMessage(),
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [sessionId] = useState<string>(() => `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageCountRef = useRef(messages.length);
  
  // Track user message IDs for regenerate functionality
  const userMessageMapRef = useRef<Map<string, string>>(new Map()); // assistantMessageId -> userMessageId
  
  // F2.4 - Mobile detection
  const isMobile = useIsMobile();
  const prevIsMobileRef = useRef<boolean | undefined>(undefined);
  
  // F4.4 - Reduced motion support
  const { reduceMotion } = useAccessibility();
  
  // F2.4 - Swipe gesture state
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const swipeDistanceRef = useRef<number>(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  
  // Auto-close chat when switching from mobile to desktop (screen expansion)
  useEffect(() => {
    // Only act if we've had a previous mobile state (not initial render)
    if (prevIsMobileRef.current !== undefined) {
      // If switching from mobile to desktop while chat is open, close it
      if (prevIsMobileRef.current === true && !isMobile && isOpen) {
        setIsOpen(false);
      }
    }
    // Update previous state
    prevIsMobileRef.current = isMobile;
  }, [isMobile, isOpen]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }, [reduceMotion]);

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
    return undefined;
  }, [messages, isOpen]);

  // F2.4 - Prevent body scroll when chat is open on mobile
  useEffect(() => {
    if (isMobile && isOpen) {
      // Prevent body scroll when chat is open
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = "";
      };
    }
    return undefined;
  }, [isMobile, isOpen]);

  // F2.4 - Handle keyboard appearance on mobile (iOS/Android)
  useEffect(() => {
    if (!isMobile || !isOpen) return;

    const handleResize = () => {
      // Scroll to bottom when keyboard appears/disappears
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    };

    // Use visual viewport API if available (better for mobile keyboards)
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      return () => {
        window.visualViewport?.removeEventListener("resize", handleResize);
      };
    } else {
      // Fallback to window resize
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [isMobile, isOpen, scrollToBottom]);

  // F2.4 - Swipe gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !isOpen) return;
    
    const touch = e.touches[0];
    if (!touch) return;
    swipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    swipeDistanceRef.current = 0;
  }, [isMobile, isOpen]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !isOpen || !swipeStartRef.current) return;
    
    const touch = e.touches[0];
    if (!touch) return;
    const deltaY = touch.clientY - swipeStartRef.current.y;
    
    // Only allow downward swipe (to close)
    if (deltaY > 0) {
      swipeDistanceRef.current = deltaY;
      setSwipeOffset(deltaY);
      
      // Prevent default scrolling when swiping
      if (Math.abs(deltaY) > 10) {
        e.preventDefault();
      }
    }
  }, [isMobile, isOpen]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || !isOpen || !swipeStartRef.current) {
      setSwipeOffset(0);
      swipeStartRef.current = null;
      return;
    }

    const swipeThreshold = 100; // Minimum swipe distance to close
    const swipeSpeed = swipeDistanceRef.current / (Date.now() - swipeStartRef.current.time);
    
    // Close if swiped down enough or fast enough
    if (swipeDistanceRef.current > swipeThreshold || swipeSpeed > 0.5) {
      setIsOpen(false);
    }
    
    // Reset swipe state
    setSwipeOffset(0);
    swipeStartRef.current = null;
    swipeDistanceRef.current = 0;
  }, [isMobile, isOpen]);

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
      let formattedAnswer = formatResponse(response.answer);
      
      // CRITICAL: Final validation - remove any citations with NaN or invalid values
      // This is a last resort to ensure no invalid citations make it to display
      formattedAnswer = formattedAnswer.replace(/\[[^\]]*\bNaN\b[^\]]*\]/gi, '');
      formattedAnswer = formattedAnswer.replace(/\[[^\]]*\bundefined\b[^\]]*\]/gi, '');
      formattedAnswer = formattedAnswer.replace(/\[[^\]]*\bnull\b[^\]]*\]/gi, '');
      
      // Clean up any citations with out-of-range numbers (based on actual sources count)
      const maxValidCitation = response.sources.length;
      if (maxValidCitation > 0) {
        formattedAnswer = formattedAnswer.replace(/\[([^\]]+)\]/g, (_match, content) => {
          // Skip if contains invalid values
          if (/\bNaN\b|\bundefined\b|\bnull\b/i.test(content)) {
            return '';
          }
          // Extract numbers and validate
          const numbers = content.match(/\d+/g) || [];
          const validNumbers: number[] = [];
          for (const numStr of numbers) {
            const num = parseInt(numStr, 10);
            if (!isNaN(num) && num >= 1 && num <= maxValidCitation && num <= 50) {
              validNumbers.push(num);
            }
          }
          if (validNumbers.length === 0) {
            return ''; // Remove citation if no valid numbers
          }
          const uniqueNumbers = Array.from(new Set(validNumbers)).sort((a, b) => a - b);
          return `[${uniqueNumbers.join(', ')}]`;
        });
      }
      
      // Extract citations from cleaned formatted answer
      const citationPattern = /\[(\d+)\]/g;
      const citations = new Set<number>();
      let citMatch;
      while ((citMatch = citationPattern.exec(formattedAnswer)) !== null) {
        const num = citMatch[1];
        if (num) citations.add(parseInt(num));
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


      // Flow 5 parity: low-confidence or escalation → prompt for lead capture
      if (response.metadata?.low_confidence || response.metadata?.escalation_triggered) {
        setShowLeadCapture(true);
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
        ...(shouldShowSources ? { sources: numberedSources } : {}),
        ...(userMessageId ? { userMessageId } : {}),
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
      let errorMessage = t("chat.errorUnknown");
      let errorType: "network" | "rate_limit" | "timeout" | "server_error" | "unknown" = "unknown";

      if (error && typeof error === "object" && "errorType" in error) {
        const apiError = error as ApiError;
        errorType = apiError.errorType || "unknown";
        
        switch (apiError.errorType) {
          case "network":
            errorMessage = t("chat.errorNetwork");
            break;
          case "rate_limit":
            errorMessage = apiError.message || t("chat.errorRateLimit");
            break;
          case "timeout":
            errorMessage = t("chat.errorTimeout");
            break;
          case "server_error":
            errorMessage = t("errors.serverError");
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
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        if (reaction) {
          return { ...msg, reaction };
        }
        // Remove the reaction property entirely (exactOptionalPropertyTypes)
        const { reaction: _removed, ...rest } = msg;
        return rest as ChatMessage;
      })
    );
  };

  const requestClose = () => {
    const hasUserMessages = messages.some((m) => m.role === "user");
    if (hasUserMessages && !feedbackSubmitted && !showFeedbackPrompt) {
      setShowFeedbackPrompt(true);
      return;
    }
    setIsOpen(false);
  };

  const handleFeedback = async (positive: boolean) => {
    setShowFeedbackPrompt(false);
    setFeedbackSubmitted(true);
    try {
      await conversationsApi.submitFeedback(sessionId, positive ? "positive" : "negative");
    } catch (e) {
      console.error("Failed to submit feedback:", e);
    }
    if (positive) {
      toast({ title: t("chat.thanksFeedback", { defaultValue: "Thanks for your feedback!" }), variant: "success" });
      setIsOpen(false);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: `feedback-${Date.now()}`,
          role: "assistant",
          content: t("chat.sorryHearThat", {
            defaultValue: "Sorry to hear that! Would you like someone from our team to help instead?",
          }),
          timestamp: new Date(),
        },
      ]);
      setShowLeadCapture(true);
    }
  };

  const handleLeadSubmit = async (name: string, email: string) => {
    try {
      await conversationsApi.submitLead(sessionId, { name, email });
      setShowLeadCapture(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `lead-thanks-${Date.now()}`,
          role: "assistant",
          content: t("chat.leadThanks", {
            defaultValue: "Thanks! Someone from our team will reach out shortly.",
          }),
          timestamp: new Date(),
        },
      ]);
      toast({ title: t("chat.leadCaptured", { defaultValue: "Lead captured" }), variant: "success" });
    } catch (e) {
      toast({ title: t("chat.leadError", { defaultValue: "Failed to submit" }), variant: "destructive" });
    }
  };

  const handleClearConversation = async () => {
    if (isClearing) return;
    setShowClearDialog(true);
  };

  const confirmClearConversation = async () => {
    setIsClearing(true);
    try {
      await conversationsApi.deleteConversation(sessionId);
      
      // Reset to welcome message
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: getGreetingMessage(),
          timestamp: new Date(),
        },
      ]);
      lastMessageCountRef.current = 1;
      userMessageMapRef.current.clear();
      
      toast({
        title: t("chat.clearConversation"),
        description: t("chat.conversationCleared"),
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to clear conversation:", error);
      toast({
        title: t("chat.clearConversationError", { defaultValue: "Failed to clear conversation" }),
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleExportConversation = (format: "txt" | "pdf") => {
    const conversationText = messages
      .filter(msg => msg.id !== "welcome")
      .map((msg) => {
        const role = msg.role === "user" ? "You" : "NexaChat Assistant";
        const timestamp = new Date(msg.timestamp).toLocaleString();
        return `[${timestamp}] ${role}:\n${msg.content}\n`;
      })
      .join("\n---\n\n");

    if (format === "txt") {
      const blob = new Blob([conversationText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nexachat-conversation-${new Date().toISOString().split("T")[0]}.txt`;
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
            <title>NexaChat Conversation</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .message { margin-bottom: 20px; }
              .user { color: #0066cc; }
              .assistant { color: #666; }
              .timestamp { font-size: 12px; color: #999; }
            </style>
          </head>
          <body>
            <h1>NexaChat Conversation</h1>
            <p>Exported on ${new Date().toLocaleString()}</p>
            <hr>
            ${messages
              .filter(msg => msg.id !== "welcome")
              .map((msg) => {
        const role = msg.role === "user" ? "You" : "NexaChat Assistant";
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
      a.download = `nexachat-conversation-${new Date().toISOString().split("T")[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Suggested questions
  const suggestedQuestions = [
    t("chat.suggestedQuestion1"),
    t("chat.suggestedQuestion2"),
    t("chat.suggestedQuestion3"),
    t("chat.suggestedQuestion4"),
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
  const isConversationEmpty = messages.length === 1 && messages[0]?.id === "welcome";

  return (
    <>
      {/* F2.4 - Mobile backdrop overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-250"
          onClick={requestClose}
          aria-hidden="true"
        />
      )}

      {/* Chat Panel */}
      <div
        ref={panelRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="dialog"
        aria-label={t("chat.title")}
        aria-modal="false"
        className={`fixed z-50 flex flex-col bg-background shadow-chat border border-border transition-all duration-250 ease-out ${
          isMobile
            ? // F2.4 - Full-screen on mobile
              `inset-0 rounded-none overflow-hidden ${
                isOpen
                  ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 scale-95 translate-y-full pointer-events-none"
              }`
            : // Desktop: floating panel - positioned above the button
              // Use overflow-clip instead of overflow-hidden to allow tooltips to escape
              `bottom-28 right-6 w-[380px] max-h-[560px] rounded-2xl origin-bottom-right z-[9998] overflow-clip ${
                isOpen
                  ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 scale-95 translate-y-3 pointer-events-none"
              }`
        }`}
        style={{
          transitionProperty: "opacity, transform",
          transform: isMobile && swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined,
        }}
      >
        {/* Header — Intercom-style with agent identity */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-background">
          <div className="flex items-center gap-3">
            <Logo size={28} showOnlineIndicator={true} showText={false} />
            <div>
              <p className="text-[12px] text-muted-foreground font-chat" aria-live="polite">
                {t("chat.activeNow")}
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
                  className={`rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 active:scale-95 ${
                    isMobile ? "p-2.5 min-w-[44px] min-h-[44px]" : "p-1.5"
                  }`}
                  aria-label={t("chat.exportConversation")}
                  title={t("chat.exportConversation")}
                >
                  <Download size={isMobile ? 20 : 16} />
                </button>
              </div>
            )}
            {/* Clear conversation button */}
            {!isConversationEmpty && (
              <button
                onClick={handleClearConversation}
                disabled={isClearing}
                className={`rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:opacity-50 active:scale-95 ${
                  isMobile ? "p-2.5 min-w-[44px] min-h-[44px]" : "p-1.5"
                }`}
                aria-label={t("chat.clearConversation")}
                title={t("chat.clearConversation")}
              >
                <Trash2 size={isMobile ? 20 : 16} />
              </button>
            )}
            <button
              onClick={requestClose}
              className={`rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 active:scale-95 ${
                isMobile ? "p-2.5 min-w-[44px] min-h-[44px]" : "p-1.5"
              }`}
              aria-label={t("chat.closeChat")}
            >
              <ChevronDown size={isMobile ? 20 : 18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div 
          className={`flex-1 overflow-y-auto px-4 py-4 space-y-3 chat-messages bg-background ${
            isMobile 
              ? "min-h-0" // F2.4 - Full height on mobile
              : "min-h-[280px] max-h-[380px]"
          }`}
          role="log"
          aria-label="Chat messages"
          aria-live="polite"
          aria-atomic="false"
        >
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
                  <p className={`text-muted-foreground font-medium font-chat ${
                    isMobile ? "text-[14px]" : "text-[12px]"
                  }`}>{t("chat.suggestedQuestions")}</p>
                  <div className={`flex flex-wrap ${
                    isMobile ? "gap-3" : "gap-2"
                  }`} role="group" aria-label={t("chat.suggestedQuestions")}>
                    {suggestedQuestions.map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestedQuestion(question)}
                        className={`text-foreground bg-muted hover:bg-muted/80 border border-border rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 active:scale-95 font-chat ${
                          isMobile
                            ? "px-4 py-3 text-[14px] min-h-[44px]" // F2.4 - Larger touch target
                            : "px-3 py-1.5 text-[12px]"
                        }`}
                        aria-label={`Ask: ${question}`}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
          {isTyping && (
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {t("chat.assistantTyping")}
            </div>
          )}
          {isTyping && <MessageSkeleton />}
          <div ref={messagesEndRef} aria-hidden="true" />
        </div>

        {/* Flow 5: Feedback before close */}
        {showFeedbackPrompt && (
          <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-center gap-3">
            <span className="text-sm text-foreground">{t("chat.wasHelpful", { defaultValue: "Was this conversation helpful?" })}</span>
            <button
              type="button"
              onClick={() => handleFeedback(true)}
              className="rounded-full p-2 bg-green-500/20 text-green-600 hover:bg-green-500/30 transition-colors"
              aria-label="Yes"
            >
              👍
            </button>
            <button
              type="button"
              onClick={() => handleFeedback(false)}
              className="rounded-full p-2 bg-red-500/20 text-red-600 hover:bg-red-500/30 transition-colors"
              aria-label="No"
            >
              👎
            </button>
          </div>
        )}
        {/* Flow 5: Lead capture (low-confidence or escalation) */}
        {showLeadCapture && (
          <LeadCaptureInlineForm
            onSubmit={handleLeadSubmit}
            onSkip={() => setShowLeadCapture(false)}
          />
        )}
        {/* Input */}
        <ChatInput ref={chatInputRef} onSend={handleSend} disabled={isTyping} />
      </div>

      {/* Floating Button — clean, no generic icons */}
      {/* F2.4 - Hide floating button on mobile when chat is open (to avoid overlap with send button) */}
      {!(isMobile && isOpen) && (
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
          className={`flex items-center justify-center transition-all duration-300 ease-out focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${
            isMobile
              ? // F2.4 - Larger touch target on mobile (minimum 44x44px)
                `bottom-4 right-4 ${
                  isOpen
                    ? "w-11 h-11 rounded-full bg-muted text-muted-foreground shadow-soft-md active:scale-95"
                    : `h-11 px-4 rounded-full bg-foreground text-background shadow-soft-lg active:scale-95 gap-2 ${
                        hasNewMessage ? "animate-pulse-gentle" : ""
                      }`
                }`
              : // Desktop: always visible, positioned bottom-right
                `bottom-6 right-6 hover:scale-110 active:scale-95 ${
                  isOpen
                    ? "w-12 h-12 rounded-full bg-muted text-muted-foreground shadow-soft-md hover:shadow-soft-lg"
                    : `h-12 px-5 rounded-full bg-foreground text-background shadow-soft-lg hover:shadow-soft-xl gap-2 ${
                        hasNewMessage ? "animate-pulse-gentle" : ""
                      }`
                }`
          }`}
          style={{
            position: 'fixed',
            bottom: isMobile ? '1rem' : '1.5rem',
            right: isMobile ? '1rem' : '1.5rem',
            zIndex: 99999,
          }}
          aria-label={isOpen ? t("chat.closeChat") : t("chat.chatWithUs")}
        >
        {isOpen ? (
          <X size={18} />
        ) : (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-online opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-online" />
            </span>
            <span className="text-[13px] font-medium font-chat">{t("chat.chatWithUs")}</span>
            {unreadCount > 0 && (
              <span 
                className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold shadow-sm border-2 border-background animate-in zoom-in-95 fade-in-0"
                aria-label={`${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </>
        )}
        </button>
      )}

      {/* Confirmation Dialog for Clearing Conversation */}
      <ConfirmationDialog
        open={showClearDialog}
        onOpenChange={setShowClearDialog}
        title={t("chat.clearConversation")}
        description={t("chat.clearConversationConfirm", { defaultValue: "Are you sure you want to clear this conversation? This action cannot be undone." })}
        confirmLabel={t("common.clear")}
        cancelLabel={t("common.cancel")}
        confirmVariant="destructive"
        onConfirm={confirmClearConversation}
        isLoading={isClearing}
      />
    </>
  );
}
