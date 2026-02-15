import { RefreshCw, WifiOff, Clock, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import type { Components } from "react-markdown";
import React from "react";
import { formatRelativeTime, formatAbsoluteTime } from "@/utils/formatTime";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

/**
 * Normalize citation formats and convert to HTML before markdown parsing
 * This avoids AST manipulation issues
 */
function processCitationsInText(text: string, sources?: SourceInfo[]): string {
  // First normalize citation formats
  let normalized = text.replace(/\[Chunk\s+(\d+)\]/gi, '[$1]');
  normalized = normalized.replace(/\[Citation:\s*(\d+)\]/gi, '[$1]');
  normalized = normalized.replace(/\[citation\s+(\d+)\]/gi, '[$1]');
  normalized = normalized.replace(/\[chunk\s+(\d+)\]/gi, '[$1]');
  
  // Replace citations with HTML that react-markdown will render
  const citationPattern = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
  
  return normalized.replace(citationPattern, (match, nums) => {
    const citationNumbers = nums.split(',').map((n: string) => parseInt(n.trim())).filter((n: number) => !isNaN(n));
    
    if (citationNumbers.length === 0) {
      return match; // Return original if no valid numbers
    }
    
    const allSourcesExist = citationNumbers.every((num: number) => 
      sources?.some(s => s.index === num)
    );
    
    if (allSourcesExist && sources && citationNumbers.length > 0) {
      const citationLinks = citationNumbers.map((num: number) => {
        return `<a href="#source-${num}" class="citation-link text-primary hover:text-primary/80 font-medium underline decoration-dotted underline-offset-2 transition-colors cursor-pointer" data-citation="${num}" title="View source ${num}">${num}</a>`;
      }).join(', ');
      
      return `<sup class="text-[10px] leading-none align-baseline">[${citationLinks}]</sup>`;
    }
    
    return `<sup class="text-[10px] text-primary font-medium leading-none align-baseline">[${nums}]</sup>`;
  });
}

/**
 * Create custom components for react-markdown with citation support
 */
function createMarkdownComponents(sources?: SourceInfo[], isUser: boolean = false): Components {
  const textColor = isUser ? "text-white" : "text-foreground";
  const textColorClasses = isUser 
    ? "text-white [&_*]:text-white [&_strong]:text-white [&_em]:text-white [&_code]:text-white/90 [&_a]:text-white/90 [&_a:hover]:text-white"
    : "";

  return {
    // Headers
    h1: ({ children, ...props }) => (
      <h1 className={`text-lg font-bold mt-4 mb-2 ${textColorClasses}`} {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 className={`text-base font-semibold mt-3 mb-2 ${textColorClasses}`} {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className={`text-sm font-semibold mt-2 mb-1 ${textColorClasses}`} {...props}>
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4 className={`text-sm font-medium mt-2 mb-1 ${textColorClasses}`} {...props}>
        {children}
      </h4>
    ),
    h5: ({ children, ...props }) => (
      <h5 className={`text-xs font-medium mt-1 mb-1 ${textColorClasses}`} {...props}>
        {children}
      </h5>
    ),
    h6: ({ children, ...props }) => (
      <h6 className={`text-xs font-medium mt-1 mb-1 ${textColorClasses}`} {...props}>
        {children}
      </h6>
    ),
    
    // Paragraphs
    p: ({ children, ...props }) => (
      <p className={`block leading-relaxed ${textColorClasses}`} {...props}>
        {children}
      </p>
    ),
    
    // Lists
    ul: ({ children, ...props }) => (
      <ul className={`list-none space-y-0.5 ${textColorClasses}`} {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className={`list-none space-y-0.5 ${textColorClasses}`} {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => {
      return (
        <li className="flex items-start gap-2 py-0.5" {...props}>
          <span className={`${textColor} mt-0.5`}>•</span>
          <span className="flex-1">{children}</span>
        </li>
      );
    },
    
    // Strong and emphasis
    strong: ({ children, ...props }) => (
      <strong className={textColorClasses} {...props}>{children}</strong>
    ),
    em: ({ children, ...props }) => (
      <em className={textColorClasses} {...props}>{children}</em>
    ),
    
    // Code
    code: ({ children, className, ...props }) => {
      const isInline = !className;
      return isInline ? (
        <code className={`px-1 py-0.5 rounded text-[12px] font-mono bg-muted/50 ${textColorClasses}`} {...props}>
          {children}
        </code>
      ) : (
        <code className={`block p-3 rounded text-[12px] font-mono bg-muted/50 overflow-x-auto ${textColorClasses}`} {...props}>
          {children}
        </code>
      );
    },
    
    // Links (but not citations - those are handled separately)
    a: ({ href, children, ...props }) => {
      // Check if this is a citation link (starts with #source-)
      if (href?.startsWith('#source-')) {
        return <>{children}</>;
      }
      return (
        <a 
          href={href} 
          className={`text-primary hover:text-primary/80 underline ${textColorClasses}`}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    },
    
    // Blockquote
    blockquote: ({ children, ...props }) => (
      <blockquote className={`border-l-2 border-border pl-4 italic ${textColorClasses}`} {...props}>
        {children}
      </blockquote>
    ),
    
    // Horizontal rule
    hr: ({ ...props }) => (
      <hr className="my-4 border-border" {...props} />
    ),
    
    // Tables (from remark-gfm)
    table: ({ children, ...props }) => (
      <div className="overflow-x-auto my-2">
        <table className="min-w-full border-collapse" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead className="bg-muted/50" {...props}>{children}</thead>
    ),
    tbody: ({ children, ...props }) => (
      <tbody {...props}>{children}</tbody>
    ),
    tr: ({ children, ...props }) => (
      <tr className="border-b border-border" {...props}>{children}</tr>
    ),
    th: ({ children, ...props }) => (
      <th className={`px-3 py-2 text-left font-semibold ${textColorClasses}`} {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className={`px-3 py-2 ${textColorClasses}`} {...props}>
        {children}
      </td>
    ),
  };
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
              ? "bg-foreground text-white rounded-[18px] rounded-br-[4px] shadow-md border border-foreground/20"
              : isError
              ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-[18px] rounded-bl-[4px] shadow-sm"
              : "bg-gradient-to-br from-muted via-muted to-muted/95 text-foreground rounded-[18px] rounded-bl-[4px] shadow-soft-sm border border-border/30 backdrop-blur-sm"
          }`}
        >
          {isError && errorType !== "unknown" && (
            <div className="flex items-center gap-1.5 mb-2">
              {getErrorIcon()}
            </div>
          )}
          <div className={isUser ? "text-white [&_*]:text-white [&_strong]:text-white [&_sup]:text-white/90 [&_a]:text-white/90 [&_a:hover]:text-white [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_h4]:text-white [&_h5]:text-white [&_h6]:text-white [&_p]:text-white [&_span]:text-white [&_li]:text-white [&_code]:text-white/90" : ""}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={createMarkdownComponents(message.sources, isUser)}
            >
              {processCitationsInText(message.content, message.sources)}
            </ReactMarkdown>
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
                        className="source-badge inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary border border-primary/20 rounded-md transition-all duration-200 hover:scale-105 hover:shadow-sm active:scale-100 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-1"
                        data-source={source.index}
                        onClick={(e) => {
                          e.preventDefault();
                          // Find and highlight the citation in the text
                          const citation = document.querySelector(`a.citation-link[data-citation="${source.index}"]`) as HTMLElement;
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
                        <span className="font-semibold text-primary">[{source.index}]</span>
                        <span className="truncate max-w-[120px]">{source.title}</span>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[11px] text-muted-foreground cursor-help">
                {formatRelativeTime(message.timestamp)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{formatAbsoluteTime(message.timestamp)}</p>
            </TooltipContent>
          </Tooltip>
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
