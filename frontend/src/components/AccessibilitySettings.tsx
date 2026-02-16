import { useAccessibility } from "@/contexts/AccessibilityContext";
import { Contrast, Type, CheckCircle2, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function AccessibilitySettings() {
  const { highContrast, setHighContrast, fontSize, setFontSize, reduceMotion, setReduceMotion } = useAccessibility();

  return (
    <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-6">
      <div className="flex items-center gap-2">
        <Contrast className="h-5 w-5 text-primary" aria-hidden="true" />
        <h3 className="text-[15px] font-semibold text-foreground">Accessibility Settings</h3>
      </div>

      {/* High Contrast Mode */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Contrast className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Label htmlFor="high-contrast-toggle" className="text-[13px] font-medium text-foreground cursor-pointer">
              High Contrast Mode
            </Label>
          </div>
          <Switch
            id="high-contrast-toggle"
            checked={highContrast}
            onCheckedChange={setHighContrast}
            aria-label="Toggle high contrast mode"
          />
        </div>
        <p className="text-[12px] text-muted-foreground">
          Increases color contrast for better visibility. Meets WCAG AAA standards where possible.
        </p>
      </div>

      {/* Font Size */}
      <div className="space-y-3">
        <Label className="text-[13px] font-medium text-foreground flex items-center gap-2">
          <Type className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Font Size
        </Label>
        <div className="flex flex-wrap gap-2">
          {(["small", "medium", "large", "extra-large"] as const).map((size) => (
            <Button
              key={size}
              variant={fontSize === size ? "default" : "outline"}
              size="sm"
              onClick={() => setFontSize(size)}
              className="text-[12px] capitalize"
              aria-label={`Set font size to ${size}`}
              aria-pressed={fontSize === size}
            >
              {size === "small" && "Small (87.5%)"}
              {size === "medium" && "Medium (100%)"}
              {size === "large" && "Large (125%)"}
              {size === "extra-large" && "Extra Large (150%)"}
            </Button>
          ))}
        </div>
        <p className="text-[12px] text-muted-foreground">
          Adjust the global font size. Text can also be resized up to 200% using browser zoom without breaking the layout.
        </p>
      </div>

      {/* Reduce Motion */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Move className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Label htmlFor="reduce-motion-toggle" className="text-[13px] font-medium text-foreground cursor-pointer">
              Reduce Motion
            </Label>
          </div>
          <Switch
            id="reduce-motion-toggle"
            checked={reduceMotion}
            onCheckedChange={setReduceMotion}
            aria-label="Toggle reduce motion"
          />
        </div>
        <p className="text-[12px] text-muted-foreground">
          Disables animations and transitions throughout the application. Respects your system's "Reduce motion" preference by default.
        </p>
      </div>

      {/* Info Note */}
      <div className="bg-info/10 border border-info/20 rounded-lg p-3 flex items-start gap-2">
        <CheckCircle2 className="h-4 w-4 text-info flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-[12px] font-medium text-info">Accessibility Features</p>
          <p className="text-[11px] text-info/90">
            All settings are saved automatically and persist across sessions. Icons are used alongside colors to ensure information is accessible to users with color vision deficiencies.
          </p>
        </div>
      </div>
    </div>
  );
}
