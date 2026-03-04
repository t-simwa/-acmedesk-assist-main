import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { onboardingApi, OnboardingStatus } from "@/lib/api";

const STEPS = [
  { id: 1, title: "Business Profile", description: "Tell us about your business", path: "/onboarding?step=1" },
  { id: 2, title: "Choose Plan", description: "Select your subscription", path: "/onboarding?step=2" },
  { id: 3, title: "Upload Documents", description: "Train your chatbot with knowledge", path: "/onboarding?step=3" },
  { id: 4, title: "Configure Chatbot", description: "Customize your AI assistant", path: "/onboarding?step=4" },
  { id: 5, title: "Test Chatbot", description: "Try out your chatbot", path: "/onboarding?step=5" },
  { id: 6, title: "Embed Code", description: "Add to your website", path: "/onboarding?step=6" },
];

export default function GetStarted() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: () => onboardingApi.getStatus(),
  });

  const dismissMutation = useMutation({
    mutationFn: () => onboardingApi.dismissChecklist(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      toast.success("Setup guide dismissed");
      navigate("/admin");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const completedSteps = status?.skipped_steps
    ? STEPS.length - status.skipped_steps.filter((s) => s !== "checklist").length
    : 0;
  const progress = (completedSteps / STEPS.length) * 100;

  const isStepCompleted = (stepId: number) => {
    if (status?.completed) return true;
    if (!status?.skipped_steps) return stepId < (status?.current_step || 1);
    return !status.skipped_steps.includes(stepId.toString());
  };

  const handleContinue = (path: string) => {
    navigate(path);
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground mb-2">
          Complete Your Setup
        </h1>
        <p className="text-sm text-muted-foreground">
           Finish setting up your AI assistant to get the most out of NexaChat
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Setup Progress</CardTitle>
            <Badge variant="outline" className="text-xs">
              {completedSteps} of {STEPS.length} complete
            </Badge>
          </div>
          <Progress value={progress} className="h-1.5 mt-2" />
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {STEPS.map((step) => {
          const completed = isStepCompleted(step.id);
          const isCurrentStep = status?.current_step === step.id;

          return (
            <Card
              key={step.id}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                completed ? "opacity-60" : ""
              }`}
              onClick={() => handleContinue(step.path)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${
                      completed
                        ? "bg-success text-white"
                        : isCurrentStep
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {completed ? "✓" : step.id}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{step.title}</div>
                    <div className="text-xs text-muted-foreground">{step.description}</div>
                  </div>
                </div>
                <Button variant={completed ? "ghost" : "default"} size="sm" className="text-xs">
                  {completed ? "Review" : isCurrentStep ? "Continue" : "Start"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <Button
          variant="ghost"
          onClick={() => dismissMutation.mutate()}
          disabled={dismissMutation.isPending}
          className="text-sm text-muted-foreground"
        >
          Skip setup guide
        </Button>
      </div>
    </div>
  );
}
