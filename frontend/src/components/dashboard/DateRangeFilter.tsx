import { useState, useCallback } from "react";
import { Calendar, ChevronDown, Check } from "lucide-react";
import { format } from "date-fns";
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
            "border-[#2D333B]",
            "hover:bg-[#252A33] hover:border-[#3D444B]",
            "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
            "transition-all duration-150",
            "font-description text-sm",
            className
          )}
          style={{ backgroundColor: "#1C1F26", color: "#F9FAFB" }}
        >
          <Calendar className="h-4 w-4 shrink-0" style={{ color: "#9CA3AF" }} />
          <span className="font-medium" style={{ color: "#F9FAFB" }}>{currentPreset.label}</span>
          <ChevronDown className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            isOpen && "rotate-180"
          )} style={{ color: "#9CA3AF" }} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[200px] p-1.5 shadow-lg"
        style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B" }}
        align="end"
      >
        <div className="space-y-1">
          {presets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleSelect(preset.value)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-lg",
                "text-sm font-description transition-colors duration-150",
              )}
              style={value === preset.value 
                ? { backgroundColor: "#4F8EF7", color: "#fff" } 
                : { color: "#F9FAFB" }
              }
              onMouseEnter={(e) => {
                if (value !== preset.value) e.currentTarget.style.backgroundColor = "#252A33";
              }}
              onMouseLeave={(e) => {
                if (value !== preset.value) e.currentTarget.style.backgroundColor = "transparent";
              }}
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
