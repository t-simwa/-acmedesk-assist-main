import { useState, useCallback } from "react";
import { Calendar, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateRangeFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const presets = [
  { value: "today", label: "Today" },
  { value: "7days", label: "Last 7 days" },
  { value: "30days", label: "Last 30 days" },
];

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentPreset = presets.find(p => p.value === value) || presets[1];

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
        </div>
      </PopoverContent>
    </Popover>
  );
}
