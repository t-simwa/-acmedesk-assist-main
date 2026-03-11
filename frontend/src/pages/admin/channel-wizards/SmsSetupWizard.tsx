import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  AlertTriangle,
  Info,
  Phone,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Zap,
  Globe,
  MessageSquare,
} from "lucide-react";
import { channelsApi, channelSettingsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface SmsSetupWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

type WizardStep = 1 | 2 | 3 | 4;

interface SmsProvider {
  id: string;
  name: string;
  logo: string;
  description: string;
  countries: string[];
}

const SMS_PROVIDERS: SmsProvider[] = [
  {
    id: "africas_talking",
    name: "Africa's Talking",
    logo: "🇨🇩",
    description: "Best for African coverage. Affordable rates across 20+ African countries.",
    countries: ["Kenya", "Uganda", "Nigeria", "Ghana", "Tanzania", "South Africa", "+14 more"],
  },
  {
    id: "twilio",
    name: "Twilio",
    logo: "🌍",
    description: "Global coverage. Reliable, enterprise-grade SMS with great APIs.",
    countries: ["Global coverage in 180+ countries"],
  },
  {
    id: "vonage",
    name: "Vonage",
    logo: "🌐",
    description: "Strong in Europe and North America. Great for US/Canada numbers.",
    countries: ["USA", "Canada", "UK", "Germany", "France", "+20 more"],
  },
];

export default function SmsSetupWizard({ onComplete, onCancel }: SmsSetupWizardProps) {
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Provider Selection
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  
  // Step 2: Credentials
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [verifyingCredentials, setVerifyingCredentials] = useState(false);
  const [credentialsVerified, setCredentialsVerified] = useState(false);
  
  // Step 3: Configuration
  const [fromName, setFromName] = useState("");
  const [autoResponse, setAutoResponse] = useState(true);
  const [responseDelay, setResponseDelay] = useState(2);
  
  // Step 4: Test
  const [testPhone, setTestPhone] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  
  const handleVerifyCredentials = async () => {
    setVerifyingCredentials(true);
    try {
      const credentials: Record<string, string> = { provider: selectedProvider };
      if (selectedProvider === "twilio") {
        credentials.account_sid = apiKey;
        credentials.auth_token = apiSecret;
        credentials.twilio_phone_number = fromNumber;
      } else if (selectedProvider === "africas_talking") {
        credentials.at_username = apiKey;
        credentials.at_api_key = apiSecret;
        // store as sender id/shortcode
        credentials.at_sender_id = fromNumber;
      } else if (selectedProvider === "vonage") {
        credentials.vonage_api_key = apiKey;
        credentials.vonage_api_secret = apiSecret;
        credentials.vonage_phone_number = fromNumber;
      }

      const response = await channelsApi.verifySmsCredentials(selectedProvider, credentials);
      if (response.verified) {
        setCredentialsVerified(true);
        if (response.phone_number) {
          setFromNumber(response.phone_number);
        }
        // persist credentials to backend
        await channelSettingsApi.saveSmsCredentials(credentials);
        toast({
          title: "Credentials verified!",
          description: response.message,
        });
      } else {
        toast({
          title: "Verification failed",
          description: response.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Verification failed",
        description: "Could not verify credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifyingCredentials(false);
    }
  };
  
  const handleSendTest = async () => {
    setTestStatus("sending");
    try {
      await fetch(`/api/channels/sms/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: testPhone }),
      });
      setTestStatus("sent");
      toast({
        title: "Test SMS sent!",
        description: "Check your phone for the test message.",
      });
    } catch (error) {
      setTestStatus("failed");
      toast({
        title: "Test failed",
        description: "Could not send test SMS. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleFinish = async () => {
    try {
      setLoading(true);
      // Save behavior settings
      await channelSettingsApi.saveSmsBehavior({
        from_name: fromName,
        auto_response: autoResponse,
        response_delay: responseDelay,
      });
      await channelsApi.toggle("sms", true);
      toast({
        title: "SMS channel connected!",
        description: "Your SMS channel is now active.",
      });
      onComplete?.();
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "There was an error connecting the SMS channel.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!selectedProvider;
      case 2:
        return credentialsVerified;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };
  
  const steps = [
    { id: 1, label: "Choose Provider" },
    { id: 2, label: "Enter Credentials" },
    { id: 3, label: "Configure" },
    { id: 4, label: "Test" },
  ];
  
  const selectedProviderData = SMS_PROVIDERS.find((p) => p.id === selectedProvider);
  
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
                  Connect SMS Channel
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
        {/* Step 1: Provider Selection */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center mb-8">
              <div className="h-12 w-12 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto mb-4">
                <Phone className="h-6 w-6 text-pink-500" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Choose your SMS provider
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Select the SMS provider you'd like to use. Each offers different coverage and pricing.
              </p>
            </div>
            
            <div className="grid gap-4 max-w-2xl mx-auto">
              {SMS_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider.id)}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-xl border text-left transition-all",
                    selectedProvider === provider.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <span className="text-3xl">{provider.logo}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground">{provider.name}</p>
                      {selectedProvider === provider.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{provider.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {provider.countries.slice(0, 3).map((country) => (
                        <Badge key={country} variant="outline" className="text-[10px]">
                          {country}
                        </Badge>
                      ))}
                      {provider.countries.length > 3 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{provider.countries.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Step 2: Credentials */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center mb-8">
              <div className="h-12 w-12 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto mb-4">
                <Globe className="h-6 w-6 text-pink-500" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Enter your {selectedProviderData?.name} credentials
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                You'll find these in your {selectedProviderData?.name} dashboard.
              </p>
            </div>
            
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label className="text-sm">API Key / Username</Label>
                  <Input
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-sm">API Secret / Auth Token</Label>
                  <Input
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Enter your API secret"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-sm">From Number / Sender ID</Label>
                  <Input
                    value={fromNumber}
                    onChange={(e) => setFromNumber(e.target.value)}
                    placeholder="e.g., +254712345678 or NEXACHAT"
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    For Africa&apos;s Talking: your virtual number (e.g., +254712345678)
                  </p>
                </div>
                
                <Button
                  onClick={handleVerifyCredentials}
                  disabled={!apiKey || !apiSecret || !fromNumber || verifyingCredentials}
                  className="w-full"
                >
                  {verifyingCredentials ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying credentials...
                    </>
                  ) : credentialsVerified ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Verified
                    </>
                  ) : (
                    "Verify Credentials"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Step 3: Configuration */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center mb-8">
              <div className="h-12 w-12 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-6 w-6 text-pink-500" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Configure SMS behavior
              </h2>
            </div>
            
            <div className="max-w-xl mx-auto space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Sender Identity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label className="text-sm">From Name (for replies)</Label>
                    <Input
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="Your Business Name"
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Auto-response</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">AI auto-replies to incoming SMS</Label>
                      <p className="text-xs text-muted-foreground">When customers text you, AI responds automatically</p>
                    </div>
                    <Switch checked={autoResponse} onCheckedChange={setAutoResponse} />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Response delay</span>
                      <span className="font-mono">{responseDelay}s</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">0s</span>
                      <input
                        type="range"
                        min={0}
                        max={10}
                        value={responseDelay}
                        onChange={(e) => setResponseDelay(Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground">10s</span>
                    </div>
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
              <div className="h-12 w-12 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-pink-500" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Test your SMS connection
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Send a test SMS to verify everything is working.
              </p>
            </div>
            
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6">
                <Label className="text-sm">Your phone number</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="+254712345678"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendTest}
                    disabled={!testPhone || testStatus === "sending"}
                  >
                    {testStatus === "sending" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : testStatus === "sent" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      "Send Test"
                    )}
                  </Button>
                </div>
                
                {testStatus === "sent" && (
                  <div className="mt-4 p-3 bg-emerald-500/10 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm text-emerald-700">Test SMS sent successfully!</span>
                  </div>
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
