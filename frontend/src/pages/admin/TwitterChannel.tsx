import { useEffect, useState } from "react";
import { twitterApi, ApiError, TwitterMessageMetadata } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Send, MessageSquarePlus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface TwitterThread extends TwitterMessageMetadata {}

interface TwitterMessage extends TwitterMessageMetadata {}

function formatRelativeTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export default function TwitterChannel() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threads, setThreads] = useState<TwitterThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TwitterMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [creatingTest, setCreatingTest] = useState(false);

  const handleApiError = (err: unknown, fallbackMessage: string) => {
    const apiError = err as ApiError;
    const message = apiError?.message || fallbackMessage;
    toast({
      title: "Error",
      description: typeof message === "string" ? message : String(message),
      variant: "destructive",
    });
  };

  const loadThreads = async () => {
    try {
      setLoadingThreads(true);
      const response = await twitterApi.listThreads();
      setThreads(response.threads);
    } catch (err) {
      handleApiError(err, "Failed to load Twitter threads");
    } finally {
      setLoadingThreads(false);
    }
  };

  const loadMessages = async (threadId: string) => {
    try {
      setLoadingMessages(true);
      const response = await twitterApi.getThreadMessages(threadId);
      setMessages(response.messages);
    } catch (err) {
      handleApiError(err, "Failed to load Twitter thread messages");
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleCreateTestMessage = async () => {
    try {
      setCreatingTest(true);
      const message = await twitterApi.createTestInbound();
      toast({
        title: "Test Twitter DM created",
        description: "A mock inbound Twitter DM has been created for testing.",
      });
      await loadThreads();
      setSelectedThreadId(message.metadata?.twitter_thread_id || null);
      if (message.metadata?.twitter_thread_id) {
        await loadMessages(message.metadata.twitter_thread_id);
      }
    } catch (err) {
      handleApiError(err, "Failed to create test Twitter message");
    } finally {
      setCreatingTest(false);
    }
  };

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    setReplyBody("");
    loadMessages(threadId);
  };

  const handleBackToList = () => {
    setSelectedThreadId(null);
    setMessages([]);
    setReplyBody("");
  };

  const handleSendReply = async () => {
    if (!selectedThreadId || !replyBody.trim()) return;
    try {
      setSendingReply(true);
      const response = await twitterApi.replyToThread(selectedThreadId, replyBody.trim());
      setMessages((prev) => [...prev, response.message]);
      setReplyBody("");
      toast({
        title: "Reply sent",
        description: "Your Twitter DM has been sent.",
      });
    } catch (err) {
      handleApiError(err, "Failed to send Twitter reply");
    } finally {
      setSendingReply(false);
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  const selectedThread = threads.find((t) => t.id === selectedThreadId);
  const showListOnMobile = isMobile && !selectedThreadId;
  const showConversationOnMobile = isMobile && !!selectedThreadId;

  return (
    <div className="flex flex-col w-full min-w-0">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        {isMobile && selectedThreadId ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="shrink-0 -ml-2 min-h-[44px] min-w-[44px]"
              aria-label="Back to thread list"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <p className="truncate text-sm font-medium text-foreground flex-1 min-w-0">
              {selectedThread?.content || "Twitter / X Conversation"}
            </p>
            <div className="w-[52px]" aria-hidden />
          </>
        ) : (
          <>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground sm:text-lg tracking-tight flex items-center gap-2">
                <Send className="h-4 w-4 text-muted-foreground" />
                <span>Twitter / X</span>
              </h2>
              <p className="text-[13px] text-muted-foreground mt-0.5 hidden sm:block">
                Twitter/X Direct Messages with customers
              </p>
            </div>
            <Button
              onClick={handleCreateTestMessage}
              disabled={creatingTest}
              variant="outline"
              size="sm"
              className="shrink-0 min-h-[40px]"
            >
              <MessageSquarePlus className="h-4 w-4 mr-1.5" aria-hidden />
              {creatingTest ? "Creating…" : "Add test DM"}
            </Button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 min-h-0">
        {/* Thread list */}
        <Card
          variant="subtle"
          className={cn(
            "flex flex-col overflow-hidden rounded-xl border border-border/50",
            "min-h-[320px] md:min_h-[420px] lg:min-h-[480px]",
            showListOnMobile ? "flex" : "hidden md:flex"
          )}
        >
          <div className="p-3 sm:p-4 border-b border-border/50 shrink-0">
            <h3 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">
              Messages
            </h3>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {loadingThreads ? (
              <div className="p-3 sm:p-4 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <p className="text-[13px] text-muted-foreground">No Twitter/DM threads yet.</p>
                <p className="text-[12px] text-muted-foreground/80 mt-1">
                  Use &quot;Add test DM&quot; to create a sample conversation.
                </p>
                <Button
                  onClick={handleCreateTestMessage}
                  disabled={creatingTest}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  {creatingTest ? "Creating…" : "Add test DM"}
                </Button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto overscroll-contain p-2 sm:p-3 space-y-1">
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => handleSelectThread(thread.id)}
                    className={cn(
                      "w-full text-left rounded-xl px-3 py-3 sm:py-3.5 min-h-[56px]",
                      "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
                      selectedThreadId === thread.id
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-muted/60 border border-transparent"
                    )}
                  >
                    <div className="font-medium text-[13px] sm:text-sm truncate pr-2">
                      {thread.content || "Twitter DM conversation"}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[12px] text-muted-foreground">
                      {thread.metadata?.from && (
                        <span className="truncate flex-1 min-w-0">@{thread.metadata.from}</span>
                      )}
                      {thread.metadata?.message_count != null && (
                        <span className="shrink-0">
                          {thread.metadata.message_count} message
                          {thread.metadata.message_count === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Conversation panel */}
        <Card
          variant="subtle"
          className={cn(
            "flex flex-col overflow-hidden rounded-xl border border-border/50",
            "min-h-[320px] md:min-h-[420px] lg:min-h-[480px]",
            "md:col-span-2",
            showConversationOnMobile ? "flex" : "hidden md:flex"
          )}
        >
          {!selectedThreadId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center min-h-[280px]">
              <div className="rounded-full bg-muted/50 p-4 mb-4">
                <Send className="h-8 w-8 text-muted-foreground/70" aria-hidden />
              </div>
              <p className="text-sm font-medium text-foreground/90">No thread selected</p>
              <p className="text-[13px] text-muted-foreground mt-1.5 max-w-[260px]">
                Choose a thread from the list to view the Twitter DM and reply.
              </p>
            </div>
          ) : loadingMessages ? (
            <div className="flex-1 p-4 sm:p-6 space-y-4">
              <Skeleton className="h-20 w-3/4 rounded-2xl" />
              <Skeleton className="h-16 w-2/3 rounded-2xl ml-auto" />
              <Skeleton className="h-24 w-4/5 rounded-2xl" />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 min-h-0">
                {messages.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">No messages in this thread yet.</p>
                ) : (
                  messages.map((message) => {
                    const isInbound = message.metadata?.direction !== "outbound";
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex flex-col gap-1 max-w-[92%] sm:max-w-[88%]",
                          isInbound ? "mr-auto" : "ml-auto items-end"
                        )}
                      >
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-3 text-[13px] sm:text-sm leading-relaxed",
                            "shadow-sm",
                            isInbound
                              ? "bg-muted/50 border border-border/50 text-foreground"
                              : "bg-primary text-primary-foreground border border-primary"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                            <span className="font-medium text-[12px] opacity-90">
                              {isInbound ? `@${message.metadata?.from || "Customer"}` : "You"}
                            </span>
                            {message.timestamp && (
                              <span className="text-[11px] opacity-75 tabular-nums">
                                {formatRelativeTime(message.timestamp)}
                              </span>
                            )}
                          </div>
                          <div className="whitespace-pre-wrap break-words">{message.content}</div>
                          {message.metadata?.media_urls && message.metadata.media_urls.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border/30">
                              <span className="text-[11px] text-muted-foreground">
                                {message.metadata.media_urls.length} media attachment(s)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="shrink-0 p-4 sm:p-5 pt-0 border-t border-border/50 space-y-3">
                <label htmlFor="twitter-reply" className="sr-only">
                  Reply
                </label>
                <Textarea
                  id="twitter-reply"
                  rows={3}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Type your Twitter DM reply…"
                  className={cn(
                    "resize-none rounded-xl border-border/60 text-[13px] sm:text-sm min-h-[88px]",
                    "focus-visible:ring-2 focus-visible:ring-ring/20"
                  )}
                />
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-[12px] text-muted-foreground truncate px-0.5">
                    Reply will be sent as a Twitter Direct Message.
                  </p>
                  <Button
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyBody.trim()}
                    className="w-full sm:w-auto min-h-[44px] sm:min-h-[40px]"
                  >
                    {sendingReply ? "Sending…" : "Send DM"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
