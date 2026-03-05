import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TEMPLATES = [
  "Welcome",
  "Verification",
  "Password Reset",
  "Onboarding Reminder",
  "Lead Notification",
  "Escalation Alert",
  "Usage Warning",
  "Invoice Receipt",
  "Failed Payment",
  "Cancellation",
  "Re-engagement",
  "Referral Invitation",
] as const;

type TemplateKey = (typeof TEMPLATES)[number];

export default function SuperAdminEmails() {
  const [selected, setSelected] = useState<TemplateKey>("Welcome");

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Email Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Manage all transactional emails your clients and their customers receive.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-6">
        {/* Template list */}
        <Card className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
            <CardTitle className="text-sm sm:text-base font-semibold font-heading text-foreground">
              Templates
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-3 py-3 sm:py-4">
            <div className="flex flex-col gap-1">
              {TEMPLATES.map((tpl) => {
                const isActive = tpl === selected;
                return (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => setSelected(tpl)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-left transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <span>{tpl}</span>
                    <span className="text-[10px] text-muted-foreground/70">Last edited · sample</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Editor panel */}
        <Card className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
            <CardTitle className="text-sm sm:text-base font-semibold font-heading text-foreground">
              {selected} Email
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 py-5 sm:py-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Subject Line
                </Label>
                <Input
                  className="h-9 text-xs"
                  placeholder={`Subject for ${selected.toLowerCase()} email`}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Preview Text
                </Label>
                <Input
                  className="h-9 text-xs"
                  placeholder="Short preview shown in inbox"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr),minmax(0,1fr)] gap-4">
              {/* HTML editor placeholder */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  HTML Content
                </Label>
                <Textarea
                  className="min-h-[220px] text-xs font-mono"
                  placeholder="<html>...</html> — rich editor placeholder"
                />
              </div>
              {/* Variables list */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Available Variables
                </Label>
                <div className="rounded-lg border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground space-y-1.5">
                  <div>
                    <span className="font-mono font-medium">{`{{ user_name }}`}</span> — Recipient name
                  </div>
                  <div>
                    <span className="font-mono font-medium">{`{{ business_name }}`}</span> — Client business
                  </div>
                  <div>
                    <span className="font-mono font-medium">{`{{ action_url }}`}</span> — Primary CTA link
                  </div>
                  <div>
                    <span className="font-mono font-medium">{`{{ support_email }}`}</span> — Support contact
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <Button variant="outline" size="sm" className="h-8 text-xs">
                Send Test Email
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  View Versions
                </Button>
                <Button size="sm" className="h-8 text-xs gap-1.5">
                  Save Template
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

