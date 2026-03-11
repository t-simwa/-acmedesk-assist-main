import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Check,
  AlertTriangle,
  Info,
  Mail,
  RefreshCw,
  Loader2,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { channelsApi, channelSettingsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface EmailSetupWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

type WizardStep = 1 | 2 | 3;

export default function EmailSetupWizard({ onComplete, onCancel }: EmailSetupWizardProps) {
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Email Address
  const [supportEmail, setSupportEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  
  // Step 2: Forwarding
  const [forwardingVerified, setForwardingVerified] = useState(false);
  const [verifyingForwarding, setVerifyingForwarding] = useState(false);
  const [inboundAddress] = useState(`tenant-${Math.random().toString(36).substring(7)}@inbound.nexachat.com`);
  
  // Step 3: Configuration
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [emailSignature, setEmailSignature] = useState(
    "—\n[Business Name] Support\n📞 [Phone]\n🌐 [Website]"
  );
  const [responseMode, setResponseMode] = useState<"auto" | "draft" | "hybrid">("hybrid");
  const [autoSendThreshold, setAutoSendThreshold] = useState(85);
  const [draftThreshold, setDraftThreshold] = useState(60);
  const [sendAcknowledgement, setSendAcknowledgement] = useState(true);
  const [acknowledgementMessage, setAcknowledgementMessage] = useState(
    "Thank you for emailing us! We've received your message and will respond within a few hours."
  );
  
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    
    const freeEmailProviders = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "mail.com"];
    const domain = email.split("@")[1]?.toLowerCase();
    if (freeEmailProviders.includes(domain)) {
      setEmailError("");
      return true; // Warning, not error
    }
    
    setEmailError("");
    return true;
  };
  
  const handleVerifyForwarding = async () => {
    setVerifyingForwarding(true);
    try {
      const response = await channelsApi.verifyEmailForwarding(supportEmail);
      if (response.verified) {
        setForwardingVerified(true);
        toast({
          title: "Forwarding verified!",
          description: response.message,
        });
      } else {
        toast({
          title: "Waiting for test email",
          description: response.message,
        });
      }
    } catch (error) {
      toast({
        title: "Verification failed",
        description: "Could not verify forwarding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifyingForwarding(false);
    }
  };
  
  const handleFinish = async () => {
    try {
      setLoading(true);
      // save behavior settings
      await channelSettingsApi.saveEmailBehavior({
        from_name: fromName,
        reply_to: replyTo || undefined,
        signature: emailSignature,
        response_mode: responseMode,
        auto_send_threshold: autoSendThreshold,
        draft_threshold: draftThreshold,
        auto_acknowledgement_enabled: sendAcknowledgement,
        auto_acknowledgement_message: acknowledgementMessage,
      });
      await channelsApi.toggle("email", true);
      toast({
        title: "Email channel connected!",
        description: "Your email channel is now active.",
      });
      onComplete?.();
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "There was an error connecting the email channel.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return supportEmail.length > 0 && !emailError;
      case 2:
        return forwardingVerified;
      case 3:
        return true;
      default:
        return false;
    }
  };
  
  const steps = [
    { id: 1, label: "Your Email Address" },
    { id: 2, label: "Forward Setup" },
    { id: 3, label: "Configure & Test" },
  ];
  
  const isFreeEmailProvider = () => {
    const domain = supportEmail.split("@")[1]?.toLowerCase();
    return ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "mail.com"].includes(domain || "");
  };
  
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
                  Connect Email Channel
                </h1>
                <p className="text-xs text-muted-foreground">
                  Step {currentStep} of 3
                </p>
              </div>
            </div>
            
            {/* Progress indicators */}
            <div className="hidden sm:flex items-center gap-1">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={cn(
                    "h-2 w-10 rounded-full transition-colors",
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
          <div className="hidden lg:flex items-center gap-6 mt-4 text-xs">
            {steps.map((step) => (
              <button
                key={step.id}
                onClick={() => step.id < currentStep && setCurrentStep(step.id as WizardStep)}
                className={cn(
                  "flex items-center gap-2 transition-colors",
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
        {/* Step 1: Email Address */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center mb-8">
              <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-violet-500" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Which email address should your AI monitor?
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                This is the email your customers send enquiries to.
                Your AI will read and respond to every email that arrives.
              </p>
            </div>
            
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6">
                <Label htmlFor="support-email" className="text-sm font-medium">
                  Support email address
                </Label>
                <Input
                  id="support-email"
                  type="email"
                  placeholder="support@yourbusiness.com"
                  value={supportEmail}
                  onChange={(e) => {
                    setSupportEmail(e.target.value);
                    validateEmail(e.target.value);
                  }}
                  className={cn("mt-2", emailError && "border-destructive")}
                />
                {emailError && (
                  <p className="text-xs text-destructive mt-2">{emailError}</p>
                )}
                {isFreeEmailProvider() && supportEmail && (
                  <div className="flex items-start gap-2 mt-3 p-3 bg-amber-500/10 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      We recommend a business email (yourname@yourdomain.com)
                      for professional appearance and better deliverability.
                      Gmail addresses work but may reduce client trust.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Step 2: Forward Setup */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center mb-8">
              <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="h-6 w-6 text-violet-500" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Forward your email to NexaChat
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                You need to set up forwarding so NexaChat receives
                a copy of every email sent to your address.
              </p>
            </div>
            
            {/* Inbound Address */}
            <Card className="max-w-xl mx-auto">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  YOUR DEDICATED INBOUND ADDRESS
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={inboundAddress}
                    readOnly
                    className="font-mono text-center bg-muted/50"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(inboundAddress);
                      toast({ title: "Copied!" });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This address is unique to your account. Guard it — don't
                  share it publicly.
                </p>
              </CardContent>
            </Card>
            
            {/* Provider Tabs */}
            <Card className="max-w-xl mx-auto">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">How to set up forwarding</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  {["Gmail", "Google Workspace", "Outlook", "Zoho", "Other"].map((provider) => (
                    <Button
                      key={provider}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      {provider}
                    </Button>
                  ))}
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg space-y-3 text-sm">
                  <p className="font-medium text-foreground">Gmail Setup:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
                    <li>Open Gmail → Settings (gear icon) → See all settings</li>
                    <li>Click the "Forwarding and POP/IMAP" tab</li>
                    <li>Click "Add a forwarding address"</li>
                    <li>Paste this address: <code className="text-xs bg-muted px-1 rounded">{inboundAddress}</code></li>
                    <li>Gmail will send a confirmation code</li>
                    <li>Enter the confirmation code below</li>
                    <li>Back in Gmail, select "Forward a copy to..." and Save</li>
                  </ol>
                </div>
                
                {/* Verification */}
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-3">
                    Send a test email to {supportEmail} from any address right now.
                    We'll detect it here.
                  </p>
                  
                  {forwardingVerified ? (
                    <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <span className="text-sm text-emerald-700 dark:text-emerald-300">
                        Forwarding is working!
                      </span>
                    </div>
                  ) : (
                    <Button
                      onClick={handleVerifyForwarding}
                      disabled={verifyingForwarding}
                      className="w-full"
                    >
                      {verifyingForwarding ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Waiting for test email...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Verify forwarding
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Step 3: Configure */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center mb-8">
              <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-6 w-6 text-violet-500" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Configure your email AI behavior
              </h2>
            </div>
            
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Display Name & From Address */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    Display Name & From Address
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    When your AI sends emails, what name should appear?
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm">From Name</Label>
                    <Input
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="Simca Cleaning Support"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Reply-to</Label>
                    <Input
                      value={replyTo || supportEmail}
                      onChange={(e) => setReplyTo(e.target.value)}
                      placeholder={supportEmail}
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Email Signature */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Email Signature</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Added to the bottom of every reply sent by your AI.
                  </p>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={emailSignature}
                    onChange={(e) => setEmailSignature(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </CardContent>
              </Card>
              
              {/* AI Response Mode */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">AI Response Mode</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    How should your AI handle incoming emails?
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup
                    value={responseMode}
                    onValueChange={(value) => setResponseMode(value as typeof responseMode)}
                    className="space-y-3"
                  >
                    <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value="auto" className="mt-1" />
                      <div>
                        <p className="text-sm font-medium">Auto-send (Recommended for simple support)</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          AI responds immediately when confidence is high (≥85%).
                          Reviews lower-confidence responses before sending.
                        </p>
                      </div>
                    </label>
                    
                    <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value="draft" className="mt-1" />
                      <div>
                        <p className="text-sm font-medium">Always draft first (Professional services)</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          AI drafts every response. You review and approve before
                          anything is sent. More control, more effort.
                        </p>
                      </div>
                    </label>
                    
                    <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value="hybrid" className="mt-1" />
                      <div>
                        <p className="text-sm font-medium">Hybrid (Smart default)</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          High confidence → sent automatically.
                          Lower confidence → drafted for your review.
                          Very low confidence → flagged for manual reply.
                        </p>
                      </div>
                    </label>
                  </RadioGroup>
                  
                  {(responseMode === "auto" || responseMode === "hybrid") && (
                    <div className="pt-4 border-t space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span>Auto-send above</span>
                          <span className="font-mono">{autoSendThreshold}%</span>
                        </div>
                        <Slider
                          value={[autoSendThreshold]}
                          onValueChange={([value]) => setAutoSendThreshold(value)}
                          max={100}
                          step={5}
                        />
                      </div>
                      
                      {responseMode === "hybrid" && (
                        <div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span>Draft below</span>
                            <span className="font-mono">{draftThreshold}%</span>
                          </div>
                          <Slider
                            value={[draftThreshold]}
                            onValueChange={([value]) => setDraftThreshold(value)}
                            max={100}
                            step={5}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Auto-acknowledgement */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Auto-acknowledgement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">
                      Send instant acknowledgement to every inbound email
                    </Label>
                    <Switch
                      checked={sendAcknowledgement}
                      onCheckedChange={setSendAcknowledgement}
                    />
                  </div>
                  
                  {sendAcknowledgement && (
                    <Textarea
                      value={acknowledgementMessage}
                      onChange={(e) => setAcknowledgementMessage(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Sent within 30 seconds. Prevents customers wondering if
                    their email arrived while your AI processes the reply.
                  </p>
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
          
          {currentStep < 3 ? (
            <Button
              onClick={() => setCurrentStep((prev) => Math.min(3, prev + 1) as WizardStep)}
              disabled={!canProceed()}
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save & Activate Email Channel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
