import { RefreshCw, WifiOff, Clock, AlertCircle, Copy, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import type { Components } from "react-markdown";
import React, { useState } from "react";
import { formatRelativeTime, formatAbsoluteTime } from "@/utils/formatTime";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { conversationsApi } from "@/lib/api";

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
  reaction?: "thumbs_up" | "thumbs_down";
  userMessageId?: string; // For assistant messages, track the user message that triggered them
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
      
      return `<sup class="text-technical leading-none align-baseline">[${citationLinks}]</sup>`;
    }
    
    return `<sup class="text-technical text-primary font-medium leading-none align-baseline">[${nums}]</sup>`;
  });
}

/**
 * Create custom components for react-markdown with citation support
 */
function createMarkdownComponents(sources?: SourceInfo[], isUser: boolean = false): Components {
  const textColor = isUser ? "text-background" : "text-foreground";
  const textColorClasses = isUser 
    ? "text-background [&_*]:text-background [&_strong]:text-background [&_em]:text-background [&_code]:text-background/90 [&_a]:text-background/90 [&_a:hover]:text-background"
    : "";
  // Use Satoshi font for all chat content (except technical/code which uses Geist Mono)
  const chatFontClass = "font-chat";

  return {
    // Headers
    h1: ({ children, ...props }) => (
      <h1 className={`text-lg font-bold mt-4 mb-2 ${chatFontClass} ${textColorClasses}`} {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 className={`text-base font-semibold mt-3 mb-2 ${chatFontClass} ${textColorClasses}`} {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className={`text-sm font-semibold mt-2 mb-1 ${chatFontClass} ${textColorClasses}`} {...props}>
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4 className={`text-sm font-medium mt-2 mb-1 ${chatFontClass} ${textColorClasses}`} {...props}>
        {children}
      </h4>
    ),
    h5: ({ children, ...props }) => (
      <h5 className={`text-xs font-medium mt-1 mb-1 ${chatFontClass} ${textColorClasses}`} {...props}>
        {children}
      </h5>
    ),
    h6: ({ children, ...props }) => (
      <h6 className={`text-xs font-medium mt-1 mb-1 ${chatFontClass} ${textColorClasses}`} {...props}>
        {children}
      </h6>
    ),
    
    // Paragraphs
    p: ({ children, ...props }) => (
      <p className={`block ${chatFontClass} ${textColorClasses}`} {...props}>
        {children}
      </p>
    ),
    
    // Lists
    ul: ({ children, ...props }) => (
      <ul className={`list-none space-y-0.5 ${chatFontClass} ${textColorClasses}`} {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className={`list-none space-y-0.5 ${chatFontClass} ${textColorClasses}`} {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => {
      return (
        <li className={`flex items-start gap-2 py-0.5 ${chatFontClass}`} {...props}>
          <span className={`${textColor} mt-0.5`}>•</span>
          <span className="flex-1">{children}</span>
        </li>
      );
    },
    
    // Strong and emphasis
    strong: ({ children, ...props }) => (
      <strong className={`${chatFontClass} ${textColorClasses}`} {...props}>{children}</strong>
    ),
    em: ({ children, ...props }) => (
      <em className={`${chatFontClass} ${textColorClasses}`} {...props}>{children}</em>
    ),
    
    // Code
    code: ({ children, className, ...props }) => {
      const isInline = !className;
      return isInline ? (
        <code className={`px-1 py-0.5 rounded text-technical bg-muted/50 ${textColorClasses}`} {...props}>
          {children}
        </code>
      ) : (
        <code className={`block p-3 rounded text-technical bg-muted/50 overflow-x-auto ${textColorClasses}`} {...props}>
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
          className={`${chatFontClass} text-primary hover:text-primary/80 underline ${textColorClasses}`}
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
      <blockquote className={`${chatFontClass} border-l-2 border-border pl-4 italic ${textColorClasses}`} {...props}>
        {children}
      </blockquote>
    ),
    
    // Horizontal rule
    hr: ({ ...props }) => (
      <hr className="my-4 border-border" {...props} />
    ),
    
    // Tables (from remark-gfm) - use Geist Mono for technical data
    table: ({ children, ...props }) => (
      <div className="overflow-x-auto my-2">
        <table className="min-w-full border-collapse text-technical" {...props}>
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
  onRegenerate?: (messageId: string, userMessageId: string) => void;
  onReactionChange?: (messageId: string, reaction: "thumbs_up" | "thumbs_down" | null) => void;
}

export function MessageBubble({ message, onRetry, onRegenerate, onReactionChange }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isError = message.isError === true;
  const errorType = message.errorType || "unknown";
  const [isHovered, setIsHovered] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [currentReaction, setCurrentReaction] = useState<"thumbs_up" | "thumbs_down" | null>(message.reaction || null);
  const [isUpdatingReaction, setIsUpdatingReaction] = useState(false);

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

  const handleCopy = async () => {
    try {
      setIsCopying(true);
      await navigator.clipboard.writeText(message.content);
      // Show feedback (you could add a toast here)
      setTimeout(() => setIsCopying(false), 1000);
    } catch (err) {
      console.error("Failed to copy:", err);
      setIsCopying(false);
    }
  };

  const handleReaction = async (reaction: "thumbs_up" | "thumbs_down") => {
    if (isUpdatingReaction) return;
    
    setIsUpdatingReaction(true);
    try {
      const newReaction = currentReaction === reaction ? null : reaction;
      
      if (newReaction) {
        await conversationsApi.updateMessageReaction({
          message_id: message.id,
          reaction: newReaction,
        });
      } else {
        await conversationsApi.removeMessageReaction(message.id);
      }
      
      setCurrentReaction(newReaction);
      onReactionChange?.(message.id, newReaction);
    } catch (err) {
      console.error("Failed to update reaction:", err);
    } finally {
      setIsUpdatingReaction(false);
    }
  };

  return (
    <div 
      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in group`}
      onMouseEnter={() => !isUser && !isError && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="article"
      aria-label={isUser ? "Your message" : "Assistant message"}
    >
      <div className="max-w-[85%] space-y-1 relative">
        {!isUser && (
          <div className="flex items-center gap-2 px-1 mb-1" aria-label="AcmeDesk assistant">
            <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center" aria-hidden="true">
              <span className="text-[12px] font-bold text-background tracking-tight">A</span>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">AcmeDesk</span>
          </div>
        )}
        <div
          className={`px-4 py-2.5 text-chat relative ${
            isUser
              ? "bg-foreground text-background rounded-[18px] rounded-br-[4px] shadow-md border border-foreground/20"
              : isError
              ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-[18px] rounded-bl-[4px] shadow-sm"
              : "bg-gradient-to-br from-muted via-muted to-muted/95 rounded-[18px] rounded-bl-[4px] shadow-soft-sm border border-border/30 backdrop-blur-sm"
          }`}
        >
          {/* Copy button - only for assistant messages, shows on hover */}
          {!isUser && !isError && isHovered && (
            <div className="absolute -top-8 right-0 flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-md bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                    aria-label={isCopying ? "Message copied" : "Copy message to clipboard"}
                  >
                    {isCopying ? (
                      <span className="text-[10px]">Copied!</span>
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Copy message</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
          {isError && errorType !== "unknown" && (
            <div className="flex items-center gap-1.5 mb-2">
              {getErrorIcon()}
            </div>
          )}
          <div className={`text-chat ${isUser ? "text-background [&_*]:text-background [&_strong]:text-background [&_sup]:text-background/90 [&_a]:text-background/90 [&_a:hover]:text-background [&_h1]:text-background [&_h2]:text-background [&_h3]:text-background [&_h4]:text-background [&_h5]:text-background [&_h6]:text-background [&_p]:text-background [&_span]:text-background [&_li]:text-background [&_code]:text-background/90" : ""}`}>
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
                  <div className="text-technical font-medium text-muted-foreground mb-1.5">
                    Sources:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {message.sources.map((source) => (
                      <a
                        key={source.index}
                        id={`source-${source.index}`}
                        href={`#source-${source.index}`}
                        className="source-badge inline-flex items-center gap-1.5 px-2.5 py-1.5 text-technical font-medium text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary border border-primary/20 rounded-md transition-all duration-200 hover:scale-105 hover:shadow-sm active:scale-100 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-1"
                        data-source={source.index}
                        aria-label={`Source ${source.index}: ${source.title}`}
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
              <time 
                dateTime={message.timestamp.toISOString()}
                className="text-[12px] font-chat text-muted-foreground cursor-help"
                aria-label={`Message sent ${formatRelativeTime(message.timestamp)}`}
              >
                {formatRelativeTime(message.timestamp)}
              </time>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{formatAbsoluteTime(message.timestamp)}</p>
            </TooltipContent>
          </Tooltip>
          
          {/* Reactions for assistant messages */}
          {!isUser && !isError && (
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleReaction("thumbs_up")}
                    disabled={isUpdatingReaction}
                    className={`p-1 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${
                      currentReaction === "thumbs_up"
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    aria-label={currentReaction === "thumbs_up" ? "Remove helpful reaction" : "Mark as helpful"}
                    aria-pressed={currentReaction === "thumbs_up"}
                  >
                    <ThumbsUp size={12} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Helpful</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleReaction("thumbs_down")}
                    disabled={isUpdatingReaction}
                    className={`p-1 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${
                      currentReaction === "thumbs_down"
                        ? "text-destructive bg-destructive/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    aria-label={currentReaction === "thumbs_down" ? "Remove not helpful reaction" : "Mark as not helpful"}
                    aria-pressed={currentReaction === "thumbs_down"}
                  >
                    <ThumbsDown size={12} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Not helpful</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
          
          {/* Regenerate button for assistant messages */}
          {!isUser && !isError && onRegenerate && message.userMessageId && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onRegenerate(message.id, message.userMessageId!)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                  aria-label="Regenerate response"
                >
                  <RotateCcw size={12} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Regenerate response</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Retry button for error messages */}
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
