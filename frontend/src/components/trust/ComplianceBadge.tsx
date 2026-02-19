import * as React from "react";
import { Shield, CheckCircle2, FileCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ComplianceType = "gdpr" | "soc2" | "iso27001" | "hipaa";

export interface ComplianceBadgeProps {
  /** Type of compliance badge */
  type: ComplianceType;
  /** Show as badge or icon only */
  variant?: "badge" | "icon" | "compact";
  /** Show tooltip on hover */
  showTooltip?: boolean;
  /** Custom className */
  className?: string;
  /** Click handler for more info */
  onClick?: () => void;
}

const COMPLIANCE_INFO: Record<
  ComplianceType,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
  }
> = {
  gdpr: {
    label: "GDPR Compliant",
    description:
      "We comply with the General Data Protection Regulation (GDPR). Your data is processed lawfully, transparently, and you have full control over your personal information.",
    icon: Shield,
    color: "text-blue-600 dark:text-blue-400",
  },
  soc2: {
    label: "SOC 2 Type II",
    description:
      "We maintain SOC 2 Type II certification, ensuring our security, availability, processing integrity, confidentiality, and privacy controls meet the highest standards.",
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
  },
  iso27001: {
    label: "ISO 27001",
    description:
      "Our information security management system is certified to ISO 27001 standards, demonstrating our commitment to protecting your data.",
    icon: FileCheck,
    color: "text-purple-600 dark:text-purple-400",
  },
  hipaa: {
    label: "HIPAA Compliant",
    description:
      "For healthcare organizations, we maintain HIPAA compliance to ensure protected health information (PHI) is handled according to strict security and privacy standards.",
    icon: Shield,
    color: "text-indigo-600 dark:text-indigo-400",
  },
};

/**
 * ComplianceBadge component that displays compliance certifications
 * (GDPR, SOC 2, ISO 27001, HIPAA)
 */
export function ComplianceBadge({
  type,
  variant = "badge",
  showTooltip = true,
  className,
  onClick,
}: ComplianceBadgeProps) {
  const info = COMPLIANCE_INFO[type];
  const Icon = info.icon;

  const badgeContent = (
    <div
      className={cn(
        "flex items-center gap-1.5",
        onClick && "cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <Icon
        size={variant === "icon" ? 16 : 14}
        className={cn(info.color, variant === "icon" && "flex-shrink-0")}
        aria-hidden="true"
      />
      {variant !== "icon" && (
        <span className="text-[12px] font-medium text-foreground whitespace-nowrap">
          {info.label}
        </span>
      )}
    </div>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {variant === "badge" ? (
            <Badge
              variant="outline"
              className={cn(
                "flex items-center gap-1.5 px-2 py-1",
                onClick && "cursor-pointer hover:bg-muted transition-colors",
                className
              )}
              onClick={onClick}
            >
              <Icon size={14} className={info.color} aria-hidden="true" />
              <span className="text-[12px] font-medium">{info.label}</span>
            </Badge>
          ) : variant === "compact" ? (
            <Badge
              variant="secondary"
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 text-[10px]",
                onClick && "cursor-pointer hover:bg-muted/80 transition-colors",
                className
              )}
              onClick={onClick}
            >
              <Icon size={10} className={info.color} aria-hidden="true" />
              <span>{info.label.split(" ")[0]}</span>
            </Badge>
          ) : (
            badgeContent
          )}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium text-sm mb-1">{info.label}</p>
          <p className="text-xs text-muted-foreground">{info.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * ComplianceBadges component that displays multiple compliance badges
 */
export interface ComplianceBadgesProps {
  /** Types of compliance to display */
  types?: ComplianceType[];
  /** Variant for badges */
  variant?: "badge" | "icon" | "compact";
  /** Show tooltips */
  showTooltip?: boolean;
  /** Custom className */
  className?: string;
  /** Layout direction */
  direction?: "row" | "column";
  /** Click handler for badges */
  onBadgeClick?: (type: ComplianceType) => void;
}

export function ComplianceBadges({
  types = ["gdpr", "soc2"],
  variant = "badge",
  showTooltip = true,
  className,
  direction = "row",
  onBadgeClick,
}: ComplianceBadgesProps) {
  return (
    <div
      className={cn(
        "flex gap-2",
        direction === "column" ? "flex-col" : "flex-row flex-wrap",
        className
      )}
      role="list"
      aria-label="Compliance certifications"
    >
      {types.map((type) => (
        <ComplianceBadge
          key={type}
          type={type}
          variant={variant}
          showTooltip={showTooltip}
          onClick={onBadgeClick ? () => onBadgeClick(type) : undefined}
        />
      ))}
    </div>
  );
}
