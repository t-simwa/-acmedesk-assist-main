import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check, AlertCircle, ExternalLink, Globe, Code, ShoppingCart, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/hooks/use-toast";
import { chatbotApi } from "@/lib/api";

interface ChatbotConfig {
  id: string;
  name: string;
  allowed_domains: string[];
  status: string;
}

const PLATFORMS = [
  {
    id: "html",
    name: "HTML",
    description: "Add to any website",
    icon: Code,
    steps: [
      "Copy the embed code below",
      "Paste it before the closing </body> tag",
      "The widget will appear on your site"
    ]
  },
  {
    id: "wordpress",
    name: "WordPress",
    description: "Using plugin or manual",
    icon: Globe,
    steps: [
      "Option 1: Install our WordPress plugin",
      "Option 2: Go to Appearance > Theme Editor",
      "Add the embed code to footer.php"
    ]
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "Online store builder",
    icon: ShoppingCart,
    steps: [
      "Go to Online Store > Themes",
      "Click Actions > Edit Code",
      "Add to theme.liquid before </body>"
    ]
  },
  {
    id: "webflow",
    name: "Webflow",
    description: "Visual web design",
    icon: Globe2,
    steps: [
      "Open Webflow Designer",
      "Go to Project Settings > Custom Code",
      "Add to Head Code section"
    ]
  },
  {
    id: "wix",
    name: "Wix",
    description: "Drag-and-drop builder",
    icon: Globe,
    steps: [
      "Go to Settings > Custom Code",
      "Click Add Custom Code",
      "Paste and set to load on all pages"
    ]
  },
  {
    id: "squarespace",
    name: "Squarespace",
    description: "Website builder",
    icon: Globe,
    steps: [
      "Go to Website > Website Tools",
      "Click Custom CSS",
      "Or use Code Injection in Settings"
    ]
  }
];

export default function Install() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [chatbot, setChatbot] = useState<ChatbotConfig | null>(null);
  const [activePlatform, setActivePlatform] = useState("html");
  const [newDomain, setNewDomain] = useState("");
  const [checkingInstall, setCheckingInstall] = useState(false);
  const [installCheckResult, setInstallCheckResult] = useState<string | null>(null);
  const [testUrl, setTestUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadChatbotConfig();
  }, []);

  const loadChatbotConfig = async () => {
    try {
      const response = await chatbotApi.getConfig();
      setChatbot(response);
    } catch (error) {
      console.error("Failed to load chatbot config:", error);
    }
  };

  const getEmbedCode = () => {
    if (!chatbot) return "";
    return `<script src="${window.location.origin}/widget.js" data-chatbot-id="${chatbot.id}" async></script>`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getEmbedCode());
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Embed code copied to clipboard"
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const addDomain = async () => {
    if (!newDomain.trim() || !chatbot) return;
    
    const domain = newDomain.trim().toLowerCase();
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    
    if (!domainRegex.test(domain) && domain !== "localhost") {
      toast({
        title: "Invalid domain",
        description: "Please enter a valid domain (e.g., example.com)",
        variant: "destructive"
      });
      return;
    }

    try {
      const updatedDomains = [...(chatbot.allowed_domains || []), domain];
      await chatbotApi.updateConfig({ allowed_domains: updatedDomains });
      setChatbot({ ...chatbot, allowed_domains: updatedDomains });
      setNewDomain("");
      toast({
        title: "Domain added",
        description: `${domain} has been added to allowed domains`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add domain",
        variant: "destructive"
      });
    }
  };

  const removeDomain = async (domain: string) => {
    if (!chatbot) return;
    
    try {
      const updatedDomains = chatbot.allowed_domains.filter(d => d !== domain);
      await chatbotApi.updateConfig({ allowed_domains: updatedDomains });
      setChatbot({ ...chatbot, allowed_domains: updatedDomains });
      toast({
        title: "Domain removed",
        description: `${domain} has been removed`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove domain",
        variant: "destructive"
      });
    }
  };

  const checkInstallation = async () => {
    if (!testUrl.trim()) return;
    
    setCheckingInstall(true);
    setInstallCheckResult(null);
    
    try {
      const response = await fetch(`/api/chat/check-install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: testUrl.trim(), chatbot_id: chatbot?.id })
      });
      
      const data = await response.json();
      setInstallCheckResult(data.detected 
        ? `✓ Widget detected on ${testUrl}` 
        : "✗ Widget not found on this page"
      );
    } catch (error) {
      setInstallCheckResult("✗ Failed to check installation");
    } finally {
      setCheckingInstall(false);
    }
  };

  const currentPlatform = PLATFORMS.find(p => p.id === activePlatform) || PLATFORMS[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Install Chat Widget
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Add the chat widget to your website
          </p>
        </div>
        <Badge variant={chatbot?.status === "live" ? "success" : "warning"}>
          {chatbot?.status === "live" ? "Live" : "Not Live"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Embed Code</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Copy this code and paste it on your website
            </p>
            
            <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <code className="text-green-400 break-all">{getEmbedCode()}</code>
            </div>
            
            <Button
              onClick={copyToClipboard}
              className="mt-4"
              variant={copied ? "secondary" : "primary"}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Code
                </>
              )}
            </Button>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Platform Instructions</h2>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {PLATFORMS.map(platform => (
                <button
                  key={platform.id}
                  onClick={() => setActivePlatform(platform.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activePlatform === platform.id
                      ? "bg-brand-primary text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {platform.name}
                </button>
              ))}
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <currentPlatform.icon className="w-5 h-5 text-brand-primary" />
                <div>
                  <h3 className="font-medium">{currentPlatform.name}</h3>
                  <p className="text-sm text-gray-500">{currentPlatform.description}</p>
                </div>
              </div>
              
              <ol className="space-y-2">
                {currentPlatform.steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm">
                    <span className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-medium shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-gray-600 dark:text-gray-300">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Check Installation</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Verify that the widget is properly installed on your website
            </p>
            
            <div className="flex gap-3">
              <Input
                placeholder="https://yourwebsite.com"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={checkInstallation}
                disabled={checkingInstall || !testUrl.trim()}
                variant="secondary"
              >
                {checkingInstall ? "Checking..." : "Check"}
              </Button>
            </div>
            
            {installCheckResult && (
              <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                installCheckResult.includes("✓") 
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700" 
                  : "bg-red-100 dark:bg-red-900/30 text-red-700"
              }`}>
                <AlertCircle className="w-4 h-4" />
                {installCheckResult}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Allowed Domains</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              The widget will only load on these domains
            </p>
            
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="example.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addDomain()}
              />
              <Button onClick={addDomain} variant="primary">
                Add
              </Button>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {chatbot?.allowed_domains?.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No domains added yet
                </p>
              )}
              {chatbot?.allowed_domains?.map((domain) => (
                <div
                  key={domain}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-mono">{domain}</span>
                  </div>
                  <button
                    onClick={() => removeDomain(domain)}
                    className="text-red-500 hover:text-red-600 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> The widget will show an error on domains not in this list.
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Tips</h2>
            <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                Place the code before closing body tag
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                Add all domains where you'll use the widget
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                Test on mobile devices before going live
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <a 
                  href="https://docs.example.com" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-primary hover:underline flex items-center gap-1"
                >
                  View Documentation <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
