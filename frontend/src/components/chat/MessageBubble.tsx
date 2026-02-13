import { format } from "date-fns";
import { RefreshCw, WifiOff, Clock, AlertCircle } from "lucide-react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: string[];
  isError?: boolean;
  errorType?: "network" | "rate_limit" | "timeout" | "server_error" | "unknown";
  retryMessage?: string;
}

function formatContent(content: string) {
  return content.split("\n").map((line, i) => {
    const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
      return (
        <span key={i} className="block pl-2 py-0.5" dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    }
    if (/^\d+\./.test(line.trim())) {
      return (
        <span key={i} className="block pl-2 py-0.5" dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    }
    if (line.trim() === "") return <span key={i} className="block h-2" />;
    return <span key={i} className="block" dangerouslySetInnerHTML={{ __html: formatted }} />;
  });
}

interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: (messageId: string, retryMessage: string) => void;
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isError = message.isError === true;
  const errorType = message.errorType || "unknown";

  // Get error icon based on error type
  const getErrorIcon = () => {
    switch (errorType) {
      case "network":
        return <WifiOff size={14} className="text-destructive" />;
      case "timeout":
        return <Clock size={14} className="text-destructive" />;
      case "rate_limit":
      case "server_error":
        return <AlertCircle size={14} className="text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}>
      <div className="max-w-[85%] space-y-1">
        {!isUser && (
          <div className="flex items-center gap-2 px-1 mb-1">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-semibold text-primary">
              A
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">AcmeDesk</span>
          </div>
        )}
        <div
          className={`px-4 py-2.5 text-[14px] leading-relaxed ${
            isUser
              ? "bg-foreground text-background rounded-[18px] rounded-br-[4px]"
              : isError
              ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-[18px] rounded-bl-[4px]"
              : "bg-muted text-foreground rounded-[18px] rounded-bl-[4px]"
          }`}
        >
          {isError && errorType !== "unknown" && (
            <div className="flex items-center gap-1.5 mb-2">
              {getErrorIcon()}
            </div>
          )}
          {formatContent(message.content)}
        </div>
        <div className={`flex items-center gap-2 px-1 ${isUser ? "justify-end" : "justify-start"}`}>
          <span className="text-[11px] text-muted-foreground">
            {format(message.timestamp, "h:mm a")}
          </span>
          {message.sources && message.sources.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              · {message.sources.join(", ")}
            </span>
          )}
          {isError && message.retryMessage && onRetry && (
            <button
              onClick={() => onRetry(message.id, message.retryMessage!)}
              className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-destructive hover:text-destructive/80 hover:bg-destructive/5 rounded-md transition-colors"
              aria-label="Retry message"
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
