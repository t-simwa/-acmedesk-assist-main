/**
 * Date Range Filter Component
 * 
 * Follows STYLE_GUIDE.md specifications:
 * - Filter control sizing (h-9 text-xs)
 * - Proper dropdown styling
 * - Responsive design
 */

import { useState, useCallback } from "react";
import { Calendar, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateRangeFilterProps {
  value: string;
  onChange: (value: string) => void;
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
    if (presetValue !== "custom") {
      setIsOpen(false);
    }
  }, [onChange]);

  const handleApplyCustom = useCallback(() => {
    const validationError = validateCustomRange();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (customStart && customEnd && onCustomRange) {
      onCustomRange(customStart, customEnd);
    }
    setIsOpen(false);
  }, [customStart, customEnd, onCustomRange, validateCustomRange]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 px-3 gap-1.5 text-xs",
            "border-border bg-card",
            "hover:bg-muted hover:border-border/80",
            "transition-all duration-150",
            className
          )}
        >
          <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="font-medium hidden sm:inline">{currentPreset.label}</span>
          <span className="font-medium sm:hidden">
            {currentPreset.value === "7days" ? "7d" : 
             currentPreset.value === "30days" ? "30d" : 
             currentPreset.value === "90days" ? "90d" : 
             currentPreset.value === "today" ? "Today" : "Custom"}
          </span>
          <ChevronDown className={cn(
            "h-3 w-3 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[220px] p-1.5 shadow-lg bg-card border-border"
        align="end"
      >
        <div className="space-y-0.5">
          {presets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleSelect(preset.value)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg",
                "text-xs font-medium transition-colors duration-150",
                value === preset.value
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted",
              )}
            >
              <span>{preset.label}</span>
              {value === preset.value && (
                <Check className="h-3.5 w-3.5" />
              )}
            </button>
          ))}
        </div>
        
        {/* Custom date picker */}
        {value === "custom" && (
          <div className="mt-2 pt-2 border-t border-border space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Start date
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => {
                  setCustomStart(e.target.value);
                  setError(null);
                }}
                className={cn(
                  "w-full h-8 rounded-lg border border-border bg-background px-2.5",
                  "text-xs font-mono text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                )}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                End date
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => {
                  setCustomEnd(e.target.value);
                  setError(null);
                }}
                className={cn(
                  "w-full h-8 rounded-lg border border-border bg-background px-2.5",
                  "text-xs font-mono text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                )}
              />
            </div>
            {error && (
              <p className="text-[10px] text-destructive">{error}</p>
            )}
            <Button
              size="sm"
              className="w-full h-8 text-xs"
              disabled={Boolean(error) || !customStart || !customEnd}
              onClick={handleApplyCustom}
            >
              Apply Range
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
