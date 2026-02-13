import { useState, useRef, useEffect, forwardRef } from "react";
import { ArrowUp } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ onSend, disabled }, ref) => {
    const [value, setValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    // Use forwarded ref if provided, otherwise use internal ref
    const inputRef = (ref as React.RefObject<HTMLTextAreaElement>) || textareaRef;

    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
        inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
      }
    }, [value]);

    const handleSubmit = () => {
      const trimmed = value.trim();
      if (!trimmed || disabled) return;
      onSend(trimmed);
      setValue("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    };

    return (
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 py-1.5 max-h-[120px] rounded-md"
            aria-label="Chat message input"
          />
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 transition-all hover:opacity-90 active:scale-95 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            aria-label="Send message"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    );
  }
);

ChatInput.displayName = "ChatInput";
