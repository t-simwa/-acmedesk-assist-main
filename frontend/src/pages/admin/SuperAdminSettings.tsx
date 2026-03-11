import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { adminApi, type Announcement, type ApiError } from "@/lib/api";

export default function SuperAdminSettings() {
  const queryClient = useQueryClient();

  const [annType, setAnnType] = useState<string>("info");
  const [annStart, setAnnStart] = useState<string | undefined>(undefined);
  const [annEnd, setAnnEnd] = useState<string | undefined>(undefined);
  const [annMessage, setAnnMessage] = useState<string>("");

  const { data: announcement } = useQuery<Announcement, ApiError>({
    queryKey: ["admin","announcement"],
    queryFn: () => adminApi.getAnnouncement(),
    onSuccess: (a) => {
      setAnnType(a.type);
      setAnnStart(a.start_date);
      setAnnEnd(a.end_date);
      setAnnMessage(a.message);
    },
    enabled: true,
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Announcement) => adminApi.updateAnnouncement(payload),
    onSuccess: (newAnn) => {
      queryClient.setQueryData(["admin","announcement"], newAnn);
    },
  });

  const saveAnnouncement = () => {
    updateMutation.mutate({
      id: announcement?.id || "",
      type: annType,
      message: annMessage,
      start_date: annStart,
      end_date: annEnd,
    });
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            System Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Global models, rate limits, feature flags, plan pricing, and the announcement banner for all tenants.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Models & embeddings */}
        <Card className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
            <CardTitle className="text-sm sm:text-base font-semibold font-heading text-foreground">
              Models & Embeddings
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 py-5 sm:py-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Default Chat Model
              </Label>
              <Select defaultValue="gpt-4o">
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Default Embedding Model
              </Label>
              <Select defaultValue="text-embedding-3-large">
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select embedding model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
                  <SelectItem value="text-embedding-3-small">text-embedding-3-small</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Rate limits per plan */}
        <Card className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
            <CardTitle className="text-sm sm:text-base font-semibold font-heading text-foreground">
              Rate Limits per Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 py-5 sm:py-6 space-y-3">
            {["Starter", "Growth", "Pro"].map((plan) => (
              <div key={plan} className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {plan} — Monthly Conversation Limit
                </Label>
                <Input
                  type="number"
                  className="h-9 text-xs"
                  placeholder="e.g. 3,000"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Feature flags */}
        <Card className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
            <CardTitle className="text-sm sm:text-base font-semibold font-heading text-foreground">
              Feature Flags
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 py-5 sm:py-6 space-y-3">
            {[
              "Enable Omnichannel Inbox",
              "Enable Campaigns",
              "Enable Test Console",
              "Enable Referral Program",
            ].map((label) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">{label}</span>
                <Switch />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Plan pricing & promo codes */}
        <Card className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
            <CardTitle className="text-sm sm:text-base font-semibold font-heading text-foreground">
              Plan Pricing & Promo Codes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 py-5 sm:py-6 space-y-4">
            {["Starter", "Growth", "Pro"].map((plan) => (
              <div key={plan} className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {plan} — Monthly Price (USD)
                </Label>
                <Input
                  type="number"
                  className="h-9 text-xs"
                  placeholder="e.g. 99"
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Create Promotional Code
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input className="h-9 text-xs" placeholder="CODE2026" />
                <Input className="h-9 text-xs" type="number" placeholder="Discount %" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Announcement banner */}
      <Card className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
        <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
          <CardTitle className="text-sm sm:text-base font-semibold font-heading text-foreground">
            Announcement Banner
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 py-5 sm:py-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Type
              </Label>
              <Select value={annType} onValueChange={(v) => setAnnType(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Start Date
              </Label>
              <Input
                type="date"
                value={annStart || ""}
                onChange={(e) => setAnnStart(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                End Date
              </Label>
              <Input
                type="date"
                value={annEnd || ""}
                onChange={(e) => setAnnEnd(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Message
            </Label>
            <Input
              className="h-10 text-xs"
              placeholder="Short announcement message shown in all client dashboards"
              value={annMessage}
              onChange={(e) => setAnnMessage(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                if (announcement) {
                  setAnnType(announcement.type);
                  setAnnStart(announcement.start_date);
                  setAnnEnd(announcement.end_date);
                  setAnnMessage(announcement.message);
                }
              }}
            >
              Reset
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={saveAnnouncement}
              disabled={updateMutation.isLoading}
            >
              {updateMutation.isLoading ? "Saving…" : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

