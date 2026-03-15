import { RefreshCw, WifiOff, Clock, AlertCircle, Copy, ThumbsUp, ThumbsDown, RotateCcw, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import type { Components } from "react-markdown";
import React, { useState, memo } from "react";
import { formatRelativeTime, formatAbsoluteTime } from "@/utils/formatTime";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { conversationsApi } from "@/lib/api";
import { useAccessibility } from "@/contexts/AccessibilityContext";

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
  // CRITICAL: First, aggressively remove ANY citation containing NaN, undefined, null, or invalid values
  // This must happen BEFORE any other processing to prevent invalid citations from showing
  let normalized = text;
  
  // Remove citations with invalid values (NaN, undefined, null) - remove entire citation
  normalized = normalized.replace(/\[[^\]]*\bNaN\b[^\]]*\]/gi, '');
  normalized = normalized.replace(/\[[^\]]*\bundefined\b[^\]]*\]/gi, '');
  normalized = normalized.replace(/\[[^\]]*\bnull\b[^\]]*\]/gi, '');
  
  // Normalize citation formats
  normalized = normalized.replace(/\[Chunk\s+(\d+)\]/gi, '[$1]');
  normalized = normalized.replace(/\[Citation:\s*(\d+)\]/gi, '[$1]');
  normalized = normalized.replace(/\[citation\s+(\d+)\]/gi, '[$1]');
  normalized = normalized.replace(/\[chunk\s+(\d+)\]/gi, '[$1]');
  
  // Now process valid citations - match citations that may contain multiple numbers
  // Pattern: [1], [1, 2], [1, 2, 3], etc. - but NOT [NaN] or [1, NaN]
  const citationPattern = /\[([^\]]+)\]/g;
  
  return normalized.replace(citationPattern, (match, content) => {
    // Skip if content contains invalid values (double-check after initial removal)
    if (/\bNaN\b|\bundefined\b|\bnull\b/i.test(content)) {
      return ''; // Remove citation entirely
    }
    
    // Extract all numbers from the citation
    const numberMatches = content.match(/\d+/g);
    if (!numberMatches || numberMatches.length === 0) {
      return ''; // No valid numbers, remove citation
    }
    
    // Parse and validate numbers
    const citationNumbers: number[] = [];
    const maxValidCitation = sources ? Math.max(...sources.map(s => s.index), 0) : 20; // Use max source index or 20 as limit
    
    for (const numStr of numberMatches) {
      const num = parseInt(numStr, 10);
      // Only keep valid numbers (1 to maxValidCitation)
      // Also filter out obviously invalid large numbers (> 50 is suspicious)
      if (!isNaN(num) && num >= 1 && num <= Math.min(maxValidCitation, 50)) {
        citationNumbers.push(num);
      }
    }
    
    if (citationNumbers.length === 0) {
      return ''; // No valid numbers, remove citation
    }
    
    // Remove duplicates and sort
    const uniqueNumbers = Array.from(new Set(citationNumbers)).sort((a, b) => a - b);
    const numsString = uniqueNumbers.join(', ');
    
    // Check if all citations exist in sources
    const allSourcesExist = uniqueNumbers.every((num: number) => 
      sources?.some(s => s.index === num)
    );
    
    if (allSourcesExist && sources && uniqueNumbers.length > 0) {
      const citationLinks = uniqueNumbers.map((num: number) => {
        return `<a href="#source-${num}" class="citation-link text-primary/70 hover:text-primary font-normal underline decoration-dotted underline-offset-1 transition-colors cursor-pointer font-mono text-[9px]" data-citation="${num}" title="View source ${num}">${num}</a>`;
      }).join(', ');
      
      return `<sup class="font-mono text-[9px] leading-none align-super ml-px">[${citationLinks}]</sup>`;
    }
    
    // If sources don't match, still show the cleaned citation (without links)
    return `<sup class="font-mono text-[9px] text-primary/70 font-normal leading-none align-super ml-px">[${numsString}]</sup>`;
  });
}

/**
 * Create custom components for react-markdown with citation support
 * COMPACT STYLING - matches Inbox page formatting
 */
function createMarkdownComponents(sources?: SourceInfo[], isUser: boolean = false): Components {
  const textColor = isUser ? "text-background" : "text-foreground/90";
  const textColorClasses = isUser 
    ? "text-background [&_*]:text-background [&_strong]:text-background [&_em]:text-background [&_code]:text-background/90 [&_a]:text-background/90 [&_a:hover]:text-background"
    : "";
  // Use Satoshi font for all chat content (except technical/code which uses Geist Mono)
  const chatFontClass = "font-chat";

  return {
    // Headers - COMPACT: much smaller sizes
    h1: ({ children, ...props }) => (
      <h1 className={`text-[13px] font-semibold mt-2 mb-1 ${chatFontClass} ${textColorClasses}`} {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 className={`text-[12px] font-semibold mt-1.5 mb-0.5 ${chatFontClass} ${textColorClasses}`} {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className={`text-[12px] font-medium mt-1 mb-0.5 ${chatFontClass} ${textColorClasses}`} {...props}>
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4 className={`text-[11px] font-medium mt-1 mb-0.5 ${chatFontClass} ${textColorClasses}`} {...props}>
        {children}
      </h4>
    ),
    h5: ({ children, ...props }) => (
      <h5 className={`text-[11px] font-medium mt-0.5 mb-0.5 ${chatFontClass} ${textColorClasses}`} {...props}>
        {children}
      </h5>
    ),
    h6: ({ children, ...props }) => (
      <h6 className={`text-[11px] font-medium mt-0.5 mb-0.5 ${chatFontClass} ${textColorClasses}`} {...props}>
        {children}
      </h6>
    ),
    
    // Paragraphs - COMPACT
    p: ({ children, ...props }) => (
      <p className={`block leading-[1.6] ${chatFontClass} ${textColorClasses}`} {...props}>
        {children}
      </p>
    ),
    
    // Lists - COMPACT with tighter spacing
    ul: ({ children, ...props }) => (
      <ul className={`list-none space-y-0.5 my-1 pl-3.5 ${chatFontClass} ${textColorClasses}`} {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className={`list-none space-y-0.5 my-1 pl-3.5 ${chatFontClass} ${textColorClasses}`} {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => {
      return (
        <li className={`flex items-start gap-1.5 leading-[1.5] ${chatFontClass}`} {...props}>
          <span className={`${textColor} mt-0.5 text-[10px]`}>•</span>
          <span className="flex-1">{children}</span>
        </li>
      );
    },
    
    // Strong and emphasis
    strong: ({ children, ...props }) => (
      <strong className={`font-medium ${chatFontClass} ${textColorClasses}`} {...props}>{children}</strong>
    ),
    em: ({ children, ...props }) => (
      <em className={`${chatFontClass} ${textColorClasses}`} {...props}>{children}</em>
    ),
    
    // Code - COMPACT
    code: ({ children, className, ...props }) => {
      const isInline = !className;
      return isInline ? (
        <code className={`px-1 py-0.5 rounded text-[11px] font-mono bg-muted/50 ${textColorClasses}`} {...props}>
          {children}
        </code>
      ) : (
        <code className={`block p-2 rounded text-[11px] font-mono bg-muted/50 overflow-x-auto my-1.5 ${textColorClasses}`} {...props}>
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
    
    // Blockquote - COMPACT
    blockquote: ({ children, ...props }) => (
      <blockquote className={`${chatFontClass} border-l-2 border-primary/30 pl-2 text-[12px] text-muted-foreground italic ${textColorClasses}`} {...props}>
        {children}
      </blockquote>
    ),
    
    // Horizontal rule
    hr: ({ ...props }) => (
      <hr className="my-2 border-border" {...props} />
    ),
    
    // Tables (from remark-gfm) - COMPACT
    table: ({ children, ...props }) => (
      <div className="overflow-x-auto my-1.5">
        <table className="min-w-full border-collapse text-[11px] font-mono" {...props}>
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
      <th className={`px-2 py-1.5 text-left font-semibold ${textColorClasses}`} {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className={`px-2 py-1.5 ${textColorClasses}`} {...props}>
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

export const MessageBubble = memo(function MessageBubble({ message, onRetry, onRegenerate, onReactionChange }: MessageBubbleProps) {
  const { reduceMotion } = useAccessibility();
  const isUser = message.role === "user";
  const isError = message.isError === true;
  const errorType = message.errorType || "unknown";
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
      role="article"
      aria-label={isUser ? "Your message" : "Assistant message"}
    >
      <div className="max-w-[85%] sm:max-w-[78%] space-y-0.5 relative">
        {!isUser && (
          <div className="flex items-center gap-2 px-0.5 mb-0.5" aria-label="NexaChat assistant">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-sm" aria-hidden="true">
              <Zap size={11} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground/70">NexaChat</span>
          </div>
        )}
        <div
          className={`px-3 py-2 text-[13px] leading-[1.6] relative ${
            isUser
              ? "bg-foreground text-background rounded-2xl rounded-br-sm shadow-md border border-foreground/20"
              : isError
              ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-[3px_14px_14px_14px] shadow-sm"
              : "bg-primary/[0.05] border border-primary/[0.10] rounded-[3px_14px_14px_14px] shadow-soft-sm transition-all duration-150 group-hover:border-primary/15 group-hover:bg-primary/[0.07]"
          }`}
        >
          {/* Copy button - only for assistant messages, shows on hover */}
          {!isUser && !isError && (
            <div className="absolute -top-8 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
          
          {/* Sources section inside the bubble - COMPACT styling */}
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
                <div className="mt-2 pt-2 border-t border-border/30">
                  <div className="font-chat text-[10px] font-medium text-muted-foreground/60 mb-1">
                    Sources:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {message.sources.map((source) => (
                      <a
                        key={source.index}
                        id={`source-${source.index}`}
                        href={`#source-${source.index}`}
                        className="source-badge inline-flex items-center gap-0.5 px-2 py-0.5 font-mono text-[9px] font-medium text-primary/80 bg-primary/[0.06] hover:bg-primary/[0.10] border border-primary/[0.12] rounded-full transition-all duration-150 hover:scale-105 active:scale-100 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-1"
                        data-source={source.index}
                        aria-label={`Source ${source.index}: ${source.title}`}
                        onClick={(e) => {
                          e.preventDefault();
                          // Find and highlight the citation in the text
                          const citation = document.querySelector(`a.citation-link[data-citation="${source.index}"]`) as HTMLElement;
                          if (citation) {
                            citation.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
                            // Highlight citation briefly (skip if reduced motion)
                            if (!reduceMotion) {
                              const originalBg = citation.style.backgroundColor;
                              citation.style.backgroundColor = 'rgba(var(--primary), 0.2)';
                              citation.style.transition = 'background-color 0.3s';
                              setTimeout(() => {
                                citation.style.backgroundColor = originalBg;
                              }, 1000);
                            }
                          }
                        }}
                      >
                        <span className="text-[8px]">📄</span>
                        <span className="truncate max-w-[100px]">{source.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>
        <div className={`flex items-center gap-1.5 px-0.5 ${isUser ? "justify-end" : "justify-start"}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <time 
                dateTime={message.timestamp.toISOString()}
                className="text-[9px] font-mono text-muted-foreground/50 cursor-help"
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
});
