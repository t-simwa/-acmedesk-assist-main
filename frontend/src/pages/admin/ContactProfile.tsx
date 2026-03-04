import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Mail, Phone, Building2, Tag, Calendar,
  MessageSquare, CalendarCheck, Globe, Edit, Star, User,
  Instagram, Clock, Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useContactDetail } from "@/hooks/useContacts";
import { type ContactDetailResponse } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CHANNEL_META, ChannelIcon } from "@/lib/channelMeta";

/* ═══════════════════════════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════════════════════════ */

const MOCK_CONTACT_DETAIL: ContactDetailResponse = {
  contact: {
    id: "c1",
    tenant_id: "t1",
    full_name: "Sarah Johnson",
    email: "sarah@acme.com",
    phone: "+1 555 0101",
    instagram_handle: "@sarah.j",
    company: "Acme Corp",
    channels_used: ["web", "email", "whatsapp"],
    first_seen_channel: "web",
    first_seen_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    last_active_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    lead_status: "qualified",
    lead_score: "high",
    tags: ["enterprise", "pricing", "demo-requested"],
    notes:
      "Very interested in Pro plan. Discussed pricing in detail. Follow up by Friday. Has a team of 25 people.",
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  conversations_count: 5,
  bookings_count: 2,
};

/* ═══════════════════════════════════════════════════════════════════════════════
   CONSTANTS & STYLE MAPS
   ═══════════════════════════════════════════════════════════════════════════════ */

const STATUS_META: Record<string, { dot: string; badge: string; label: string }> = {
  new:       { dot: "bg-amber-400",   badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",       label: "New" },
  contacted: { dot: "bg-violet-400",  badge: "bg-violet-500/10 text-violet-400 border-violet-500/20",   label: "Contacted" },
  qualified: { dot: "bg-blue-400",    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",         label: "Qualified" },
  converted: { dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Converted" },
  lost:      { dot: "bg-gray-400",    badge: "bg-gray-500/10 text-gray-400 border-gray-500/20",         label: "Lost" },
};

const SCORE_META: Record<string, { badge: string; label: string }> = {
  high:   { badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "High" },
  medium: { badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",      label: "Medium" },
  low:    { badge: "bg-gray-500/10 text-gray-400 border-gray-500/20",          label: "Low" },
};

/* ═══════════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(iso: string | null): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relativeTime(iso: string | null): string {
  if (!iso) return "--";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ATOMIC COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */

function ContactAvatar({ name, size = "lg" }: { name: string | null; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
    xl: "h-20 w-20 text-2xl",
  };
  return (
    <div
      className={cn(
        sizes[size],
        "rounded-full bg-gradient-to-br from-primary/80 to-violet-600/80",
        "flex items-center justify-center font-bold text-white",
        "ring-2 ring-background shrink-0 select-none tracking-wide font-heading",
      )}
    >
      {getInitials(name)}
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const meta = STATUS_META[status] ?? STATUS_META.new;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
        "text-[11px] font-semibold font-heading tracking-wide",
        meta.badge,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

function ScoreBadge({ score }: { score: string | null }) {
  if (!score) return null;
  const meta = SCORE_META[score] ?? SCORE_META.low;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
        "text-[11px] font-semibold font-mono tracking-wide",
        meta.badge,
      )}
    >
      <Star size={10} className="shrink-0" />
      {meta.label}
    </span>
  );
}

function ChannelPill({ channel }: { channel: string }) {
  const meta = CHANNEL_META[channel] ?? CHANNEL_META.web;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5",
        "text-[11px] font-medium",
        meta.className,
      )}
    >
      <ChannelIcon channel={channel} size={10} />
      {meta.label}
    </span>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-0.5">
          {label}
        </p>
        <p
          className={cn(
            "text-sm text-foreground truncate",
            mono && "font-mono text-[13px]",
            !value && "text-muted-foreground/50 italic",
          )}
        >
          {value || "Not provided"}
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-4",
        "transition-all duration-200 hover:border-primary/20 hover:shadow-soft-sm group",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          accent,
        )}
      />
      <div className="relative">
        <div className="text-muted-foreground mb-2">{icon}</div>
        <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
          {label}
        </p>
        <p className="text-xl font-bold font-mono tracking-tight text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════════════════════════════════════════ */

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1200px] mx-auto w-full">
      {/* Back link */}
      <Skeleton className="h-4 w-36" />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-3">
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
        <div className="lg:col-span-2 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom placeholder */}
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function ContactProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useContactDetail(id ?? null);

  // Fall back to mock data when API is unavailable
  const detail = data ?? (id === "c1" || !data ? MOCK_CONTACT_DETAIL : null);

  /* ── Loading state ───────────────────────────────────────────────────────── */

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <User size={24} className="text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground font-medium font-heading">
          Contact not found
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/dashboard/contacts")}
          className="gap-1.5 text-xs"
        >
          <ArrowLeft size={13} />
          Back to Contacts
        </Button>
      </div>
    );
  }

  const { contact, conversations_count, bookings_count } = detail;
  const displayName = contact.full_name || "Unknown Contact";
  const channelsUsed = contact.channels_used ?? [];
  const tags = contact.tags ?? [];

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1200px] mx-auto w-full">

      {/* ─── Back Link ──────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate("/dashboard/contacts")}
        className={cn(
          "inline-flex items-center gap-1.5 text-sm text-muted-foreground",
          "hover:text-foreground transition-colors w-fit group",
        )}
      >
        <ArrowLeft
          size={14}
          className="transition-transform group-hover:-translate-x-0.5"
        />
        <span className="font-medium font-description">Back to Contacts</span>
      </button>

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <ContactAvatar name={contact.full_name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none truncate">
            {displayName}
          </h1>
          {contact.company && (
            <p className="text-sm text-muted-foreground mt-1 font-description flex items-center gap-1.5">
              <Building2 size={13} className="shrink-0" />
              {contact.company}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <StatusBadge status={contact.lead_status} />
            <ScoreBadge score={contact.lead_score} />
          </div>
        </div>
      </div>

      {/* ─── Two Column Layout ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── LEFT: Contact Information (60%) ─────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border bg-card overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
              <h2 className="text-sm font-semibold font-heading text-foreground tracking-tight">
                Contact Information
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
              >
                <Edit size={12} />
                Edit
              </Button>
            </div>

            {/* Info fields */}
            <div className="px-5 py-2 divide-y divide-border/50">
              <InfoRow
                icon={<User size={14} />}
                label="Full Name"
                value={contact.full_name}
              />
              <InfoRow
                icon={<Mail size={14} />}
                label="Email"
                value={contact.email}
              />
              <InfoRow
                icon={<Phone size={14} />}
                label="Phone"
                value={contact.phone}
                mono
              />
              <InfoRow
                icon={<Instagram size={14} />}
                label="Instagram"
                value={contact.instagram_handle}
              />
              <InfoRow
                icon={<Building2 size={14} />}
                label="Company"
                value={contact.company}
              />

              {/* Tags */}
              <div className="flex items-start gap-3 py-2.5">
                <span className="text-muted-foreground mt-0.5 shrink-0">
                  <Tag size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1.5">
                    Tags
                  </p>
                  {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5",
                            "text-[11px] font-medium",
                            "bg-primary/5 text-primary/80 border-primary/15",
                          )}
                        >
                          <Hash size={9} className="shrink-0 opacity-60" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground/50 italic">
                      No tags
                    </p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="flex items-start gap-3 py-2.5">
                <span className="text-muted-foreground mt-0.5 shrink-0">
                  <MessageSquare size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
                    Notes
                  </p>
                  {contact.notes ? (
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-description">
                      {contact.notes}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground/50 italic">
                      No notes
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Activity Summary (40%) ───────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard
              icon={<MessageSquare size={18} />}
              label="Conversations"
              value={conversations_count}
              accent="from-blue-500/20 to-blue-500/0"
            />
            <SummaryCard
              icon={<CalendarCheck size={18} />}
              label="Bookings"
              value={bookings_count}
              accent="from-emerald-500/20 to-emerald-500/0"
            />
          </div>

          {/* Channels used */}
          <div className="rounded-xl border bg-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-3">
              Channels Used
            </p>
            {channelsUsed.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {channelsUsed.map((ch) => (
                  <ChannelPill key={ch} channel={ch} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/50 italic">None</p>
            )}
          </div>

          {/* Timestamps */}
          <div className="rounded-xl border bg-card overflow-hidden divide-y divide-border/50">
            <div className="flex items-center gap-3 px-4 py-3">
              <Globe size={14} className="text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                  First Seen
                </p>
                <p className="text-sm text-foreground font-mono mt-0.5">
                  {formatDate(contact.first_seen_at)}
                </p>
                {contact.first_seen_channel && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    via{" "}
                    <span className="capitalize font-medium">
                      {contact.first_seen_channel}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <Clock size={14} className="text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                  Last Active
                </p>
                <p className="text-sm text-foreground font-mono mt-0.5">
                  {relativeTime(contact.last_active_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <Calendar size={14} className="text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                  Created
                </p>
                <p className="text-sm text-foreground font-mono mt-0.5">
                  {formatDate(contact.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom: Conversation History Placeholder ───────────────────────── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b bg-muted/30">
          <h2 className="text-sm font-semibold font-heading text-foreground tracking-tight">
            Conversation History
          </h2>
        </div>
        <div className="py-12 flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <MessageSquare size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground font-medium font-heading">
            Conversation history coming soon
          </p>
          <p className="text-xs text-muted-foreground/60 font-description max-w-sm text-center">
            A chronological list of all conversations with this contact will
            appear here in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}
