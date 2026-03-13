import { useState, useCallback } from "react";
import { Calendar, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateRangeFilterProps {
  value: string;
  onChange: (value: string) => void;
  // called when a custom range is applied
  onCustomRange?: (start: string, end: string) => void;
  className?: string;
}

const presets = [
  { value: "today", label: "Today" },
  { value: "7days", label: "Last 7 days" },
  { value: "30days", label: "Last 30 days" },
  { value: "90days", label: "Last 90 days" },
  { value: "custom", label: "Custom range" },
];

export function DateRangeFilter({ value, onChange, onCustomRange, className }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentPreset = presets.find(p => p.value === value) || presets[1];
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const validateCustomRange = useCallback(() => {
    if (!customStart || !customEnd) return "";
    const start = new Date(customStart);
    const end = new Date(customEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return "Invalid date";
    }
    if (end < start) {
      return "End date must be after start date";
    }
    const deltaMs = end.getTime() - start.getTime();
    const days = deltaMs / (1000 * 60 * 60 * 24);
    if (days > 90) {
      return "Max range is 90 days";
    }
    return "";
  }, [customStart, customEnd]);

  const handleSelect = useCallback((presetValue: string) => {
    onChange(presetValue);
    setIsOpen(false);
  }, [onChange]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex items-center gap-2 h-10 px-3 py-2",
            "border-border bg-card text-foreground",
            "hover:bg-muted hover:border-border/80",
            "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
            "transition-all duration-150",
            "font-description text-sm",
            className
          )}
        >
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="font-medium text-foreground">{currentPreset.label}</span>
          <ChevronDown className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[200px] p-1.5 shadow-lg bg-card border-border"
        align="end"
      >
        <div className="space-y-0.5">
          {presets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleSelect(preset.value)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-lg",
                "text-sm font-description transition-colors duration-150",
                value === preset.value
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted",
              )}
            >
              <span>{preset.label}</span>
              {value === preset.value && (
                <Check className="h-4 w-4" />
              )}
            </button>
          ))}
          {value === "custom" && (
            <div className="mt-2 space-y-2">
              <label className="text-xs">Start date</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => {
                  setCustomStart(e.target.value);
                  setError(null);
                }}
                className="w-full rounded-lg border px-2 py-1 text-sm"
              />
              <label className="text-xs">End date</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => {
                  setCustomEnd(e.target.value);
                  setError(null);
                }}
                className="w-full rounded-lg border px-2 py-1 text-sm"
              />
              {error && (
                <p className="text-xs text-destructive mt-1">{error}</p>
              )}
              <Button
                size="sm"
                className="w-full"
                disabled={Boolean(error) || !customStart || !customEnd}
                onClick={() => {
                  const validationError = validateCustomRange();
                  if (validationError) {
                    setError(validationError);
                    return;
                  }
                  if (customStart && customEnd && onCustomRange) {
                    onCustomRange(customStart, customEnd);
                  }
                  setIsOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
