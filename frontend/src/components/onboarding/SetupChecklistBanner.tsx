import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { onboardingApi, OnboardingStatus } from "@/lib/api";

interface SetupChecklistBannerProps {
  className?: string;
}

export function SetupChecklistBanner({ className = "" }: SetupChecklistBannerProps) {
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
    },
  });

  if (isLoading || status?.completed || status?.skipped_steps?.includes("checklist")) {
    return null;
  }

  const totalSteps = 6;
  const completedSteps = status?.current_step || 1;
  const remainingSteps = totalSteps - completedSteps;
  const progress = (completedSteps / totalSteps) * 100;

  return (
    <div
      className={`bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">Setup Progress</span>
            <span className="text-sm text-muted-foreground">
              ({completedSteps}/{totalSteps} complete)
            </span>
          </div>
          <Progress value={progress} className="h-2 mb-2" />
          <p className="text-sm text-muted-foreground">
            {remainingSteps > 0
              ? `${remainingSteps} step${remainingSteps > 1 ? "s" : ""} remaining`
              : "Almost done!"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/get-started")}>
            View Checklist
          </Button>
          <Button size="sm" onClick={() => navigate(`/onboarding?step=${completedSteps}`)}>
            Complete Setup →
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dismissMutation.mutate()}
            disabled={dismissMutation.isPending}
          >
            ✕
          </Button>
        </div>
      </div>
    </div>
  );
}
