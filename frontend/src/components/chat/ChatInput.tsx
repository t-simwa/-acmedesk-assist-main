import { useState, useRef, useEffect, forwardRef } from "react";
import { ArrowUp } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ onSend, disabled }, ref) => {
    const { t } = useTranslation();
    const [value, setValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isMobile = useIsMobile();
    
    // Use forwarded ref if provided, otherwise use internal ref
    const inputRef = (ref as React.RefObject<HTMLTextAreaElement>) || textareaRef;

    // Expose setValue method via ref for external control
    useEffect(() => {
      if (inputRef.current && typeof ref === "object" && ref !== null) {
        (inputRef.current as any).setValue = (newValue: string) => {
          setValue(newValue);
          if (inputRef.current) {
            inputRef.current.value = newValue;
            inputRef.current.style.height = "auto";
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
          }
        };
      }
    }, [ref]);

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
      <div className={`border-t border-border ${
        isMobile ? "px-4 py-4" : "px-4 py-3"
      }`}>
        <div className={`flex items-end ${
          isMobile ? "gap-3" : "gap-2"
        }`}>
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.inputPlaceholder")}
            disabled={disabled}
            rows={1}
            className={`flex-1 resize-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none max-h-[120px] rounded-md text-sm ${
              isMobile 
                ? "py-3" // F2.4 - Larger text and padding on mobile (prevents zoom on iOS)
                : "py-1.5"
            }`}
            aria-label={t("chat.inputPlaceholder")}
          />
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            className={`flex-shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${
              isMobile
                ? "w-11 h-11 hover:opacity-90" // F2.4 - Larger touch target (44x44px minimum)
                : "w-8 h-8 hover:opacity-90"
            }`}
            aria-label={t("chat.sendMessage")}
          >
            <ArrowUp size={isMobile ? 20 : 16} />
          </button>
        </div>
      </div>
    );
  }
);

ChatInput.displayName = "ChatInput";
