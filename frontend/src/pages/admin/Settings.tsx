import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { settingsApi, ApiError, RAGSettings, RAGSettingsValidationResponse } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, Loader2, Save, RotateCcw, TestTube, ChevronDown, Upload, X } from "lucide-react";
import { AccessibilitySettings } from "@/components/AccessibilitySettings";
import { Logo } from "@/components/Branding/Logo";
import { HelpIcon } from "@/components/help/HelpIcon";
import { HelpText } from "@/components/help/HelpText";

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
const PROMPT_TEMPLATES_KEY = "acmedesk-prompt-templates";
const BRANDING_SETTINGS_KEY = "acmedesk-branding-settings";
const LOGO_STORAGE_KEY = "acmedesk-custom-logo";
const CHAT_GREETING_KEY = "acmedesk-chat-greeting";
const CHAT_COLORS_KEY = "acmedesk-chat-colors";

interface PromptTemplate {
  id: string;
  name: string;
  prompt: string;
  createdAt: string;
}

interface FieldError {
  field: string;
  message: string;
}

type SettingsPreset = "conservative" | "balanced" | "aggressive" | "custom";

const PRESETS: Record<SettingsPreset, Partial<RAGSettings>> = {
  conservative: {
    temperature: 0.1,
    top_k: 3,
    max_tokens: 512,
    chunk_size: 400,
    chunk_overlap: 50,
  },
  balanced: {
    temperature: 0.7,
    top_k: 5,
    max_tokens: 1024,
    chunk_size: 600,
    chunk_overlap: 100,
  },
  aggressive: {
    temperature: 1.2,
    top_k: 10,
    max_tokens: 2048,
    chunk_size: 1000,
    chunk_overlap: 200,
  },
  custom: {},
};

const DEFAULT_SETTINGS: RAGSettings = {
  temperature: 0.7,
  top_k: 5,
  max_tokens: 1000,
  chunk_size: 600,
  chunk_overlap: 100,
  embedding_model: "all-MiniLM-L6-v2",
  chunking_strategy: "recursive",
  system_prompt: "You are a helpful AcmeDesk support assistant. Answer questions ONLY based on the provided context. If you cannot find the answer in the context, say so and offer to connect the user with a human agent.",
};

export default function Settings() {
  const { resolvedTheme } = useTheme();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [validationResult, setValidationResult] = useState<RAGSettingsValidationResponse | null>(null);
  
  // Form state
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [topK, setTopK] = useState(5);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [chunkSize, setChunkSize] = useState(600);
  const [chunkOverlap, setChunkOverlap] = useState(100);
  const [embeddingModel, setEmbeddingModel] = useState("all-MiniLM-L6-v2");
  const [chunkingStrategy, setChunkingStrategy] = useState<"recursive" | "fixed" | "semantic">("recursive");
  const [systemPrompt, setSystemPrompt] = useState("");
  
  // UI state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [currentPreset, setCurrentPreset] = useState<SettingsPreset>("custom");
  const [showPromptTemplates, setShowPromptTemplates] = useState(false);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");

  // Brand color state
  const getDefaultBrandColor = (): string => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const brandPrimary = computedStyle.getPropertyValue("--brand-primary").trim();
    if (!brandPrimary || brandPrimary === "var(--brand-primary)") {
      return resolvedTheme === "dark" ? "#5b8def" : "#3b5fcf";
    }
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
    
    const [h, s, l] = hsl.split(" ").map((val, idx) => {
      if (idx === 0) return parseFloat(val);
      return parseFloat(val.replace("%", "")) / 100;
    });
    const luminance = l;
    const foreground = luminance > 0.5 ? "0 0% 100%" : "0 0% 0%";
    root.style.setProperty("--brand-primary-foreground", foreground);
  }, [brandColor]);

  // Branding state (logo, chat colors, greeting, domain)
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    const stored = localStorage.getItem(LOGO_STORAGE_KEY);
    if (stored) {
      try {
        const logoData = JSON.parse(stored);
        return logoData.url || null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [companyName, setCompanyName] = useState<string>(() => {
    const stored = localStorage.getItem(BRANDING_SETTINGS_KEY);
    if (stored) {
      try {
        const settings = JSON.parse(stored);
        return settings.companyName || "AcmeDesk";
      } catch {
        return "AcmeDesk";
      }
    }
    return "AcmeDesk";
  });
  const [chatGreeting, setChatGreeting] = useState<string>(() => {
    const stored = localStorage.getItem(CHAT_GREETING_KEY);
    return stored || "Hi there! 👋 I'm here to help with questions about AcmeDesk — pricing, setup, integrations, and more. What can I help you with?";
  });
  const [chatColors, setChatColors] = useState(() => {
    const stored = localStorage.getItem(CHAT_COLORS_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { primary: null, secondary: null, background: null };
      }
    }
    return { primary: null, secondary: null, background: null };
  });
  const [customDomain, setCustomDomain] = useState<string>(() => {
    const stored = localStorage.getItem(BRANDING_SETTINGS_KEY);
    if (stored) {
      try {
        const settings = JSON.parse(stored);
        return settings.customDomain || "";
      } catch {
        return "";
      }
    }
    return "";
  });
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Load prompt templates from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(PROMPT_TEMPLATES_KEY);
    if (stored) {
      try {
        setPromptTemplates(JSON.parse(stored));
      } catch (e) {
        console.error("Error loading prompt templates:", e);
      }
    }
  }, []);

  // Fetch RAG settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const settings = await settingsApi.getRagSettings();
        
        if (settings.model) setModel(settings.model);
        if (settings.temperature !== undefined) setTemperature(settings.temperature);
        if (settings.top_k !== undefined) setTopK(settings.top_k);
        if (settings.max_tokens !== undefined) setMaxTokens(settings.max_tokens);
        if (settings.chunk_size !== undefined) setChunkSize(settings.chunk_size);
        if (settings.chunk_overlap !== undefined) setChunkOverlap(settings.chunk_overlap);
        if (settings.embedding_model) setEmbeddingModel(settings.embedding_model);
        if (settings.chunking_strategy) setChunkingStrategy(settings.chunking_strategy);
        if (settings.system_prompt !== undefined && settings.system_prompt !== null) {
          setSystemPrompt(settings.system_prompt);
        } else {
          setSystemPrompt(DEFAULT_SETTINGS.system_prompt || "");
        }
      } catch (err) {
        const apiError = err as ApiError;
        const errorMessage = apiError?.message || "Failed to load settings";
        setError(typeof errorMessage === "string" ? errorMessage : String(errorMessage));
        console.error("Error fetching settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Inline validation
  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case "chunkSize":
        if (value < 1) return "Chunk size must be at least 1";
        if (value > 5000) return "Chunk size should not exceed 5000";
        if (chunkOverlap >= value) return "Chunk overlap must be less than chunk size";
        return null;
      case "chunkOverlap":
        if (value < 0) return "Chunk overlap must be non-negative";
        if (value >= chunkSize) return "Chunk overlap must be less than chunk size";
        if (value > chunkSize * 0.5) return "High overlap (>50%) may cause redundant processing";
        return null;
      case "temperature":
        if (value < 0 || value > 2) return "Temperature must be between 0 and 2";
        return null;
      case "topK":
        if (value < 1) return "Top-K must be at least 1";
        if (value > 50) return "Top-K should not exceed 50";
        return null;
      case "maxTokens":
        if (value < 256) return "Max tokens must be at least 256";
        if (value > 8192) return "Max tokens should not exceed 8192";
        return null;
      default:
        return null;
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    const error = validateField(field, value);
    if (error) {
      setFieldErrors((prev) => ({ ...prev, [field]: error }));
    } else {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Update state
    switch (field) {
      case "temperature":
        setTemperature(value);
        break;
      case "topK":
        setTopK(value);
        break;
      case "maxTokens":
        setMaxTokens(value);
        break;
      case "chunkSize":
        setChunkSize(value);
        // Re-validate chunkOverlap
        if (chunkOverlap >= value) {
          setFieldErrors((prev) => ({ ...prev, chunkOverlap: "Chunk overlap must be less than chunk size" }));
        }
        break;
      case "chunkOverlap":
        setChunkOverlap(value);
        break;
      case "embeddingModel":
        setEmbeddingModel(value);
        break;
      case "chunkingStrategy":
        setChunkingStrategy(value);
        break;
      case "systemPrompt":
        setSystemPrompt(value);
        break;
    }

    // Check if current settings match a preset
    checkPresetMatch();
  };

  const checkPresetMatch = () => {
    const current: Partial<RAGSettings> = {
      temperature,
      top_k: topK,
      max_tokens: maxTokens,
      chunk_size: chunkSize,
      chunk_overlap: chunkOverlap,
    };

    for (const [presetName, preset] of Object.entries(PRESETS)) {
      if (presetName === "custom") continue;
      let matches = true;
      for (const [key, value] of Object.entries(preset)) {
        const currentKey = key === "top_k" ? "top_k" : key === "max_tokens" ? "max_tokens" : key === "chunk_size" ? "chunk_size" : key === "chunk_overlap" ? "chunk_overlap" : key;
        if (current[currentKey as keyof RAGSettings] !== value) {
          matches = false;
          break;
        }
      }
      if (matches) {
        setCurrentPreset(presetName as SettingsPreset);
        return;
      }
    }
    setCurrentPreset("custom");
  };

  // Test settings
  const handleTestSettings = async () => {
    try {
      setTesting(true);
      setValidationResult(null);
      setError(null);

      const payload: Partial<RAGSettings> = {
        temperature,
        top_k: topK,
        max_tokens: maxTokens,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap,
        embedding_model: embeddingModel,
        chunking_strategy: chunkingStrategy,
        system_prompt: systemPrompt.trim() || null,
      };

      const result = await settingsApi.validateRagSettings(payload);
      setValidationResult(result);

      if (result.valid) {
        toast({
          title: "Settings validated",
          description: result.warnings.length > 0 
            ? `Valid with ${result.warnings.length} warning(s)` 
            : "All settings are valid",
          variant: "success",
        });
      } else {
        toast({
          title: "Validation failed",
          description: result.errors.join(", "),
          variant: "destructive",
        });
      }
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError?.message || "Failed to validate settings";
      setError(typeof errorMessage === "string" ? errorMessage : String(errorMessage));
      toast({
        title: "Error validating settings",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  // Apply preset
  const handleApplyPreset = (preset: SettingsPreset) => {
    if (preset === "custom") return;
    
    const presetValues = PRESETS[preset];
    if (presetValues.temperature !== undefined) {
      handleFieldChange("temperature", presetValues.temperature);
    }
    if (presetValues.top_k !== undefined) {
      handleFieldChange("topK", presetValues.top_k);
    }
    if (presetValues.max_tokens !== undefined) {
      handleFieldChange("maxTokens", presetValues.max_tokens);
    }
    if (presetValues.chunk_size !== undefined) {
      handleFieldChange("chunkSize", presetValues.chunk_size);
    }
    if (presetValues.chunk_overlap !== undefined) {
      handleFieldChange("chunkOverlap", presetValues.chunk_overlap);
    }
    
    setCurrentPreset(preset);
    toast({
      title: "Preset applied",
      description: `${preset.charAt(0).toUpperCase() + preset.slice(1)} preset has been applied`,
      variant: "success",
    });
  };

  // Reset to defaults
  const handleResetToDefaults = () => {
    handleFieldChange("temperature", DEFAULT_SETTINGS.temperature);
    handleFieldChange("topK", DEFAULT_SETTINGS.top_k);
    handleFieldChange("maxTokens", DEFAULT_SETTINGS.max_tokens);
    handleFieldChange("chunkSize", DEFAULT_SETTINGS.chunk_size);
    handleFieldChange("chunkOverlap", DEFAULT_SETTINGS.chunk_overlap);
    handleFieldChange("embeddingModel", DEFAULT_SETTINGS.embedding_model);
    handleFieldChange("chunkingStrategy", DEFAULT_SETTINGS.chunking_strategy);
    handleFieldChange("systemPrompt", DEFAULT_SETTINGS.system_prompt);
    setCurrentPreset("custom");
    toast({
      title: "Settings reset",
      description: "All settings have been reset to defaults",
      variant: "success",
    });
  };

  // Save prompt template
  const handleSavePromptTemplate = () => {
    if (!templateName.trim() || !systemPrompt.trim()) {
      toast({
        title: "Invalid template",
        description: "Please provide both a name and prompt text",
        variant: "destructive",
      });
      return;
    }

    const newTemplate: PromptTemplate = {
      id: `template-${Date.now()}`,
      name: templateName.trim(),
      prompt: systemPrompt.trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = [...promptTemplates, newTemplate];
    setPromptTemplates(updated);
    localStorage.setItem(PROMPT_TEMPLATES_KEY, JSON.stringify(updated));
    setTemplateName("");
    toast({
      title: "Template saved",
      description: `"${newTemplate.name}" has been saved`,
      variant: "success",
    });
  };

  // Load prompt template
  const handleLoadPromptTemplate = (template: PromptTemplate) => {
    setSystemPrompt(template.prompt);
    toast({
      title: "Template loaded",
      description: `"${template.name}" has been loaded`,
      variant: "success",
    });
  };

  // Delete prompt template
  const handleDeletePromptTemplate = (id: string) => {
    const updated = promptTemplates.filter((t) => t.id !== id);
    setPromptTemplates(updated);
    localStorage.setItem(PROMPT_TEMPLATES_KEY, JSON.stringify(updated));
    toast({
      title: "Template deleted",
      description: "Template has been removed",
      variant: "success",
    });
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    // Check for validation errors
    const hasErrors = Object.keys(fieldErrors).length > 0;
    if (hasErrors) {
      toast({
        title: "Validation errors",
        description: "Please fix all validation errors before saving",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const updatePayload: Partial<RAGSettings> = {
        temperature,
        top_k: topK,
        max_tokens: maxTokens,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap,
        embedding_model: embeddingModel,
        chunking_strategy: chunkingStrategy,
      };

      if (systemPrompt.trim()) {
        updatePayload.system_prompt = systemPrompt.trim();
      } else {
        updatePayload.system_prompt = null;
      }

      await settingsApi.updateRagSettings(updatePayload);
      
      toast({
        title: "Settings saved",
        description: "RAG settings have been updated successfully.",
        variant: "success",
      });
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError?.message || "Failed to save settings";
      setError(typeof errorMessage === "string" ? errorMessage : String(errorMessage));
      toast({
        title: "Error saving settings",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Error saving settings:", err);
    } finally {
      setSaving(false);
    }
  };

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

  // Branding handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, SVG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Logo file must be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const logoData = {
        url,
        companyName,
        uploadedAt: new Date().toISOString(),
      };
      localStorage.setItem(LOGO_STORAGE_KEY, JSON.stringify(logoData));
      setLogoUrl(url);
      
      // Dispatch custom event for Logo component to update
      window.dispatchEvent(new Event("logo-updated"));
      
      toast({
        title: "Logo uploaded",
        description: "Your custom logo has been uploaded successfully",
        variant: "success",
      });
    };
    reader.onerror = () => {
      toast({
        title: "Upload failed",
        description: "Failed to read the logo file",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    localStorage.removeItem(LOGO_STORAGE_KEY);
    setLogoUrl(null);
    window.dispatchEvent(new Event("logo-updated"));
    toast({
      title: "Logo removed",
      variant: "success",
      description: "Default AcmeDesk logo will be displayed",
    });
  };

  const handleCompanyNameChange = (value: string) => {
    setCompanyName(value);
    const settings = {
      companyName: value,
      customDomain,
    };
    localStorage.setItem(BRANDING_SETTINGS_KEY, JSON.stringify(settings));
    
    // Update logo data if exists
    const storedLogo = localStorage.getItem(LOGO_STORAGE_KEY);
    if (storedLogo) {
      try {
        const logoData = JSON.parse(storedLogo);
        logoData.companyName = value;
        localStorage.setItem(LOGO_STORAGE_KEY, JSON.stringify(logoData));
      } catch {
        // Ignore
      }
    }
  };

  const handleChatGreetingChange = (value: string) => {
    setChatGreeting(value);
    localStorage.setItem(CHAT_GREETING_KEY, value);
  };

  const handleChatColorChange = (colorType: "primary" | "secondary" | "background", value: string) => {
    const newColors = { ...chatColors, [colorType]: value || null };
    setChatColors(newColors);
    localStorage.setItem(CHAT_COLORS_KEY, JSON.stringify(newColors));
    
    // Apply colors immediately via CSS custom properties
    const root = document.documentElement;
    if (colorType === "primary") {
      if (value) {
        const hsl = hexToHsl(value);
        root.style.setProperty("--chat-user-bg", hsl);
        root.style.setProperty("--chat-header-bg", hsl);
      } else {
        root.style.removeProperty("--chat-user-bg");
        root.style.removeProperty("--chat-header-bg");
      }
    } else if (colorType === "secondary") {
      if (value) {
        const hsl = hexToHsl(value);
        root.style.setProperty("--chat-assistant-bg", hsl);
      } else {
        root.style.removeProperty("--chat-assistant-bg");
      }
    } else if (colorType === "background") {
      if (value) {
        const hsl = hexToHsl(value);
        root.style.setProperty("--chat-panel-bg", hsl);
      } else {
        root.style.removeProperty("--chat-panel-bg");
      }
    }
  };

  const handleResetChatColors = () => {
    setChatColors({ primary: null, secondary: null, background: null });
    localStorage.removeItem(CHAT_COLORS_KEY);
    const root = document.documentElement;
    root.style.removeProperty("--chat-user-bg");
    root.style.removeProperty("--chat-header-bg");
    root.style.removeProperty("--chat-assistant-bg");
    root.style.removeProperty("--chat-panel-bg");
    toast({
      title: "Chat colors reset",
      description: "Chat widget colors have been reset to defaults",
    });
  };

  const handleCustomDomainChange = (value: string) => {
    setCustomDomain(value);
    const settings = {
      companyName,
      customDomain: value,
    };
    localStorage.setItem(BRANDING_SETTINGS_KEY, JSON.stringify(settings));
  };

  // Apply chat colors on mount
  useEffect(() => {
    const root = document.documentElement;
    if (chatColors.primary) {
      const hsl = hexToHsl(chatColors.primary);
      root.style.setProperty("--chat-user-bg", hsl);
      root.style.setProperty("--chat-header-bg", hsl);
    }
    if (chatColors.secondary) {
      const hsl = hexToHsl(chatColors.secondary);
      root.style.setProperty("--chat-assistant-bg", hsl);
    }
    if (chatColors.background) {
      const hsl = hexToHsl(chatColors.background);
      root.style.setProperty("--chat-panel-bg", hsl);
    }
  }, []);

  const formatModelName = (modelName: string): string => {
    const modelMap: Record<string, string> = {
      "gpt-4o": "GPT-4o",
      "gpt-4o-mini": "GPT-4o Mini",
      "gpt-3.5-turbo": "GPT-3.5 Turbo",
      "gpt-4": "GPT-4",
    };
    return modelMap[modelName] || modelName;
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Settings</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Configure the RAG pipeline and model parameters
          </p>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Configure the RAG pipeline and model parameters
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-[14px] flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {validationResult && (
        <div className={`px-4 py-3 rounded-lg text-[14px] flex items-start gap-2 ${
          validationResult.valid 
            ? "bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400" 
            : "bg-destructive/10 border border-destructive/20 text-destructive"
        }`}>
          {validationResult.valid ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
          <div className="flex-1">
            <p className="font-medium mb-1">
              {validationResult.valid ? "Settings are valid" : "Validation failed"}
            </p>
            {validationResult.errors.length > 0 && (
              <ul className="list-disc list-inside space-y-1">
                {validationResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
            {validationResult.warnings.length > 0 && (
              <div className="mt-2">
                <p className="font-medium mb-1">Warnings:</p>
                <ul className="list-disc list-inside space-y-1">
                  {validationResult.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Settings Presets */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[15px] font-semibold text-foreground">Settings Presets</h3>
              <HelpIcon
                content="Quick configuration presets for common use cases. Conservative: precise, focused answers. Balanced: good mix of precision and creativity. Aggressive: creative, varied responses with more context."
                side="right"
              />
            </div>
            <span className="text-[12px] text-muted-foreground">
              Current: <span className="font-medium capitalize">{currentPreset}</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["conservative", "balanced", "aggressive"] as SettingsPreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => handleApplyPreset(preset)}
                className={`px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  currentPreset === preset
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                {preset.charAt(0).toUpperCase() + preset.slice(1)}
              </button>
            ))}
          </div>
          <HelpText>
            Presets configure temperature, top-k, max tokens, chunk size, and overlap for common use cases. You can customize individual settings after applying a preset.
          </HelpText>
        </div>

        {/* Model Configuration */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-5">
          <h3 className="text-[15px] font-semibold text-foreground">Model Configuration</h3>

          <div>
            <label htmlFor="model-display" className="text-[13px] font-medium text-foreground block mb-1.5">Model</label>
            <input
              id="model-display"
              type="text"
              value={model ? formatModelName(model) : ""}
              readOnly
              disabled
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-[14px] text-muted-foreground cursor-not-allowed"
              aria-describedby="model-description"
            />
            <p className="text-[12px] text-muted-foreground mt-1.5">
              Current model in use (cannot be changed from this interface)
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <label htmlFor="temperature-slider" className="text-[13px] font-medium text-foreground">Temperature</label>
                <HelpIcon
                  content="Controls the creativity/randomness of responses. Lower values (0-0.5) produce more focused, deterministic answers. Higher values (1-2) produce more creative, varied responses."
                  side="right"
                />
              </div>
              <span className="text-[13px] text-muted-foreground" aria-live="polite" aria-atomic="true">{temperature}</span>
            </div>
            <input
              id="temperature-slider"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => handleFieldChange("temperature", parseFloat(e.target.value))}
              className={`w-full accent-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${
                fieldErrors.temperature ? "border-destructive" : ""
              }`}
              aria-valuemin={0}
              aria-valuemax={2}
              aria-valuenow={temperature}
              aria-valuetext={`${temperature}`}
              aria-invalid={!!fieldErrors.temperature}
              aria-describedby={fieldErrors.temperature ? "temperature-error" : undefined}
            />
            {fieldErrors.temperature && (
              <p id="temperature-error" className="text-[12px] text-destructive mt-1">
                {fieldErrors.temperature}
              </p>
            )}
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
              <span>Precise</span>
              <span>Creative</span>
            </div>
            <HelpText>
              Lower values produce more consistent, factual responses. Higher values allow for more varied and creative answers.
            </HelpText>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <label htmlFor="max-tokens-slider" className="text-[13px] font-medium text-foreground">Max Tokens</label>
                <HelpIcon
                  content="Maximum number of tokens (words/characters) in the AI's response. Higher values allow longer responses but increase API costs. Recommended: 512-2048 tokens."
                  side="right"
                />
              </div>
              <span className="text-[13px] text-muted-foreground" aria-live="polite" aria-atomic="true">{maxTokens}</span>
            </div>
            <input
              id="max-tokens-slider"
              type="range"
              min="256"
              max="4096"
              step="256"
              value={maxTokens}
              onChange={(e) => handleFieldChange("maxTokens", parseInt(e.target.value))}
              className={`w-full accent-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${
                fieldErrors.maxTokens ? "border-destructive" : ""
              }`}
              aria-valuemin={256}
              aria-valuemax={4096}
              aria-valuenow={maxTokens}
              aria-valuetext={`${maxTokens} tokens`}
              aria-invalid={!!fieldErrors.maxTokens}
              aria-describedby={fieldErrors.maxTokens ? "max-tokens-error" : undefined}
            />
            {fieldErrors.maxTokens && (
              <p id="max-tokens-error" className="text-[12px] text-destructive mt-1">
                {fieldErrors.maxTokens}
              </p>
            )}
            <HelpText>
              Limits response length. A token is roughly 4 characters. Typical responses use 100-500 tokens.
            </HelpText>
          </div>
        </div>

        {/* Retrieval Settings */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-5">
          <h3 className="text-[15px] font-semibold text-foreground">Retrieval Settings</h3>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <label htmlFor="top-k-slider" className="text-[13px] font-medium text-foreground">Top-K Results</label>
                <HelpIcon
                  content="Number of document chunks to retrieve and use as context for each query. Higher values provide more context but may include less relevant information. Recommended: 3-10 chunks."
                  side="right"
                />
              </div>
              <span className="text-[13px] text-muted-foreground" aria-live="polite" aria-atomic="true">{topK}</span>
            </div>
            <input
              id="top-k-slider"
              type="range"
              min="1"
              max="20"
              step="1"
              value={topK}
              onChange={(e) => handleFieldChange("topK", parseInt(e.target.value))}
              className={`w-full accent-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${
                fieldErrors.topK ? "border-destructive" : ""
              }`}
              aria-valuemin={1}
              aria-valuemax={20}
              aria-valuenow={topK}
              aria-valuetext={`${topK} results`}
              aria-invalid={!!fieldErrors.topK}
              aria-describedby={fieldErrors.topK ? "top-k-error" : undefined}
            />
            {fieldErrors.topK && (
              <p id="top-k-error" className="text-[12px] text-destructive mt-1">
                {fieldErrors.topK}
              </p>
            )}
            <HelpText>
              More chunks provide broader context but may reduce answer precision. Start with 5 and adjust based on your document structure.
            </HelpText>
          </div>
        </div>

        {/* Chunking Strategy Configuration */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-5">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[15px] font-semibold text-foreground">Chunking Strategy</h3>
            <HelpIcon
              content="Method for splitting documents into chunks. Recursive: intelligently splits on paragraphs and sentences. Fixed: splits at exact character counts. Semantic: splits based on meaning and context."
              side="right"
            />
          </div>

          <div>
            <label htmlFor="chunking-strategy" className="text-[13px] font-medium text-foreground block mb-1.5">
              Chunking Method
            </label>
            <select
              id="chunking-strategy"
              value={chunkingStrategy}
              onChange={(e) => handleFieldChange("chunkingStrategy", e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[14px] text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus:ring-2 focus:ring-ring/20 focus:border-primary"
            >
              <option value="recursive">Recursive (intelligent splitting)</option>
              <option value="fixed">Fixed (character-based)</option>
              <option value="semantic">Semantic (meaning-based)</option>
            </select>
            <HelpText>
              Recursive splitting is recommended for most documents as it preserves sentence and paragraph boundaries. Use fixed splitting for uniform content, semantic for complex technical documents.
            </HelpText>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <label htmlFor="chunk-size-input" className="text-[13px] font-medium text-foreground">Chunk Size</label>
                <HelpIcon
                  content="Character size for splitting documents into chunks. Smaller chunks (200-400) are more precise but may lose context. Larger chunks (800-1200) preserve context but may include irrelevant information."
                  side="right"
                />
              </div>
            </div>
            <input
              id="chunk-size-input"
              type="number"
              min="1"
              max="5000"
              value={chunkSize}
              onChange={(e) => handleFieldChange("chunkSize", parseInt(e.target.value) || 600)}
              className={`w-full px-3 py-2 bg-background border rounded-lg text-[14px] text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus:ring-2 focus:ring-ring/20 ${
                fieldErrors.chunkSize 
                  ? "border-destructive focus:border-destructive" 
                  : "border-border focus:border-primary"
              }`}
              aria-describedby={fieldErrors.chunkSize ? "chunk-size-error" : "chunk-size-description"}
              aria-invalid={!!fieldErrors.chunkSize}
            />
            {fieldErrors.chunkSize ? (
              <p id="chunk-size-error" className="text-[12px] text-destructive mt-1">
                {fieldErrors.chunkSize}
              </p>
            ) : (
              <HelpText id="chunk-size-description">
                Character size for document chunking. Default: 600 characters. Adjust based on your document structure - technical docs may need larger chunks, FAQs may need smaller ones.
              </HelpText>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <label htmlFor="chunk-overlap-input" className="text-[13px] font-medium text-foreground">Chunk Overlap</label>
                <HelpIcon
                  content="Number of characters shared between adjacent chunks. Overlap prevents information loss at chunk boundaries. Recommended: 10-20% of chunk size (e.g., 50-100 for 600-char chunks)."
                  side="right"
                />
              </div>
            </div>
            <input
              id="chunk-overlap-input"
              type="number"
              min="0"
              max={chunkSize - 1}
              value={chunkOverlap}
              onChange={(e) => handleFieldChange("chunkOverlap", parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 bg-background border rounded-lg text-[14px] text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus:ring-2 focus:ring-ring/20 ${
                fieldErrors.chunkOverlap 
                  ? "border-destructive focus:border-destructive" 
                  : "border-border focus:border-primary"
              }`}
              aria-describedby={fieldErrors.chunkOverlap ? "chunk-overlap-error" : "chunk-overlap-description"}
              aria-invalid={!!fieldErrors.chunkOverlap}
            />
            {fieldErrors.chunkOverlap ? (
              <p id="chunk-overlap-error" className="text-[12px] text-destructive mt-1">
                {fieldErrors.chunkOverlap}
              </p>
            ) : (
              <HelpText id="chunk-overlap-description">
                Number of characters to overlap between chunks. Default: 100. Overlap ensures context isn't lost when splitting documents, especially for sentences that span chunk boundaries.
              </HelpText>
            )}
          </div>
        </div>

        {/* Embedding Model Selection */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-5">
          <h3 className="text-[15px] font-semibold text-foreground">Embedding Model</h3>

          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label htmlFor="embedding-model" className="text-[13px] font-medium text-foreground">
                Embedding Model
              </label>
              <HelpIcon
                content="Model used to convert text into numerical vectors for semantic search. all-MiniLM-L6-v2 is fast and efficient. all-mpnet-base-v2 offers better quality but is slower."
                side="right"
              />
            </div>
            <select
              id="embedding-model"
              value={embeddingModel}
              onChange={(e) => handleFieldChange("embeddingModel", e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[14px] text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus:ring-2 focus:ring-ring/20 focus:border-primary"
            >
              <option value="all-MiniLM-L6-v2">all-MiniLM-L6-v2 (Default, Fast)</option>
              <option value="all-mpnet-base-v2">all-mpnet-base-v2 (Better Quality)</option>
              <option value="sentence-transformers/all-MiniLM-L12-v2">all-MiniLM-L12-v2 (Balanced)</option>
            </select>
            <HelpText>
              Embeddings enable semantic search. The default model balances speed and quality. Switch to all-mpnet-base-v2 for better accuracy on complex queries.
            </HelpText>
          </div>
        </div>

        {/* System Prompt with Templates */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[15px] font-semibold text-foreground">System Prompt</h3>
              <HelpIcon
                content="Instructions prepended to every conversation to guide the AI's behavior. Use this to set tone, enforce answer style, and specify what to do when information isn't available in the knowledge base."
                side="right"
              />
            </div>
            <button
              onClick={() => setShowPromptTemplates(!showPromptTemplates)}
              className="text-[13px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              Templates
              <ChevronDown size={14} className={showPromptTemplates ? "rotate-180" : ""} />
            </button>
          </div>

          {showPromptTemplates && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-[14px] text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                />
                <button
                  onClick={handleSavePromptTemplate}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-[13px] font-medium hover:opacity-90"
                >
                  Save
                </button>
              </div>
              {promptTemplates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[12px] font-medium text-foreground">Saved Templates:</p>
                  {promptTemplates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between bg-background p-2 rounded border border-border">
                      <div className="flex-1">
                        <p className="text-[13px] font-medium text-foreground">{template.name}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{template.prompt}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleLoadPromptTemplate(template)}
                          className="px-2 py-1 text-[12px] text-primary hover:bg-primary/10 rounded"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDeletePromptTemplate(template.id)}
                          className="px-2 py-1 text-[12px] text-destructive hover:bg-destructive/10 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <label htmlFor="system-prompt" className="sr-only">System prompt</label>
          <textarea
            id="system-prompt"
            value={systemPrompt}
            onChange={(e) => handleFieldChange("systemPrompt", e.target.value)}
            rows={5}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus:ring-2 focus:ring-ring/20 focus:border-primary resize-none"
            aria-describedby="system-prompt-description"
          />
          <HelpText id="system-prompt-description">
            This prompt is prepended to every conversation to guide the model's behavior. Be specific about answer style, tone, and what to do when information isn't available.
          </HelpText>
        </div>

        {/* White-Labeling & Branding */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-6">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground mb-1">White-Labeling & Branding</h3>
            <p className="text-[12px] text-muted-foreground">Customize your brand identity across the application</p>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="text-[13px] font-medium text-foreground block mb-1.5">
              Company Logo
            </label>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Logo size={64} showText={false} />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 inline-flex items-center gap-2"
                  >
                    <Upload size={14} />
                    {logoUrl ? "Change Logo" : "Upload Logo"}
                  </label>
                  {logoUrl && (
                    <button
                      onClick={handleRemoveLogo}
                      className="px-3 py-2 text-muted-foreground hover:text-foreground border border-border rounded-lg text-[13px] font-medium hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 inline-flex items-center gap-2"
                    >
                      <X size={14} />
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground">
                  Upload a logo image (PNG, JPG, SVG). Max size: 2MB. Recommended: 128x128px or larger.
                </p>
              </div>
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label htmlFor="company-name" className="text-[13px] font-medium text-foreground block mb-1.5">
              Company Name
            </label>
            <input
              id="company-name"
              type="text"
              value={companyName}
              onChange={(e) => handleCompanyNameChange(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[14px] text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus:ring-2 focus:ring-ring/20 focus:border-primary"
              placeholder="AcmeDesk"
            />
            <p className="text-[12px] text-muted-foreground mt-1.5">
              This name will appear alongside your logo throughout the application.
            </p>
          </div>

          {/* Chat Widget Colors */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div>
              <label className="text-[13px] font-medium text-foreground block mb-3">
                Chat Widget Colors
              </label>
              <div className="space-y-3">
                {/* Primary Color */}
                <div>
                  <label htmlFor="chat-primary-color" className="text-[12px] text-muted-foreground block mb-1.5">
                    Primary Color (Header & User Messages)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="chat-primary-color"
                      type="color"
                      value={chatColors.primary || "#3b5fcf"}
                      onChange={(e) => handleChatColorChange("primary", e.target.value)}
                      className="w-16 h-10 rounded-lg border border-border cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                    />
                    <input
                      type="text"
                      value={chatColors.primary || ""}
                      onChange={(e) => {
                        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value) || e.target.value === "") {
                          handleChatColorChange("primary", e.target.value);
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-[14px] text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus:ring-2 focus:ring-ring/20 focus:border-primary font-mono"
                      placeholder="#3b5fcf"
                    />
                    {chatColors.primary && (
                      <button
                        onClick={() => handleChatColorChange("primary", "")}
                        className="px-2 py-1 text-[12px] text-muted-foreground hover:text-foreground"
                        aria-label="Reset primary color"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Secondary Color */}
                <div>
                  <label htmlFor="chat-secondary-color" className="text-[12px] text-muted-foreground block mb-1.5">
                    Secondary Color (Assistant Messages)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="chat-secondary-color"
                      type="color"
                      value={chatColors.secondary || "#e2e8f0"}
                      onChange={(e) => handleChatColorChange("secondary", e.target.value)}
                      className="w-16 h-10 rounded-lg border border-border cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                    />
                    <input
                      type="text"
                      value={chatColors.secondary || ""}
                      onChange={(e) => {
                        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value) || e.target.value === "") {
                          handleChatColorChange("secondary", e.target.value);
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-[14px] text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus:ring-2 focus:ring-ring/20 focus:border-primary font-mono"
                      placeholder="#e2e8f0"
                    />
                    {chatColors.secondary && (
                      <button
                        onClick={() => handleChatColorChange("secondary", "")}
                        className="px-2 py-1 text-[12px] text-muted-foreground hover:text-foreground"
                        aria-label="Reset secondary color"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Background Color */}
                <div>
                  <label htmlFor="chat-background-color" className="text-[12px] text-muted-foreground block mb-1.5">
                    Background Color (Chat Panel)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="chat-background-color"
                      type="color"
                      value={chatColors.background || "#ffffff"}
                      onChange={(e) => handleChatColorChange("background", e.target.value)}
                      className="w-16 h-10 rounded-lg border border-border cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                    />
                    <input
                      type="text"
                      value={chatColors.background || ""}
                      onChange={(e) => {
                        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value) || e.target.value === "") {
                          handleChatColorChange("background", e.target.value);
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-[14px] text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus:ring-2 focus:ring-ring/20 focus:border-primary font-mono"
                      placeholder="#ffffff"
                    />
                    {chatColors.background && (
                      <button
                        onClick={() => handleChatColorChange("background", "")}
                        className="px-2 py-1 text-[12px] text-muted-foreground hover:text-foreground"
                        aria-label="Reset background color"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleResetChatColors}
                  className="px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                >
                  Reset All Chat Colors
                </button>
              </div>
            </div>
          </div>

          {/* Chat Widget Greeting Message */}
          <div className="pt-4 border-t border-border">
            <label htmlFor="chat-greeting" className="text-[13px] font-medium text-foreground block mb-1.5">
              Chat Widget Greeting Message
            </label>
            <textarea
              id="chat-greeting"
              value={chatGreeting}
              onChange={(e) => handleChatGreetingChange(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus:ring-2 focus:ring-ring/20 focus:border-primary resize-none"
              placeholder="Hi there! 👋 I'm here to help..."
            />
            <p className="text-[12px] text-muted-foreground mt-1.5">
              This message will be shown when users first open the chat widget.
            </p>
          </div>

          {/* Custom Domain */}
          <div className="pt-4 border-t border-border">
            <label htmlFor="custom-domain" className="text-[13px] font-medium text-foreground block mb-1.5">
              Custom Domain (Optional)
            </label>
            <input
              id="custom-domain"
              type="text"
              value={customDomain}
              onChange={(e) => handleCustomDomainChange(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[14px] text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus:ring-2 focus:ring-ring/20 focus:border-primary"
              placeholder="support.yourcompany.com"
            />
            <p className="text-[12px] text-muted-foreground mt-1.5">
              Configure a custom domain for your chat widget (requires backend configuration).
            </p>
          </div>
        </div>

        {/* Branding & Appearance */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-5">
          <h3 className="text-[15px] font-semibold text-foreground">Branding & Appearance</h3>

          <div>
            <label htmlFor="brand-color-picker" className="text-[13px] font-medium text-foreground block mb-1.5">
              Primary Brand Color
            </label>
            <div className="flex items-center gap-3">
              <input
                id="brand-color-picker"
                type="color"
                value={brandColor}
                onChange={handleBrandColorChange}
                className="w-16 h-10 rounded-lg border border-border cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                aria-label="Primary brand color picker"
              />
              <input
                id="brand-color-hex"
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
                aria-label="Brand color hex value input"
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

        {/* Accessibility Settings */}
        <AccessibilitySettings />

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handleTestSettings}
            disabled={testing || Object.keys(fieldErrors).length > 0}
            className="px-4 py-2.5 bg-muted text-foreground rounded-lg text-[14px] font-medium hover:bg-muted/80 transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            aria-label="Test settings without saving"
          >
            {testing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <TestTube size={16} />
                Test Settings
              </>
            )}
          </button>
          <button 
            onClick={handleResetToDefaults}
            className="px-4 py-2.5 text-muted-foreground hover:text-foreground border border-border rounded-lg text-[14px] font-medium hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 flex items-center gap-2"
            aria-label="Reset all settings to defaults"
          >
            <RotateCcw size={16} />
            Reset to Defaults
          </button>
          <button 
            onClick={handleSaveChanges}
            disabled={saving || Object.keys(fieldErrors).length > 0}
            className="flex-1 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-[14px] font-medium hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            aria-label="Save all settings changes"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
