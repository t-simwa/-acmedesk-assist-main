import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Info,
  Loader2,
  AlertTriangle,
  X,
  Plus,
  Trash2,
  Smartphone,
  Mail,
  MessageCircle,
  Globe,
  Users,
  Building2,
  Clock,
  Zap,
  Phone,
  Shield,
} from "lucide-react";
import { metaApi, channelsApi, channelSettingsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ChannelIcon, CHANNEL_META } from "@/lib/channelMeta";

interface WhatsAppSetupWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

interface RequirementsState {
  hasBusinessAccount: boolean;
  hasWhatsAppNumber: boolean;
  hasBusinessVerified: boolean;
  hasDisplayName: boolean;
}

interface WhatsAppAccount {
  id: string;
  display_name: string;
  phone_numbers: Array<{
    id: string;
    display_phone_number: string;
    verified: boolean;
  }>;
}

interface MessageTemplate {
  name: string;
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  content: string;
  variables: string[];
  status: "not_submitted" | "pending" | "approved" | "rejected";
}

export default function WhatsAppSetupWizard({ onComplete, onCancel }: WhatsAppSetupWizardProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  
  // Step 1: Requirements
  const [requirements, setRequirements] = useState<RequirementsState>({
    hasBusinessAccount: false,
    hasWhatsAppNumber: false,
    hasBusinessVerified: false,
    hasDisplayName: false,
  });
  
  // Step 2: Meta connection state
  const [metaConnected, setMetaConnected] = useState(false);
  
  // Step 3: Phone number selection
  const [whatsappAccounts, setWhatsappAccounts] = useState<WhatsAppAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedPhone, setSelectedPhone] = useState<string>("");
  
  // Step 4: Templates
  const [templates, setTemplates] = useState<MessageTemplate[]>([
    {
      name: "out_of_hours_response",
      category: "UTILITY",
      content: "Hi {{1}}! Thanks for reaching out to {{2}}. We're currently outside business hours but we'll get back to you first thing {{3}}.",
      variables: ["Customer name", "Business name", "Next business day/time"],
      status: "not_submitted",
    },
    {
      name: "conversation_reopener",
      category: "UTILITY",
      content: "Hi {{1}}, this is {{2}}. Following up on your recent enquiry — is there anything else I can help you with?",
      variables: ["Customer name", "Business name"],
      status: "not_submitted",
    },
    {
      name: "booking_confirmation",
      category: "UTILITY",
      content: "Hi {{1}}! Your booking with {{2}} is confirmed. Date: {{3}} | Time: {{4}} | Service: {{5}}. Reply HELP if you need to change anything.",
      variables: ["Customer name", "Business name", "Date", "Time", "Service"],
      status: "not_submitted",
    },
    {
      name: "lead_followup",
      category: "MARKETING",
      content: "Hi {{1}}, we noticed you reached out to {{2}}. We'd love to help — what's the best way to assist you today?",
      variables: ["Customer name", "Business name"],
      status: "not_submitted",
    },
  ]);
  const [submittingTemplates, setSubmittingTemplates] = useState(false);
  const [skippedTemplates, setSkippedTemplates] = useState(false);
  
  // Step 5: Test connection
  const [testStatus, setTestStatus] = useState<"waiting" | "received" | "failed">("waiting");
  const [testPhone, setTestPhone] = useState<string>("");
  const [testStartTime, setTestStartTime] = useState<Date | null>(null);
  
  // Step 6: Configuration
  const [greetingMessage, setGreetingMessage] = useState(
    "Hi! Thanks for reaching out to [Business Name]. I'm here to help — what can I assist you with today?"
  );
  const [useGlobalBusinessHours, setUseGlobalBusinessHours] = useState(true);
  const [offlineBehavior, setOfflineBehavior] = useState<"keep_active_24_7" | "send_offline_template">("keep_active_24_7");
  const [responseDelay, setResponseDelay] = useState(2);
  const [showTypingIndicator, setShowTypingIndicator] = useState(true);
  const [unknownIntentMessage, setUnknownIntentMessage] = useState(
    "That's a great question — let me connect you with a team member who can help better. What's the best way to reach you?"
  );
  const [transcribeVoice, setTranscribeVoice] = useState(true);
  const [analyzeImages, setAnalyzeImages] = useState(true);
  
  // Load WhatsApp accounts
  useEffect(() => {
    if (currentStep === 3 && metaConnected) {
      loadWhatsAppAccounts();
    }
  }, [currentStep, metaConnected]);

  // when we enter step 5, start polling and set phone number
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (currentStep === 5) {
      setTestStatus("waiting");
      setTestStartTime(new Date());
      if (selectedPhone?.display) {
        setTestPhone(selectedPhone.display);
      }
      // poll backend every 5 seconds
      timer = setInterval(async () => {
        try {
          const json = await channelsApi.getWhatsAppTestStatus();
          if (json.received) {
            setTestStatus("received");
            clearInterval(timer);
          }
        } catch {}
      }, 5000);
    }
    return () => clearInterval(timer);
  }, [currentStep, selectedPhone]);
  
  const loadWhatsAppAccounts = async () => {
    try {
      setLoading(true);
      const response = await metaApi.listWhatsappAccounts();
      setWhatsappAccounts(response.whatsapp_business_accounts || []);
    } catch (error) {
      toast({
        title: "Failed to load WhatsApp accounts",
        description: "Please make sure your Meta Business Account is properly connected.",
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
          setCurrentStep(3);
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
        description: "Could not initiate Meta OAuth. Please try again.",
        variant: "destructive",
      });
      setConnecting(false);
    }
  };
  
  const handleSubmitTemplates = async () => {
    setSubmittingTemplates(true);
    try {
      // Map local template shape to backend WhatsAppTemplateCreate
      const payloads = templates.map((t) => ({
        name: t.name,
        category: t.category,
        language: "en",
        body_text: t.content,
        header_text: undefined,
        footer_text: undefined,
        buttons: undefined,
      }));

      const response = await whatsappTemplatesApi.submitBatch(payloads);

      // Update local statuses from API results
      const results: any[] = response.results || [];
      const failures: any[] = response.failures || [];

      setTemplates((prev) =>
        prev.map((t) => {
          const r = results.find((res) => res.name === t.name);
          if (r) {
            const s = (r.status || "PENDING").toLowerCase();
            return { ...t, status: s === "pending" ? "pending" : s };
          }
          // mark failed submissions as not_submitted
          const f = failures.find((f) => f.name === t.name);
          if (f) return { ...t, status: "not_submitted" };
          return t;
        })
      );

      toast({
        title: failures.length ? "Some templates failed" : "Templates submitted",
        description: failures.length
          ? `${results.length} submitted, ${failures.length} failed.`
          : "Your templates have been submitted for Meta review.",
        variant: failures.length ? "destructive" : undefined,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Submission failed",
        description: "Could not submit templates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingTemplates(false);
    }
  };
  
  const handleFinish = async () => {
    try {
      setLoading(true);
      // save behavior settings before enabling
      await channelSettingsApi.saveWhatsappBehavior({
        greeting_message: greetingMessage,
        use_global_business_hours: useGlobalBusinessHours,
        offline_behavior: offlineBehavior,
        response_delay: responseDelay,
        show_typing_indicator: showTypingIndicator,
        unknown_intent_message: unknownIntentMessage,
        transcribe_voice: transcribeVoice,
        analyze_images: analyzeImages,
      });
      await channelsApi.toggle("whatsapp", true);
      toast({
        title: "WhatsApp connected!",
        description: "Your WhatsApp Business channel is now active.",
      });
      onComplete?.();
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "There was an error connecting WhatsApp. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return (
          requirements.hasBusinessAccount &&
          requirements.hasWhatsAppNumber &&
          requirements.hasBusinessVerified &&
          requirements.hasDisplayName
        );
      case 2:
        return metaConnected;
      case 3:
        return selectedAccount && selectedPhone;
      case 4:
        return true; // Can skip
      case 5:
        return true; // Can skip test
      case 6:
        return true;
      default:
        return false;
    }
  };
  
  const steps = [
    { id: 1, label: "Requirements" },
    { id: 2, label: "Connect Meta" },
    { id: 3, label: "Select Number" },
    { id: 4, label: "Templates" },
    { id: 5, label: "Test" },
    { id: 6, label: "Configure" },
  ];
  
  const selectedAccountData = whatsappAccounts.find((a) => a.id === selectedAccount);
  const selectedPhoneData = selectedAccountData?.phone_numbers.find(
    (p) => p.id === selectedPhone
  );
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
                className="h-9 w-9"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="font-heading text-lg font-semibold text-foreground">
                  Connect WhatsApp Business
                </h1>
                <p className="text-xs text-muted-foreground">
                  Step {currentStep} of 6
                </p>
              </div>
            </div>
            
            {/* Progress indicators */}
            <div className="hidden sm:flex items-center gap-1">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    "h-2 w-8 rounded-full transition-colors",
                    step.id < currentStep
                      ? "bg-primary"
                      : step.id === currentStep
                      ? "bg-primary/50"
                      : "bg-border"
                  )}
                />
              ))}
            </div>
          </div>
          
          {/* Step indicator row */}
          <div className="hidden lg:flex items-center gap-4 mt-4 text-xs">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => step.id < currentStep && setCurrentStep(step.id as WizardStep)}
                className={cn(
                  "flex items-center gap-1.5 transition-colors",
                  step.id === currentStep
                    ? "text-primary font-medium"
                    : step.id < currentStep
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-muted-foreground/50"
                )}
              >
                <span
                  className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium",
                    step.id < currentStep
                      ? "bg-primary text-primary-foreground"
                      : step.id === currentStep
                      ? "bg-primary/20 text-primary border border-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {step.id < currentStep ? <Check className="h-3 w-3" /> : step.id}
                </span>
                {step.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: Requirements */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center mb-8">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Before we start, confirm you have these ready
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                WhatsApp Business API requires a verified Meta Business Account.
                This is a one-time setup that takes 10-30 minutes.
              </p>
            </div>
            
            <Card className="max-w-2xl mx-auto">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="business-account"
                    checked={requirements.hasBusinessAccount}
                    onCheckedChange={(checked) =>
                      setRequirements((prev) => ({
                        ...prev,
                        hasBusinessAccount: checked as boolean,
                      }))
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="business-account" className="font-medium">
                      A Facebook Business Account (not a personal account)
                    </Label>
                    <a
                      href="https://business.facebook.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      What's this? <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="whatsapp-number"
                    checked={requirements.hasWhatsAppNumber}
                    onCheckedChange={(checked) =>
                      setRequirements((prev) => ({
                        ...prev,
                        hasWhatsAppNumber: checked as boolean,
                      }))
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="whatsapp-number" className="font-medium">
                      Your WhatsApp Business phone number
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      This must be a number that is NOT currently active in the WhatsApp
                      app on any phone. You can use a landline or a new SIM.
                    </p>
                    <a
                      href="#"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      Can I use my current number? <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="business-verified"
                    checked={requirements.hasBusinessVerified}
                    onCheckedChange={(checked) =>
                      setRequirements((prev) => ({
                        ...prev,
                        hasBusinessVerified: checked as boolean,
                      }))
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="business-verified" className="font-medium">
                      Your business is verified on Meta
                    </Label>
                    <a
                      href="#"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      How to verify my business <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="display-name"
                    checked={requirements.hasDisplayName}
                    onCheckedChange={(checked) =>
                      setRequirements((prev) => ({
                        ...prev,
                        hasDisplayName: checked as boolean,
                      }))
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="display-name" className="font-medium">
                      A display name for your WhatsApp Business profile
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      (e.g. "Simca Cleaning Nairobi" — this is what customers see)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Info Box */}
            <Card className="max-w-2xl mx-auto bg-blue-500/5 border-blue-500/20">
              <CardContent className="pt-6 flex gap-3">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-700 dark:text-blue-300">
                    WhatsApp Business API via Meta Cloud is free.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You pay only for conversation fees when messaging customers outside a 24-hour window.
                    Conversations you initiate cost ~$0.005–$0.08 each depending on region.
                    Customer-initiated conversations are free for 24 hours.
                  </p>
                  <a
                    href="#"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-2"
                  >
                    View full pricing <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Step 2: Connect Meta */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center mb-8">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Connect your Meta Business Account
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                We'll open a Meta authorization window. Sign in with the
                Facebook account that manages your WhatsApp Business number.
              </p>
            </div>
            
            {metaConnected ? (
              <Card className="max-w-md mx-auto border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="pt-6 flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  <div>
                    <p className="font-medium text-emerald-700 dark:text-emerald-300">
                      Meta account connected!
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You can now proceed to select your WhatsApp number.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex justify-center gap-8 py-8">
                  <div className="flex flex-col items-center">
                    <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-8 w-8 text-white"
                        fill="currentColor"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium mt-2">Meta</p>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="h-px w-16 bg-border" />
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div className="h-px w-16 bg-border" />
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center">
                      <MessageCircle className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-sm font-medium mt-2">NexaChat</p>
                  </div>
                </div>
                
                <div className="max-w-md mx-auto">
                  <Button
                    onClick={handleConnectMeta}
                    disabled={connecting}
                    className="w-full h-12 text-base"
                    style={{ backgroundColor: "#1877F2" }}
                  >
                    {connecting ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5 mr-2"
                        fill="currentColor"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    )}
                    Continue with Facebook
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    We request only the permissions needed to send and receive WhatsApp
                    messages on your behalf. We never post to Facebook or access your
                    personal data.
                  </p>
                  
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Permissions that will be requested:
                    </p>
                    <ul className="text-xs space-y-1">
                      <li className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-emerald-500" />
                        whatsapp_business_management
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-emerald-500" />
                        whatsapp_business_messaging
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-emerald-500" />
                        business_management
                      </li>
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Step 3: Select Phone Number */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center mb-8">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <Phone className="h-6 w-6 text-emerald-500" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Choose your WhatsApp Business number
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                These are the phone numbers in your Meta Business Account.
                Select the one you want to connect to NexaChat.
              </p>
            </div>
            
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : whatsappAccounts.length === 0 ? (
              <Card className="max-w-md mx-auto">
                <CardContent className="pt-6 text-center">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No phone numbers found in this account.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={loadWhatsAppAccounts}
                  >
                    Refresh List
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="max-w-2xl mx-auto space-y-4">
                {whatsappAccounts.map((account) => (
                  <div key={account.id}>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      {account.display_name}
                    </p>
                    <div className="space-y-2">
                      {account.phone_numbers.map((phone) => (
                        <button
                          key={phone.id}
                          onClick={() => {
                            setSelectedAccount(account.id);
                            setSelectedPhone(phone.id);
                            setTestPhone(phone.display_phone_number);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                            selectedPhone === phone.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/30"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                              <Phone className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-foreground">
                                {phone.display_phone_number}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {account.display_name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {phone.verified && (
                              <Badge variant="success" className="text-[10px]">
                                <Check className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                            {selectedPhone === phone.id && (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                
                <Card className="bg-amber-500/5 border-amber-500/20 mt-6">
                  <CardContent className="pt-4 flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-700 dark:text-amber-300">
                        Important
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your number must not be registered in the regular
                        WhatsApp app. If it is, you'll need to delete that account first.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
        
        {/* Step 4: Templates */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center mb-8">
              <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-6 w-6 text-violet-500" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Set up your message templates
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                WhatsApp requires pre-approved templates for messages sent
                outside a 24-hour window. We've prepared the essential ones
                for you.
              </p>
            </div>
            
            <Card className="bg-blue-500/5 border-blue-500/20 max-w-2xl mx-auto">
              <CardContent className="pt-4 flex gap-3">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-700 dark:text-blue-300">
                    How templates work
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    When a customer messages you, you have 24 hours to reply freely.
                    After 24 hours of silence, you can only use approved templates.
                    These templates must be submitted to Meta for review (usually
                    takes 24–48 hours).
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <div className="max-w-2xl mx-auto space-y-4">
              {templates.map((template, index) => (
                <Card key={template.name} className="overflow-hidden">
                  <div className="px-4 py-3 bg-muted/30 border-b flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{template.name}</p>
                      <Badge variant="outline" className="text-[10px] mt-1">
                        {template.category}
                      </Badge>
                    </div>
                    <Badge
                      variant={
                        template.status === "approved"
                          ? "success"
                          : template.status === "pending"
                          ? "warning"
                          : template.status === "rejected"
                          ? "destructive"
                          : "outline"
                      }
                      className="text-[10px]"
                    >
                      {template.status === "not_submitted"
                        ? "Not submitted"
                        : template.status === "pending"
                        ? "Pending Meta Review"
                        : template.status === "approved"
                        ? "Approved"
                        : "Rejected"}
                    </Badge>
                  </div>
                  <CardContent className="pt-4">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {template.content}
                    </p>
                    {template.variables.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-1">Variables:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.variables.map((v, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">
                              {`{{${i + 1}}}`} {v}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Card className="bg-amber-500/5 border-amber-500/20 max-w-2xl mx-auto">
              <CardContent className="pt-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-700 dark:text-amber-300">
                    Meta reviews templates in 24–48 hours
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your chatbot works immediately — templates just unlock messaging after
                    the 24-hour window. You can add more templates later in
                    Settings → Channels → WhatsApp → Templates.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Step 5: Test Connection */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center mb-8">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-emerald-500" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Test your WhatsApp connection
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Send a test message to confirm everything is working.
              </p>
            </div>
            
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="font-medium text-foreground">Send a test message</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">
                      1. Open WhatsApp on your phone
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      2. Message this number:
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        value={testPhone}
                        readOnly
                        className="font-mono text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(testPhone);
                          toast({ title: "Copied!" });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">
                      3. Send the word: <strong>TEST</strong>
                    </p>
                  </div>
                  
                  {testStatus === "waiting" && (
                    <div className="text-center py-6">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-primary">
                          Waiting for your test message...
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {testStatus === "received" && (
                    <div className="text-center py-6">
                      <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                      <p className="font-medium text-foreground">
                        Test message received!
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your WhatsApp channel is working.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Step 6: Configure */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center mb-8">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Configure your WhatsApp behavior
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                These settings control how your AI responds on WhatsApp.
                You can change all of these anytime in Settings → Channels.
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Greeting Message */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Greeting Message</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    First message when a new customer messages you
                  </p>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={greetingMessage}
                    onChange={(e) => setGreetingMessage(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {greetingMessage.length}/1000 characters
                  </p>
                </CardContent>
              </Card>
              
              {/* Business Hours */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Business Hours on WhatsApp</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Use my global business hours settings</Label>
                    <Switch
                      checked={useGlobalBusinessHours}
                      onCheckedChange={setUseGlobalBusinessHours}
                    />
                  </div>
                  
                  {!useGlobalBusinessHours && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        Separate hours configuration would appear here
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-sm">Outside hours behavior</Label>
                    <div className="mt-2 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="offhours"
                          value="keep_active_24_7"
                          checked={offlineBehavior === "keep_active_24_7"}
                          onChange={() => setOfflineBehavior("keep_active_24_7")}
                          className="h-4 w-4 text-primary"
                        />
                        <span className="text-sm">Keep AI active 24/7 (recommended)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="offhours"
                          value="send_offline_template"
                          checked={offlineBehavior === "send_offline_template"}
                          onChange={() => setOfflineBehavior("send_offline_template")}
                          className="h-4 w-4 text-primary"
                        />
                        <span className="text-sm">
                          Send offline template message + collect contact details only
                        </span>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Response Delay */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Response Delay</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Add a typing delay before responding. A small delay feels more natural.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground w-8">0s</span>
                    <Slider
                      value={[responseDelay]}
                      onValueChange={([value]) => setResponseDelay(value)}
                      max={8}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-8">8s</span>
                    <span className="text-sm font-medium w-8">{responseDelay}s</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Typing indicator</Label>
                    <Switch
                      checked={showTypingIndicator}
                      onCheckedChange={setShowTypingIndicator}
                    />
                    <p className="text-xs text-muted-foreground">
                      Shows "typing..." bubble to customer
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Auto-reply to Unknown Intents */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    Auto-reply to Unknown Intents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={unknownIntentMessage}
                    onChange={(e) => setUnknownIntentMessage(e.target.value)}
                    rows={3}
                    className="resize-none"
                    placeholder="What to say when the AI doesn't know the answer"
                  />
                </CardContent>
              </Card>
              
              {/* Voice Message Handling */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Voice Message Handling</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Transcribe and respond to voice messages</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Voice notes are transcribed using AI and answered like text messages.
                      </p>
                    </div>
                    <Switch
                      checked={transcribeVoice}
                      onCheckedChange={setTranscribeVoice}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Image Handling */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Image Handling</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Analyze and respond to images customers send</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Customers can send photos of products, problems, or documents.
                        Your AI will read and respond to them.
                      </p>
                    </div>
                    <Switch
                      checked={analyzeImages}
                      onCheckedChange={setAnalyzeImages}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
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
          
          <div className="flex items-center gap-2">
            {currentStep === 4 && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSkippedTemplates(true);
                  setCurrentStep(5);
                }}
              >
                Skip for now
              </Button>
            )}
            
            {currentStep < 6 ? (
              <Button
                onClick={() => {
                  if (currentStep === 4 && !skippedTemplates) {
                    handleSubmitTemplates();
                  }
                  setCurrentStep((prev) => Math.min(6, prev + 1) as WizardStep);
                }}
                disabled={!canProceed() || (currentStep === 4 && submittingTemplates)}
              >
                {currentStep === 4 && submittingTemplates && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
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
    </div>
  );
}
