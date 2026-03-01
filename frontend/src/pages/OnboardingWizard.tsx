import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  onboardingApi,
  OnboardingStatus,
  PlanInfo,
  BusinessProfileRequest,
  ChatbotConfigRequest,
  EmbedCodeResponse,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const INDUSTRY_OPTIONS = [
  "E-commerce",
  "Legal",
  "Real Estate",
  "Healthcare",
  "SaaS",
  "Cleaning/Home Services",
  "Food & Beverage",
  "Retail",
  "Education",
  "Finance",
  "Travel",
  "Other",
];

const STEPS = [
  { id: 1, title: "Business Profile", description: "Tell us about your business" },
  { id: 2, title: "Choose Plan", description: "Select your subscription" },
  { id: 3, title: "Upload Documents", description: "Train your chatbot" },
  { id: 4, title: "Configure Chatbot", description: "Customize your assistant" },
  { id: 5, title: "Test Chatbot", description: "Try it out" },
  { id: 6, title: "Embed Code", description: "Go live" },
];

const AVATAR_OPTIONS = [
  { id: "avatar1", color: "#4F8EF7", icon: "🤖" },
  { id: "avatar2", color: "#7C3AED", icon: "💬" },
  { id: "avatar3", color: "#10B981", icon: "✨" },
  { id: "avatar4", color: "#F59E0B", icon: "🌟" },
  { id: "avatar5", color: "#EF4444", icon: "🔥" },
  { id: "avatar6", color: "#EC4899", icon: "💜" },
  { id: "avatar7", color: "#06B6D4", icon: "💙" },
  { id: "avatar8", color: "#8B5CF6", icon: "🎯" },
];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const initialStep = parseInt(searchParams.get("step") || "1");
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isComplete, setIsComplete] = useState(false);

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: () => onboardingApi.getStatus(),
  });

  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: () => onboardingApi.getPlans(),
  });

  useEffect(() => {
    if (status?.completed && !isComplete) {
      setIsComplete(true);
      setCurrentStep(6);
    } else if (status && !status.completed && currentStep !== status.current_step) {
      setCurrentStep(status.current_step);
    }
  }, [status]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: BusinessProfileRequest) => onboardingApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      completeStepMutation.mutate(1);
    },
  });

  const selectPlanMutation = useMutation({
    mutationFn: (planTier: string) => onboardingApi.selectPlan(planTier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
    },
  });

  const configureChatbotMutation = useMutation({
    mutationFn: (data: ChatbotConfigRequest) => onboardingApi.configureChatbot(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      completeStepMutation.mutate(4);
    },
  });

  const completeStepMutation = useMutation({
    mutationFn: (step: number) => onboardingApi.completeStep(step),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      if (data.completed) {
        setIsComplete(true);
        navigate("/admin");
      } else {
        const nextStep = data.next_step;
        setCurrentStep(nextStep);
        setSearchParams({ step: nextStep.toString() });
      }
    },
  });

  const skipStepMutation = useMutation({
    mutationFn: ({ step, reason }: { step: number; reason?: string }) =>
      onboardingApi.skipStep(step, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      const nextStep = data.next_step;
      if (nextStep > 6) {
        navigate("/admin");
      } else {
        setCurrentStep(nextStep);
        setSearchParams({ step: nextStep.toString() });
      }
    },
  });

  const handleStepChange = (step: number) => {
    if (step >= 1 && step <= 6) {
      setCurrentStep(step);
      setSearchParams({ step: step.toString() });
    }
  };

  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const progress = (currentStep / 6) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to AcmeDesk</h1>
          <p className="text-muted-foreground">
            Let's set up your AI assistant in just a few minutes
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`flex flex-col items-center cursor-pointer ${
                  step.id === currentStep ? "text-primary" : "text-muted-foreground"
                }`}
                onClick={() => handleStepChange(step.id)}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-1 ${
                    step.id < currentStep
                      ? "bg-primary text-primary-foreground"
                      : step.id === currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {step.id < currentStep ? "✓" : step.id}
                </div>
                <span className="text-xs hidden sm:block">{step.title}</span>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="pt-6">
            {currentStep === 1 && (
              <BusinessProfileStep
                status={status}
                onSave={updateProfileMutation.mutate}
                onNext={() => completeStepMutation.mutate(1)}
                isLoading={updateProfileMutation.isPending || completeStepMutation.isPending}
              />
            )}
            {currentStep === 2 && (
              <ChoosePlanStep
                plans={plans || []}
                selectedPlan={status?.plan_tier}
                onSelect={(plan) => selectPlanMutation.mutate(plan)}
                onNext={() => completeStepMutation.mutate(2)}
                onSkip={() => skipStepMutation.mutate({ step: 2 })}
                isLoading={selectPlanMutation.isPending || completeStepMutation.isPending}
              />
            )}
            {currentStep === 3 && (
              <UploadDocumentsStep
                status={status}
                onNext={() => completeStepMutation.mutate(3)}
                onSkip={() => skipStepMutation.mutate({ step: 3 })}
                isLoading={completeStepMutation.isPending}
              />
            )}
            {currentStep === 4 && (
              <ConfigureChatbotStep
                status={status}
                onSave={configureChatbotMutation.mutate}
                onNext={() => completeStepMutation.mutate(4)}
                onSkip={() => skipStepMutation.mutate({ step: 4 })}
                isLoading={configureChatbotMutation.isPending || completeStepMutation.isPending}
              />
            )}
            {currentStep === 5 && (
              <TestChatbotStep
                status={status}
                onNext={() => completeStepMutation.mutate(5)}
                onSkip={() => skipStepMutation.mutate({ step: 5 })}
                isLoading={completeStepMutation.isPending}
              />
            )}
            {currentStep === 6 && (
              <EmbedCodeStep
                onComplete={() => {
                  completeStepMutation.mutate(6);
                }}
                onSkip={() => skipStepMutation.mutate({ step: 6 })}
                isLoading={completeStepMutation.isPending}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Step 1: Business Profile
// ============================================================================

function BusinessProfileStep({
  status,
  onSave,
  onNext,
  isLoading,
}: {
  status?: OnboardingStatus;
  onSave: (data: BusinessProfileRequest) => void;
  onNext: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<BusinessProfileRequest>({
    business_name: status?.business_name || "",
    industry: status?.industry || "",
    website_url: status?.website_url || "",
    business_description: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-bold mb-4">Business Profile</h2>
      <p className="text-muted-foreground mb-6">
        Tell us about your business so we can personalize your AI assistant.
      </p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="business_name">Business Name</Label>
          <Input
            id="business_name"
            value={formData.business_name}
            onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
            placeholder="Your Business Name"
          />
        </div>

        <div>
          <Label htmlFor="industry">Industry</Label>
          <select
            id="industry"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
          >
            <option value="">Select an industry</option>
            {INDUSTRY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="website_url">Website URL</Label>
          <Input
            id="website_url"
            type="url"
            value={formData.website_url}
            onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
            placeholder="https://yourwebsite.com"
          />
        </div>

        <div>
          <Label htmlFor="business_description">Business Description</Label>
          <Textarea
            id="business_description"
            value={formData.business_description}
            onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
            placeholder="Describe what your business does in 2-3 sentences — this helps your AI understand context"
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Continue →
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Step 2: Choose Plan
// ============================================================================

function ChoosePlanStep({
  plans,
  selectedPlan,
  onSelect,
  onNext,
  onSkip,
  isLoading,
}: {
  plans: PlanInfo[];
  selectedPlan?: string;
  onSelect: (plan: string) => void;
  onNext: () => void;
  onSkip: () => void;
  isLoading: boolean;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
      <p className="text-muted-foreground mb-6">
        Select a plan that fits your needs. You can change anytime.
      </p>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {plans.map((plan) => (
          <Card
            key={plan.tier}
            className={`cursor-pointer transition-all ${
              selectedPlan === plan.tier
                ? "border-primary ring-2 ring-primary"
                : "hover:border-primary/50"
            }`}
            onClick={() => onSelect(plan.tier)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan.name}
                {plan.highlighted && (
                  <Badge className="bg-primary">Most Popular</Badge>
                )}
              </CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">
                ${plan.price_monthly}
                <span className="text-sm font-normal text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                ${plan.setup_fee} setup fee
              </p>
              <ul className="text-sm space-y-2">
                {plan.features.slice(0, 4).map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <span className="mr-2 text-primary">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
        <Button onClick={onNext} disabled={isLoading || !selectedPlan}>
          {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Continue →
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Step 3: Upload Documents
// ============================================================================

function UploadDocumentsStep({
  status,
  onNext,
  onSkip,
  isLoading,
}: {
  status?: OnboardingStatus;
  onNext: () => void;
  onSkip: () => void;
  isLoading: boolean;
}) {
  const canProceed = (status?.ready_document_count || 0) >= 1;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Upload Documents</h2>
      <p className="text-muted-foreground mb-6">
        Train your AI assistant with your business knowledge.
      </p>

      <Alert className="mb-6">
        <AlertDescription>
          <strong>Tip:</strong> Upload FAQs, pricing guides, product catalogs, service menus,
          policy documents — anything your customers typically ask about.
        </AlertDescription>
      </Alert>

      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center mb-6">
        <div className="text-4xl mb-4">📄</div>
        <h3 className="text-lg font-medium mb-2">Drop files here or click to browse</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Supports PDF, DOCX, TXT, CSV (max 50MB per file)
        </p>
        <Button variant="outline" onClick={() => navigate("/admin/documents")}>
          Go to Documents Page
        </Button>
      </div>

      <div className="bg-muted rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Document Status</span>
          <span className="text-sm">
            {status?.ready_document_count || 0} ready / {status?.document_count || 0} total
          </span>
        </div>
        <Progress
          value={status?.ready_document_count ? (status.ready_document_count / 1) * 100 : 0}
          className="h-2"
        />
        {!canProceed && (
          <p className="text-sm text-amber-600 mt-2">
            ⚠️ At least 1 document must be in "Ready" status to continue
          </p>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
        <Button onClick={onNext} disabled={isLoading}>
          {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Continue →
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Step 4: Configure Chatbot
// ============================================================================

function ConfigureChatbotStep({
  status,
  onSave,
  onNext,
  onSkip,
  isLoading,
}: {
  status?: OnboardingStatus;
  onSave: (data: ChatbotConfigRequest) => void;
  onNext: () => void;
  onSkip: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<ChatbotConfigRequest>({
    name: status?.chatbot_name || "Aria",
    avatar_url: "",
    brand_color: "#4F8EF7",
    greeting_message: `Hi! I'm ${status?.chatbot_name || "Aria"}, ${status?.business_name || "your business"}'s AI assistant. How can I help you today? 😊`,
    fallback_message: "I don't have specific information about that. Would you like to speak with our team?",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-bold mb-2">Configure Your Chatbot</h2>
      <p className="text-muted-foreground mb-6">
        Customize how your AI assistant looks and behaves.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="chatbot_name">Chatbot Name</Label>
            <Input
              id="chatbot_name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Aria"
            />
          </div>

          <div>
            <Label>Avatar</Label>
            <div className="flex gap-2 mt-2">
              {AVATAR_OPTIONS.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                    formData.avatar_url === avatar.id
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : ""
                  }`}
                  style={{ backgroundColor: avatar.color }}
                  onClick={() => setFormData({ ...formData, avatar_url: avatar.id })}
                >
                  {avatar.icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="brand_color">Brand Color</Label>
            <div className="flex gap-2 mt-2">
              <input
                type="color"
                id="brand_color"
                value={formData.brand_color}
                onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer"
              />
              <Input
                value={formData.brand_color}
                onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="greeting_message">Greeting Message</Label>
            <Textarea
              id="greeting_message"
              value={formData.greeting_message}
              onChange={(e) => setFormData({ ...formData, greeting_message: e.target.value })}
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="fallback_message">Fallback Message</Label>
            <Textarea
              id="fallback_message"
              value={formData.fallback_message}
              onChange={(e) => setFormData({ ...formData, fallback_message: e.target.value })}
              rows={2}
            />
          </div>
        </div>

        <div className="bg-muted rounded-lg p-6">
          <h3 className="text-sm font-medium mb-4">Preview</h3>
          <div
            className="bg-background rounded-lg p-4"
            style={{ borderTop: `4px solid ${formData.brand_color}` }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                style={{ backgroundColor: formData.brand_color }}
              >
                {AVATAR_OPTIONS.find((a) => a.id === formData.avatar_url)?.icon || "🤖"}
              </div>
              <div>
                <div className="font-medium">{formData.name}</div>
                <div className="text-xs text-green-500">● Online</div>
              </div>
            </div>
            <div className="bg-muted rounded-lg p-3 text-sm">
              {formData.greeting_message}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Save & Continue →
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Step 5: Test Chatbot
// ============================================================================

function TestChatbotStep({
  status,
  onNext,
  onSkip,
  isLoading,
}: {
  status?: OnboardingStatus;
  onNext: () => void;
  onSkip: () => void;
  isLoading: boolean;
}) {
  const hasDocuments = (status?.ready_document_count || 0) >= 1;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Test Your Chatbot</h2>
      <p className="text-muted-foreground mb-6">
        Try asking your chatbot something your customers typically ask.
      </p>

      {!hasDocuments ? (
        <Alert className="mb-6">
          <AlertDescription>
            Please upload at least one document in Step 3 before testing your chatbot.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="border rounded-lg p-6 mb-6">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-lg font-medium mb-2">Your chatbot is trained and ready!</h3>
            <p className="text-muted-foreground mb-4">
              Try asking it questions about your business in the chat widget.
            </p>
            <Button variant="outline" onClick={() => navigate("/admin")}>
              Go to Dashboard to Test
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
        <Button onClick={onNext} disabled={isLoading}>
          {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Looks Great! Continue →
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Step 6: Embed Code
// ============================================================================

function EmbedCodeStep({
  onComplete,
  onSkip,
  isLoading,
}: {
  onComplete: () => void;
  onSkip: () => void;
  isLoading: boolean;
}) {
  const { data: embedData, isLoading: embedLoading } = useQuery({
    queryKey: ["embed-code"],
    queryFn: () => onboardingApi.getEmbedCode(),
  });

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (embedData?.embed_code) {
      navigator.clipboard.writeText(embedData.embed_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">You're Ready to Go Live!</h2>
        <p className="text-muted-foreground">
          Copy the embed code below and add it to your website.
        </p>
      </div>

      {embedLoading ? (
        <div className="text-center py-8">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <>
          <Tabs defaultValue="html" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="wordpress">WordPress</TabsTrigger>
              <TabsTrigger value="shopify">Shopify</TabsTrigger>
            </TabsList>
            <TabsContent value="html" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>HTML</CardTitle>
                  <CardDescription>
                    Add this code before the closing &lt;/body&gt; tag
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    {embedData?.embed_code}
                  </pre>
                  <Button className="mt-4" onClick={handleCopy}>
                    {copied ? "Copied!" : "Copy Code"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="wordpress" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>WordPress</CardTitle>
                  <CardDescription>
                    Install a header/footer plugin and add the code to the header
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Install a header/footer script plugin</li>
                    <li>Add the embed code to the header section</li>
                    <li>Or use a custom HTML widget in your sidebar</li>
                  </ol>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm mt-4">
                    {embedData?.embed_code}
                  </pre>
                  <Button className="mt-4" onClick={handleCopy}>
                    {copied ? "Copied!" : "Copy Code"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="shopify" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Shopify</CardTitle>
                  <CardDescription>
                    Add the code to your Shopify theme
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Go to Online Store &gt; Themes</li>
                    <li>Click Actions &gt; Edit Code</li>
                    <li>Open theme.liquid file</li>
                    <li>Paste before &lt;/body&gt; tag</li>
                  </ol>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm mt-4">
                    {embedData?.embed_code}
                  </pre>
                  <Button className="mt-4" onClick={handleCopy}>
                    {copied ? "Copied!" : "Copy Code"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <div className="flex justify-between mt-6">
        <Button variant="ghost" onClick={onSkip}>
          I'll do this later
        </Button>
        <Button onClick={onComplete} disabled={isLoading}>
          {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Go to Dashboard →
        </Button>
      </div>
    </div>
  );
}
