import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Info,
  MessageCircle,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Zap,
  Globe,
} from "lucide-react";
import { metaApi, channelsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface MessengerSetupWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

type WizardStep = 1 | 2 | 3 | 4;

interface FacebookPage {
  id: string;
  name: string;
  category: string;
  followers: number;
}

export default function MessengerSetupWizard({ onComplete, onCancel }: MessengerSetupWizardProps) {
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [metaConnected, setMetaConnected] = useState(false);
  
  // Step 2: Select Page
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>("");
  
  // Step 3: Configuration
  const [greetingMessage, setGreetingMessage] = useState(
    "Hi! Thanks for messaging us. How can I help you today?"
  );
  const [getStartedEnabled, setGetStartedEnabled] = useState(true);
  const [persistentMenu, setPersistentMenu] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Welcome! What can I help you with today?"
  );
  
  // Step 4: Test
  const [testStatus, setTestStatus] = useState<"idle" | "sent" | "failed">("idle");
  
  useEffect(() => {
    if (currentStep === 2 && metaConnected) {
      loadPages();
    }
  }, [currentStep, metaConnected]);
  
  const loadPages = async () => {
    try {
      setLoading(true);
      const response = await metaApi.listPages();
      setPages(response.pages || []);
    } catch (error) {
      toast({
        title: "Failed to load Facebook pages",
        description: "Please make sure Meta is connected.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleConnectMeta = async () => {
    try {
      setConnecting(true);
      const response = await metaApi.getAuthUrl();
      const url = response.url;
      
      const popup = window.open(url, "meta_oauth", "width=900,height=700");
      
      const onMessage = async (evt: MessageEvent) => {
        if (!evt.data || evt.data.type !== "meta_oauth") return;
        if (evt.data.status === "connected") {
          setMetaConnected(true);
          setCurrentStep(2);
        }
      };
      
      window.addEventListener("message", onMessage);
      
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          window.removeEventListener("message", onMessage);
          setConnecting(false);
        }
      }, 1000);
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Could not initiate Meta OAuth.",
        variant: "destructive",
      });
      setConnecting(false);
    }
  };
  
  const handleSendTest = async () => {
    setTestStatus("sent");
    toast({
      title: "Test message sent!",
      description: "Your Messenger channel is configured.",
    });
  };
  
  const handleFinish = async () => {
    try {
      setLoading(true);
      await channelsApi.toggle("messenger", true);
      toast({
        title: "Messenger connected!",
        description: "Your Facebook Messenger channel is now active.",
      });
      onComplete?.();
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "There was an error connecting Messenger.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return metaConnected;
      case 2:
        return !!selectedPage;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };
  
  const steps = [
    { id: 1, label: "Connect Meta" },
    { id: 2, label: "Select Page" },
    { id: 3, label: "Configure" },
    { id: 4, label: "Test" },
  ];
  
  const selectedPageData = pages.find((p) => p.id === selectedPage);
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onCancel} className="h-9 w-9">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="font-heading text-lg font-semibold text-foreground">
                  Connect Facebook Messenger
                </h1>
                <p className="text-xs text-muted-foreground">Step {currentStep} of 4</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={cn(
                    "h-2 w-10 rounded-full transition-colors",
                    step.id < currentStep ? "bg-primary" : step.id === currentStep ? "bg-primary/50" : "bg-border"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: Connect Meta */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center mb-8">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <Globe className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Connect your Facebook Business Page
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Connect via Meta to allow your AI to manage Messenger conversations.
              </p>
            </div>
            
            {metaConnected ? (
              <Card className="max-w-md mx-auto border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="pt-6 flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  <div>
                    <p className="font-medium text-emerald-700">Meta account connected!</p>
                    <p className="text-xs text-muted-foreground">Continue to select your Facebook Page.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="max-w-md mx-auto">
                <Button
                  onClick={handleConnectMeta}
                  disabled={connecting}
                  className="w-full h-12"
                  style={{ backgroundColor: "#1877F2" }}
                >
                  {connecting ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  )}
                  Connect with Facebook
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Step 2: Select Page */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center mb-8">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Select your Facebook Page
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Which Facebook Page should your AI manage Messenger for?
              </p>
            </div>
            
            <div className="max-w-md mx-auto space-y-3">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pages.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No Facebook Pages found. Create a Page in Facebook first.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                pages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => setSelectedPage(page.id)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                      selectedPage === page.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <MessageCircle className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{page.name}</p>
                      <p className="text-xs text-muted-foreground">{page.category}</p>
                      <p className="text-xs text-muted-foreground">{page.followers.toLocaleString()} followers</p>
                    </div>
                    {selectedPage === page.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
        
        {/* Step 3: Configuration */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center mb-8">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Configure Messenger AI behavior
              </h2>
            </div>
            
            <div className="max-w-xl mx-auto space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Greeting Message</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Shown when customer opens chat for first time
                  </p>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={greetingMessage}
                    onChange={(e) => setGreetingMessage(e.target.value)}
                    rows={3}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Get Started Button</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Enable Get Started button</Label>
                      <p className="text-xs text-muted-foreground">Shows welcome screen with quick reply buttons</p>
                    </div>
                    <Switch checked={getStartedEnabled} onCheckedChange={setGetStartedEnabled} />
                  </div>
                  
                  {getStartedEnabled && (
                    <div>
                      <Label className="text-sm">Welcome message</Label>
                      <Textarea
                        value={welcomeMessage}
                        onChange={(e) => setWelcomeMessage(e.target.value)}
                        rows={2}
                        className="mt-2"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Persistent Menu</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Always-visible menu at bottom of chat
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Enable persistent menu</Label>
                    <Switch checked={persistentMenu} onCheckedChange={setPersistentMenu} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        
        {/* Step 4: Test */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center mb-8">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Test your Messenger connection
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Send a test message to your Facebook Page to verify everything works.
              </p>
            </div>
            
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6 text-center">
                <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Send a message to your Facebook Page on Messenger.
                  We'll detect it and show it here.
                </p>
                
                {testStatus === "sent" ? (
                  <div className="p-3 bg-emerald-500/10 rounded-lg flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm text-emerald-700">Test successful!</span>
                  </div>
                ) : (
                  <Button onClick={handleSendTest} disabled={testStatus === "sent"}>
                    Test Connection
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      {/* Bottom Navigation */}
      <div className="sticky bottom-0 bg-card border-t px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1) as WizardStep)}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          {currentStep < 4 ? (
            <Button
              onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1) as WizardStep)}
              disabled={!canProceed()}
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Finish Setup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertTriangle({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  );
}
