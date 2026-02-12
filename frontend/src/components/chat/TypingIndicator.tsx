export function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="bg-chat-assistant text-chat-assistant-foreground px-4 py-3 rounded-2xl rounded-bl-md">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground typing-dot" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground typing-dot" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground typing-dot" />
        </div>
      </div>
    </div>
  );
}
