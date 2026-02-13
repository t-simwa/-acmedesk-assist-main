import { format } from "date-fns";
import { RefreshCw, WifiOff, Clock, AlertCircle } from "lucide-react";

export interface SourceInfo {
  index: number; // Citation number (1, 2, 3, etc.)
  title: string;
  doc_id: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: SourceInfo[]; // Changed to include index numbers
  isError?: boolean;
  errorType?: "network" | "rate_limit" | "timeout" | "server_error" | "unknown";
  retryMessage?: string;
}

function formatContent(content: string, sources?: SourceInfo[]) {
  // First, normalize citation formats: [Chunk X] or [Citation: X] -> [X]
  let normalized = content.replace(/\[Chunk\s+(\d+)\]/gi, '[$1]');
  normalized = normalized.replace(/\[Citation:\s*(\d+)\]/gi, '[$1]');
  
  // Split by lines and format
  return normalized.split("\n").map((line, i) => {
    // Format markdown headers (##, ###, etc.)
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const headerText = headerMatch[2].trim();
      
      // Format header text (bold, larger size based on level)
      let formatted = headerText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Format citations in headers (handles both single [1] and multiple [1, 2])
      formatted = formatted.replace(
        /\[(\d+(?:\s*,\s*\d+)*)\]/g,
        (match, nums) => {
          const citationNumbers = nums.split(',').map((n: string) => parseInt(n.trim()));
          const allSourcesExist = citationNumbers.every((num: number) => 
            sources?.some(s => s.index === num)
          );
          
          if (allSourcesExist && sources) {
            const citationLinks = citationNumbers.map((num: number) => {
              return `<a href="#source-${num}" class="citation-link text-primary hover:text-primary/80 font-medium underline decoration-dotted underline-offset-2 transition-colors cursor-pointer" data-citation="${num}" title="View source ${num}">${num}</a>`;
            }).join(', ');
            
            return `<sup class="text-[10px] leading-none">[${citationLinks}]</sup>`;
          }
          return `<sup class="text-[10px] text-primary font-medium leading-none">[${nums}]</sup>`;
        }
      );
      
      // Apply header styling based on level
      const headerClasses = {
        1: 'text-lg font-bold mt-4 mb-2',
        2: 'text-base font-semibold mt-3 mb-2',
        3: 'text-sm font-semibold mt-2 mb-1',
        4: 'text-sm font-medium mt-2 mb-1',
        5: 'text-xs font-medium mt-1 mb-1',
        6: 'text-xs font-medium mt-1 mb-1',
      };
      const className = headerClasses[level as keyof typeof headerClasses] || 'text-sm font-semibold mt-2 mb-1';
      
      return (
        <h3 key={i} className={className} dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    }
    
    // Format markdown bold
    let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Format citations [X] or [X, Y] as clickable superscript links
    formatted = formatted.replace(
      /\[(\d+(?:\s*,\s*\d+)*)\]/g,
      (match, nums) => {
        // Parse citation numbers (handles both single [1] and multiple [1, 2])
        const citationNumbers = nums.split(',').map((n: string) => parseInt(n.trim()));
        const allSourcesExist = citationNumbers.every((num: number) => 
          sources?.some(s => s.index === num)
        );
        
        if (allSourcesExist && sources) {
          // Format as clickable links for each citation
          const citationLinks = citationNumbers.map((num: number) => {
            return `<a href="#source-${num}" class="citation-link text-primary hover:text-primary/80 font-medium underline decoration-dotted underline-offset-2 transition-colors cursor-pointer" data-citation="${num}" title="View source ${num}">${num}</a>`;
          }).join(', ');
          
          return `<sup class="text-[10px] leading-none">[${citationLinks}]</sup>`;
        }
        // Fallback: non-clickable superscript
        return `<sup class="text-[10px] text-primary font-medium leading-none">[${nums}]</sup>`;
      }
    );
    
    // Format bullet points
    if (line.trim().startsWith("•") || line.trim().startsWith("-") || line.trim().startsWith("*")) {
      return (
        <span key={i} className="block pl-2 py-0.5" dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    }
    // Format numbered lists - ensure proper spacing
    if (/^\d+\./.test(line.trim())) {
      return (
        <span key={i} className="block pl-2 py-1" dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    }
    // Empty lines for spacing
    if (line.trim() === "") return <span key={i} className="block h-2" />;
    // Regular paragraphs
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
          <div>
            {formatContent(message.content, message.sources)}
          </div>
          
          {/* Sources section inside the bubble - only show if response has actual content */}
          {!isUser && !isError && message.sources && message.sources.length > 0 && (() => {
            // Don't show sources if response indicates no information was found
            const noInfoMessages = [
              "i don't have enough information",
              "i don't have sufficient information",
              "i cannot find",
              "no information available",
              "not enough information"
            ];
            const contentLower = message.content.toLowerCase().trim();
            const hasNoInfo = noInfoMessages.some(msg => contentLower.includes(msg));
            
            // Also check if content is too short (likely an error or empty response)
            const hasMinimalContent = message.content.trim().length < 50;
            
            // Only show sources if we have actual content and it's not a "no info" message
            if (!hasNoInfo && !hasMinimalContent) {
              return (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="text-[11px] font-medium text-muted-foreground mb-1.5">
                    Sources:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {message.sources.map((source) => (
                      <a
                        key={source.index}
                        id={`source-${source.index}`}
                        href={`#source-${source.index}`}
                        className="source-link text-[11px] text-primary hover:text-primary/80 hover:underline transition-colors inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-primary/5"
                        data-source={source.index}
                        onClick={(e) => {
                          e.preventDefault();
                          // Find and highlight the citation in the text
                          const citation = document.querySelector(`a.citation-link[data-citation="${source.index}"]`);
                          if (citation) {
                            citation.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            // Highlight citation briefly
                            const originalBg = citation.style.backgroundColor;
                            citation.style.backgroundColor = 'rgba(var(--primary), 0.2)';
                            citation.style.transition = 'background-color 0.3s';
                            setTimeout(() => {
                              citation.style.backgroundColor = originalBg;
                            }, 1000);
                          }
                        }}
                      >
                        <span className="font-medium">[{source.index}]</span>
                        <span>{source.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>
        <div className={`flex items-center gap-2 px-1 ${isUser ? "justify-end" : "justify-start"}`}>
          <span className="text-[11px] text-muted-foreground">
            {format(message.timestamp, "h:mm a")}
          </span>
          {isError && message.retryMessage && onRetry && (
            <button
              onClick={() => onRetry(message.id, message.retryMessage!)}
              className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-destructive hover:text-destructive/80 hover:bg-destructive/5 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
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
