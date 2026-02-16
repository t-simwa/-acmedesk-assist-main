import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type FontSize = "small" | "medium" | "large" | "extra-large";

interface AccessibilityContextType {
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const HIGH_CONTRAST_STORAGE_KEY = "acmedesk-high-contrast";
const FONT_SIZE_STORAGE_KEY = "acmedesk-font-size";

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [highContrast, setHighContrastState] = useState<boolean>(() => {
    const stored = localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY);
    return stored === "true";
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const stored = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (stored === "small" || stored === "medium" || stored === "large" || stored === "extra-large") {
      return stored;
    }
    return "medium";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Apply high contrast mode
    if (highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }
  }, [highContrast]);

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Apply font size
    root.classList.remove("font-size-small", "font-size-medium", "font-size-large", "font-size-extra-large");
    root.classList.add(`font-size-${fontSize}`);
    
    // Set CSS custom property for font size multiplier
    const multipliers: Record<FontSize, string> = {
      small: "0.875",    // 87.5% (14px base becomes ~12px)
      medium: "1",       // 100% (14px base)
      large: "1.25",      // 125% (14px base becomes ~17.5px)
      "extra-large": "1.5", // 150% (14px base becomes ~21px)
    };
    
    root.style.setProperty("--font-size-multiplier", multipliers[fontSize]);
  }, [fontSize]);

  const setHighContrast = (enabled: boolean) => {
    setHighContrastState(enabled);
    localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, enabled.toString());
  };

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
  };

  return (
    <AccessibilityContext.Provider value={{ highContrast, setHighContrast, fontSize, setFontSize }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
}
