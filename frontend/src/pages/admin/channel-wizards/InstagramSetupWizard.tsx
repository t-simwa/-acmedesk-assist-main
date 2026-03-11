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
  Instagram,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Zap,
  MessageCircle,
  Image,
} from "lucide-react";
import { metaApi, channelsApi, channelSettingsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface InstagramSetupWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

type WizardStep = 1 | 2 | 3 | 4;

interface InstagramAccount {
  id: string;
  username: string;
  name: string;
  followers: number;
  verified: boolean;
}

export default function InstagramSetupWizard({ onComplete, onCancel }: InstagramSetupWizardProps) {
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [metaConnected, setMetaConnected] = useState(false);
  
  // Step 2: Select Account
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  
  // Step 3: Configuration
  const [greetingMessage, setGreetingMessage] = useState(
    "Hey! Thanks for reaching out. How can I help you today?"
  );
  const [replyToStories, setReplyToStories] = useState(true);
  const [handleMentions, setHandleMentions] = useState(true);
  const [analyzeImages, setAnalyzeImages] = useState(true);
  const [autoResponseDelay, setAutoResponseDelay] = useState(3);
  
  // Step 4: Test
  const [testStatus, setTestStatus] = useState<"idle" | "waiting" | "sent" | "failed">("idle");
  const [testStartTime, setTestStartTime] = useState<Date | null>(null);
  
  useEffect(() => {
    if (currentStep === 2 && metaConnected) {
      loadInstagramAccounts();
    }
  }, [currentStep, metaConnected]);

  // poll for test messages when on step 4
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (currentStep === 4) {
      setTestStatus("idle");
      setTestStartTime(new Date());
      timer = setInterval(async () => {
        try {
          const json = await channelsApi.getInstagramTestStatus();
          if (json.received) {
            setTestStatus("sent");
            clearInterval(timer);
          }
        } catch {}
      }, 5000);
    }
    return () => clearInterval(timer);
  }, [currentStep]);
  
  const loadInstagramAccounts = async () => {
    try {
      setLoading(true);
      const response = await metaApi.listInstagramAccounts();
      const accounts = response.instagram_accounts || [];
      // Normalize to our interface
      setInstagramAccounts(accounts.map((a: any) => ({
        id: a.id,
        username: a.username,
        name: a.name,
        followers: a.followers || 0,
        verified: true,
      })));
    } catch (error) {
      toast({
        title: "Failed to load Instagram accounts",
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
    setTestStatus("waiting");
    setTestStartTime(new Date());
    toast({
      title: "Test message sent!",
      description: "Your Instagram channel is configured.",
    });
  };
  
  const handleFinish = async () => {
    try {
      setLoading(true);
      // persist relationship via configure API
      if (selectedAccount) {
        await fetch(`/api/channels/instagram/configure`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account_id: selectedAccount }),
        });
      }
      // save some behavioral settings
      await channelSettingsApi.saveInstagramBehavior({
        response_delay: autoResponseDelay,
        show_typing_indicator: true,
      });
      await channelsApi.toggle("instagram", true);
      toast({
        title: "Instagram connected!",
        description: "Your Instagram channel is now active.",
      });
      onComplete?.();
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "There was an error connecting Instagram.",
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
        return !!selectedAccount;
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
    { id: 2, label: "Select Account" },
    { id: 3, label: "Configure" },
    { id: 4, label: "Test" },
  ];
  
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
                  Connect Instagram DMs
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
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center mx-auto mb-4">
                <Instagram className="h-6 w-6 text-white" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Connect your Instagram Business account
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Connect via Meta to allow your AI to manage DMs on Instagram.
              </p>
            </div>
            
            {metaConnected ? (
              <Card className="max-w-md mx-auto border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="pt-6 flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  <div>
                    <p className="font-medium text-emerald-700">Meta account connected!</p>
                    <p className="text-xs text-muted-foreground">Continue to select your Instagram account.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="max-w-md mx-auto">
                <Button
                  onClick={handleConnectMeta}
                  disabled={connecting}
                  className="w-full h-12"
                  style={{ background: "linear-gradient(45deg, #405DE6, #5851DB, #833AB4, #C13584, #E1306C, #FD1D1D)" }}
                >
                  {connecting ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Instagram className="h-5 w-5 mr-2" />
                  )}
                  Connect with Instagram
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Step 2: Select Account */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center mb-8">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Select your Instagram account
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Which Instagram Business account should your AI manage?
              </p>
            </div>
            
            <div className="max-w-md mx-auto space-y-3">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                instagramAccounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => setSelectedAccount(account.id)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                      selectedAccount === account.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
                      <Instagram className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">@{account.username}</p>
                        {account.verified && (
                          <Badge variant="success" className="text-[10px]">Verified</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{account.name}</p>
                      <p className="text-xs text-muted-foreground">{account.followers.toLocaleString()} followers</p>
                    </div>
                    {selectedAccount === account.id && (
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
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center mx-auto mb-4">
                <Image className="h-6 w-6 text-white" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Configure Instagram AI behavior
              </h2>
            </div>
            
            <div className="max-w-xl mx-auto space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Greeting Message</CardTitle>
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
                  <CardTitle className="text-sm font-medium">DM Triggers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Reply to Story mentions</Label>
                      <p className="text-xs text-muted-foreground">Auto-reply when someone mentions you in a Story</p>
                    </div>
                    <Switch checked={replyToStories} onCheckedChange={setReplyToStories} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Handle @mentions</Label>
                      <p className="text-xs text-muted-foreground">Respond to posts that tag your account</p>
                    </div>
                    <Switch checked={handleMentions} onCheckedChange={setHandleMentions} />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Image & Media</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Analyze images in DMs</Label>
                      <p className="text-xs text-muted-foreground">AI can see and describe images customers send</p>
                    </div>
                    <Switch checked={analyzeImages} onCheckedChange={setAnalyzeImages} />
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
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Test your Instagram connection
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Send a test DM to your Instagram to verify everything works.
              </p>
            </div>
            
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6 text-center">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-white" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Send a direct message to your connected Instagram account.
                  We'll detect it and show it here.
                </p>
                
                {testStatus === "sent" ? (
                  <div className="p-3 bg-emerald-500/10 rounded-lg flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm text-emerald-700">Test successful!</span>
                  </div>
                ) : testStatus === "waiting" ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-primary">Waiting for your test DM...</span>
                  </div>
                ) : (
                  <Button onClick={handleSendTest} disabled={testStatus === "waiting"}>
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
