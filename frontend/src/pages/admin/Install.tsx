import { useState, useEffect } from "react";
import { Copy, Check, AlertCircle, ExternalLink, Globe, Code, ShoppingCart, Globe2, Upload, Loader2, CheckCircle2, XCircle, HelpCircle, Link2, Play, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ChatbotConfig {
  id: string;
  name: string;
  allowed_domains: string[];
  status: string;
}

const PLATFORMS = [
  {
    id: "html",
    label: "HTML",
    shortLabel: "HTML",
    icon: Code,
  },
  {
    id: "wordpress",
    label: "WordPress",
    shortLabel: "WordPress",
    icon: Globe,
  },
  {
    id: "shopify",
    label: "Shopify",
    shortLabel: "Shopify",
    icon: ShoppingCart,
  },
  {
    id: "webflow",
    label: "Webflow",
    shortLabel: "Webflow",
    icon: Globe2,
  },
  {
    id: "wix",
    label: "Wix",
    shortLabel: "Wix",
    icon: Globe,
  },
  {
    id: "squarespace",
    label: "Squarespace",
    shortLabel: "Square",
    icon: Globe,
  },
] as const;

type PlatformId = typeof PLATFORMS[number]["id"];

const PLATFORM_GUIDES: Record<PlatformId, { steps: string[]; code?: string }> = {
  html: {
    steps: [
      "Open your HTML file",
      "Find the </head> closing tag",
      "Paste the code just before it",
      "Save and publish",
    ],
    code: `<script src="https://cdn.acmedesk.com/widget.js" async></script>`,
  },
  wordpress: {
    steps: [
      "Download plugin ZIP from AcmeDesk",
      "Upload via Plugins → Add New → Upload Plugin",
      "Activate the plugin",
      "The plugin auto-inserts the code",
    ],
  },
  shopify: {
    steps: [
      "Go to Online Store → Themes",
      "Click Actions → Edit Code",
      "Select Layout → theme.liquid",
      "Paste before </head> tag",
      "Save changes",
    ],
  },
  webflow: {
    steps: [
      "Open your Webflow Designer",
      "Go to Project Settings → Custom Code",
      "Paste in the Head Code section",
      "Save and Publish",
    ],
  },
  wix: {
    steps: [
      "Go to Settings → Custom Code",
      "Click Add Custom Code",
      "Paste your code",
      "Choose: All pages",
      "Click Apply",
    ],
  },
  squarespace: {
    steps: [
      "Go to Website → Website Tools",
      "Click Custom CSS",
      "Or use Code Injection in Settings",
      "Paste and save",
    ],
  },
};

const STEPS = [
  { id: 1, label: "Copy Code", icon: Copy },
  { id: 2, label: "Paste on Website", icon: ExternalLink },
  { id: 3, label: "Verify", icon: CheckCircle2 },
] as const;

export default function Install() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [chatbot, setChatbot] = useState<ChatbotConfig | null>(null);
  const [activePlatform, setActivePlatform] = useState<PlatformId>("html");
  const [newDomain, setNewDomain] = useState("");
  const [checkingInstall, setCheckingInstall] = useState(false);
  const [installStatus, setInstallStatus] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [testUrl, setTestUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);

  useEffect(() => {
    const loadChatbotConfig = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/chatbot/config").then(res => res.json());
        setChatbot(response);
      } catch (error) {
        console.error("Failed to load chatbot config:", error);
      } finally {
        setLoading(false);
      }
    };
    loadChatbotConfig();
  }, []);

  const getEmbedCode = () => {
    const domain = typeof window !== "undefined" ? window.location.origin : "https://cdn.acmedesk.com";
    return `<script src="${domain}/widget.js" data-chatbot-id="${chatbot?.id || 'YOUR_CHATBOT_ID'}" async></script>`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getEmbedCode());
      setCopied(true);
      toast({ title: "Copied!", variant: "success" });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleAddDomain = () => {
    if (!newDomain.trim()) return;
    
    const domain = newDomain.trim().toLowerCase();
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    
    if (!domainRegex.test(domain) && domain !== "localhost") {
      setDomainError("Please enter a valid domain (e.g., example.com)");
      return;
    }
    setDomainError(null);
    
    if (chatbot?.allowed_domains?.includes(domain)) {
      setDomainError("Domain already added");
      return;
    }
    
    const updatedDomains = [...(chatbot?.allowed_domains || []), domain];
    setChatbot({ ...chatbot!, allowed_domains: updatedDomains });
    setNewDomain("");
    toast({ title: "Domain added", variant: "success" });
  };

  const handleRemoveDomain = (domain: string) => {
    if (!chatbot) return;
    const updatedDomains = chatbot.allowed_domains.filter(d => d !== domain);
    setChatbot({ ...chatbot, allowed_domains: updatedDomains });
    toast({ title: "Domain removed" });
  };

  const checkInstallation = async () => {
    if (!testUrl.trim()) return;
    
    setCheckingInstall(true);
    setInstallStatus("checking");
    
    setTimeout(() => {
      setCheckingInstall(false);
      setInstallStatus(testUrl.includes(chatbot?.allowed_domains?.[0] || "") ? "success" : "error");
    }, 2000);
  };

  const getCurrentStep = () => {
    if (installStatus === "success") return 3;
    if (copied) return 2;
    return 1;
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Install on Your Website
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Add the chat widget to your website in minutes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold font-heading",
            chatbot?.status === "live" 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
          )}>
            {chatbot?.status === "live" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
            {chatbot?.status === "live" ? "Live" : "Not Live"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold font-heading transition-all",
              getCurrentStep() >= step.id
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}>
              {getCurrentStep() >= step.id ? <Check className="h-3.5 w-3.5" /> : <step.icon className="h-3.5 w-3.5" />}
              {step.label}
            </div>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-primary" />
            <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">
              Your Embed Code
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-description">
            Copy and paste this code on your website
          </p>
        </div>

        <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-4">
          <div className="relative rounded-lg bg-muted p-4 overflow-x-auto">
            <pre className="text-sm font-mono text-foreground">
              <code className="break-all">{getEmbedCode()}</code>
            </pre>
          </div>
          
          <Button
            onClick={copyToClipboard}
            className={cn(
              "w-full h-10 text-xs gap-1.5",
              copied && "bg-emerald-500 hover:bg-emerald-600"
            )}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy Code
              </>
            )}
          </Button>
        </div>
      </section>

      <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">
              Domain Whitelist
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-description">
            Add domains where the widget is allowed to appear
          </p>
        </div>

        <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {chatbot?.allowed_domains?.map((domain, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-1 text-xs">
                {domain}
                <button onClick={() => handleRemoveDomain(domain)} className="hover:text-destructive">
                  <XCircle className="h-3 w-3" />
                </button>
              </span>
            ))}
            {(!chatbot?.allowed_domains || chatbot.allowed_domains.length === 0) && (
              <p className="text-xs text-muted-foreground">No domains added yet</p>
            )}
          </div>
          <div className="flex gap-2">
            <Input 
              value={newDomain} 
              onChange={(e) => setNewDomain(e.target.value)} 
              placeholder="example.com"
              className="h-9 text-xs flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
            />
            <Button onClick={handleAddDomain} className="h-9 text-xs gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
          {domainError && (
            <p className="text-xs text-destructive">{domainError}</p>
          )}
        </div>
      </section>

      <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">
              Platform Guides
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-description">
            Step-by-step instructions for each platform
          </p>
        </div>

        <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-4">
          <div className="grid grid-cols-3 gap-1.5 sm:hidden">
            {PLATFORMS.map((platform) => {
              const isActive = activePlatform === platform.id;
              return (
                <button
                  key={platform.id}
                  onClick={() => setActivePlatform(platform.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-2 py-2 rounded-lg border text-[10px] font-semibold font-heading transition-all",
                    isActive
                      ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                      : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80 hover:bg-accent/50",
                  )}
                >
                  <platform.icon className="h-3.5 w-3.5" />
                  {platform.shortLabel}
                </button>
              );
            })}
          </div>

          <div className="hidden sm:grid lg:hidden grid-cols-3 gap-1.5">
            {PLATFORMS.map((platform) => {
              const isActive = activePlatform === platform.id;
              return (
                <button
                  key={platform.id}
                  onClick={() => setActivePlatform(platform.id)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold font-heading transition-all",
                    isActive
                      ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                      : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80 hover:bg-accent/50",
                  )}
                >
                  <platform.icon className="h-3.5 w-3.5" />
                  {platform.label}
                </button>
              );
            })}
          </div>

          <div className="hidden lg:inline-flex rounded-lg border bg-card overflow-hidden w-fit">
            {PLATFORMS.map((platform, i) => {
              const isActive = activePlatform === platform.id;
              return (
                <div key={platform.id} className="flex items-stretch">
                  {i > 0 && <div className="w-px self-stretch bg-border" />}
                  <button
                    onClick={() => setActivePlatform(platform.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 text-xs font-semibold font-heading transition-all whitespace-nowrap",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                    )}
                  >
                    <platform.icon className="h-3.5 w-3.5" />
                    {platform.label}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <h3 className="text-sm font-semibold font-heading text-foreground">
              How to install on {PLATFORMS.find(p => p.id === activePlatform)?.label}
            </h3>
            <ol className="space-y-2">
              {PLATFORM_GUIDES[activePlatform].steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
            {PLATFORM_GUIDES[activePlatform].code && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Code to paste:</p>
                <pre className="text-xs font-mono overflow-x-auto">
                  {PLATFORM_GUIDES[activePlatform].code}
                </pre>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">
              Verification
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-description">
            Installed? Let us check for you
          </p>
        </div>

        <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-4">
          <div className="flex gap-2">
            <Input
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="https://yourdomain.com"
              className="h-9 text-xs flex-1"
              onKeyDown={(e) => e.key === "Enter" && checkInstallation()}
            />
            <Button 
              onClick={checkInstallation} 
              disabled={checkingInstall || !testUrl.trim()}
              className="h-9 text-xs gap-1.5"
            >
              {checkingInstall ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Check Installation
            </Button>
          </div>

          {installStatus === "success" && (
            <div className="flex items-start gap-2 rounded-lg border bg-emerald-500/10 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-500">Widget detected!</p>
                <p className="text-xs text-muted-foreground mt-0.5">Your chatbot is now live!</p>
              </div>
            </div>
          )}

          {installStatus === "error" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border bg-rose-500/10 px-4 py-3">
                <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-rose-500">Widget not found</p>
              </div>
              
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs font-semibold text-foreground mb-2">Troubleshooting checklist:</p>
                <ul className="space-y-1.5">
                  {[
                    "Did you save/publish after pasting?",
                    "Is the domain in your whitelist above?",
                    "Try hard refresh (Ctrl+Shift+R)",
                    "Check if script appears in page source",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-3.5 h-3.5 rounded border border-border" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button variant="link" size="sm" className="h-7 text-xs mt-2 p-0 text-primary">
                  <HelpCircle className="h-3 w-3 mr-1" />
                  Still stuck? Contact support
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-primary" />
            <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">
              Common Issues
            </h2>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-5 sm:py-6">
          <Accordion type="single" collapsible className="space-y-3">
            {[
              { title: "Chatbot not appearing", solution: "Check that the embed code is before </body> tag and the domain is added to your whitelist above. Try a hard refresh (Ctrl+Shift+R)." },
              { title: "Chatbot appearing on wrong pages", solution: "The widget appears on all pages where the code is installed. Remove the code from pages where you don't want it." },
              { title: "Styling conflicts with my website", solution: "Use CSS specificity or wrap the widget in an isolated container with its own styles. You can also adjust widget colors in the Chatbot settings." },
              { title: "Widget loading slowly", solution: "The script loads asynchronously and won't slow down your site. If you notice delays, check your website's overall performance." },
              { title: "Widget not working on mobile", solution: "Ensure your website is mobile-responsive. Test on an actual device rather than browser dev tools. Some ad blockers may interfere." },
            ].map((issue, i) => (
              <AccordionItem
                key={i}
                value={`issue-${i}`}
                className="rounded-xl border border-border/50 bg-muted/10 overflow-hidden px-4"
              >
                <AccordionTrigger className="text-left py-3 font-medium text-xs hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  {issue.title}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground pb-3 pt-0">
                  {issue.solution}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  );
}
