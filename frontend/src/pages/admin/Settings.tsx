import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";

// Helper function to convert hex to HSL
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Helper function to convert HSL to hex
function hslToHex(hsl: string): string {
  const [h, s, l] = hsl.split(" ").map((val, idx) => {
    if (idx === 0) return parseFloat(val);
    return parseFloat(val.replace("%", "")) / 100;
  });

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (val: number) => {
    const hex = Math.round((val + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const BRAND_COLOR_STORAGE_KEY = "acmedesk-brand-color";

export default function Settings() {
  const { resolvedTheme } = useTheme();
  const [model, setModel] = useState("gpt-4o");
  const [temperature, setTemperature] = useState(0.1);
  const [topK, setTopK] = useState(5);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful AcmeDesk support assistant. Answer questions ONLY based on the provided context. If you cannot find the answer in the context, say so and offer to connect the user with a human agent."
  );

  // Get default brand color from CSS
  const getDefaultBrandColor = (): string => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const brandPrimary = computedStyle.getPropertyValue("--brand-primary").trim();
    // Default colors based on theme
    if (!brandPrimary || brandPrimary === "var(--brand-primary)") {
      return resolvedTheme === "dark" ? "#5b8def" : "#3b5fcf";
    }
    // Convert HSL to hex for color input
    return hslToHex(brandPrimary);
  };

  const [brandColor, setBrandColor] = useState<string>(() => {
    const stored = localStorage.getItem(BRAND_COLOR_STORAGE_KEY);
    return stored || getDefaultBrandColor();
  });

  // Apply brand color to CSS custom property
  useEffect(() => {
    const root = document.documentElement;
    const hsl = hexToHsl(brandColor);
    root.style.setProperty("--brand-primary", hsl);
    
    // Calculate foreground color (white or black based on luminance)
    const [h, s, l] = hsl.split(" ").map((val, idx) => {
      if (idx === 0) return parseFloat(val);
      return parseFloat(val.replace("%", "")) / 100;
    });
    const luminance = l;
    const foreground = luminance > 0.5 ? "0 0% 100%" : "0 0% 0%";
    root.style.setProperty("--brand-primary-foreground", foreground);
  }, [brandColor]);

  const handleBrandColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setBrandColor(newColor);
    localStorage.setItem(BRAND_COLOR_STORAGE_KEY, newColor);
  };

  const resetBrandColor = () => {
    const defaultColor = resolvedTheme === "dark" ? "#5b8def" : "#3b5fcf";
    setBrandColor(defaultColor);
    localStorage.removeItem(BRAND_COLOR_STORAGE_KEY);
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Configure the RAG pipeline and model parameters
        </p>
      </div>

      <div className="space-y-6">
        {/* Model */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-5">
          <h3 className="text-[15px] font-semibold text-foreground">Model Configuration</h3>

          <div>
            <label className="text-[13px] font-medium text-foreground block mb-1.5">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[14px] text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus:ring-2 focus:ring-ring/20 focus:border-primary"
              aria-label="Model selection"
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[13px] font-medium text-foreground">Temperature</label>
              <span className="text-[13px] text-muted-foreground">{temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              aria-label="Temperature"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[13px] font-medium text-foreground">Max Tokens</label>
              <span className="text-[13px] text-muted-foreground">{maxTokens}</span>
            </div>
            <input
              type="range"
              min="256"
              max="4096"
              step="256"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full accent-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              aria-label="Max tokens"
            />
          </div>
        </div>

        {/* Retrieval */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-5">
          <h3 className="text-[15px] font-semibold text-foreground">Retrieval Settings</h3>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[13px] font-medium text-foreground">Top-K Results</label>
              <span className="text-[13px] text-muted-foreground">{topK}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
              className="w-full accent-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              aria-label="Top-K results"
            />
            <p className="text-[12px] text-muted-foreground mt-1.5">
              Number of document chunks to retrieve per query
            </p>
          </div>
        </div>

        {/* System Prompt */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-4">
          <h3 className="text-[15px] font-semibold text-foreground">System Prompt</h3>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus:ring-2 focus:ring-ring/20 focus:border-primary resize-none"
            aria-label="System prompt"
          />
          <p className="text-[12px] text-muted-foreground">
            This prompt is prepended to every conversation to guide the model's behavior
          </p>
        </div>

        {/* Branding & Appearance */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-5">
          <h3 className="text-[15px] font-semibold text-foreground">Branding & Appearance</h3>

          <div>
            <label className="text-[13px] font-medium text-foreground block mb-1.5">
              Primary Brand Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brandColor}
                onChange={handleBrandColorChange}
                className="w-16 h-10 rounded-lg border border-border cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                aria-label="Primary brand color"
              />
              <input
                type="text"
                value={brandColor}
                onChange={(e) => {
                  if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                    handleBrandColorChange({
                      target: { value: e.target.value },
                    } as React.ChangeEvent<HTMLInputElement>);
                  } else {
                    setBrandColor(e.target.value);
                  }
                }}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-[14px] text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus:ring-2 focus:ring-ring/20 focus:border-primary font-mono"
                placeholder="#3b5fcf"
                aria-label="Brand color hex value"
              />
              <button
                onClick={resetBrandColor}
                className="px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                aria-label="Reset brand color to default"
              >
                Reset
              </button>
            </div>
            <p className="text-[12px] text-muted-foreground mt-1.5">
              Customize the primary brand color used throughout the application. Changes apply immediately.
            </p>
          </div>
        </div>

        <button className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-[14px] font-medium hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2">
          Save Changes
        </button>
      </div>
    </div>
  );
}
