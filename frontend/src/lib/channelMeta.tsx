import type { ReactNode } from "react";
import { FaWhatsapp, FaInstagram, FaFacebookMessenger, FaEnvelope, FaGlobe } from "react-icons/fa";
import { BsChatDotsFill } from "react-icons/bs";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   CHANNEL METADATA — Single source of truth
   ═══════════════════════════════════════════════════════════════════════════════
   Replaces the duplicated CHANNEL_META objects across omnichannel pages.
   Uses real brand icons from react-icons instead of emoji characters.
   ═══════════════════════════════════════════════════════════════════════════════ */

export interface ChannelMeta {
  /** React element — brand icon from react-icons */
  icon: ReactNode;
  /** Human-readable label */
  label: string;
  /** Tailwind classes for badge/pill styling (bg, text, border) */
  className: string;
  /** Gradient classes for card accent strips & icon backgrounds */
  gradient: string;
  /** Inline brand color for the icon (applied via style.color) */
  brandColor: string;
}

/**
 * Canonical channel metadata map.
 *
 * Icon sizes are intentionally omitted here — the consuming component controls
 * size via the wrapper's `font-size` or explicit `size` prop on `<ChannelIcon>`.
 * The icons below render at "1em" by default (react-icons convention).
 */
export const CHANNEL_META: Record<string, ChannelMeta> = {
  web: {
    icon: <FaGlobe />,
    label: "Web",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    gradient: "from-blue-500/20 to-blue-500/5",
    brandColor: "#3B82F6",
  },
  whatsapp: {
    icon: <FaWhatsapp />,
    label: "WhatsApp",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    gradient: "from-emerald-500/20 to-emerald-500/5",
    brandColor: "#25D366",
  },
  instagram: {
    icon: <FaInstagram />,
    label: "Instagram",
    className: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    gradient: "from-pink-500/20 to-pink-500/5",
    brandColor: "#E4405F",
  },
  facebook: {
    icon: <FaFacebookMessenger />,
    label: "Facebook",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    gradient: "from-blue-500/20 to-blue-500/5",
    brandColor: "#0084FF",
  },
  messenger: {
    icon: <FaFacebookMessenger />,
    label: "Messenger",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    gradient: "from-blue-500/20 to-blue-500/5",
    brandColor: "#0084FF",
  },
  email: {
    icon: <FaEnvelope />,
    label: "Email",
    className: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    gradient: "from-violet-500/20 to-violet-500/5",
    brandColor: "#8B5CF6",
  },
  sms: {
    icon: <BsChatDotsFill />,
    label: "SMS",
    className: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    gradient: "from-pink-500/20 to-pink-500/5",
    brandColor: "#EC4899",
  },
};

/** All channel keys (excluding aliases like "messenger") used in most pages */
export const CHANNEL_KEYS = ["web", "whatsapp", "instagram", "facebook", "email", "sms"] as const;

/** Channel keys used by Campaigns (no "web") */
export const CAMPAIGN_CHANNEL_KEYS = ["whatsapp", "instagram", "facebook", "email", "sms"] as const;

export type ChannelKey = (typeof CHANNEL_KEYS)[number];

/* ─────────────────────────────────────────────────────────────────────────────
   Helper components
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Renders a channel's brand icon at the specified size with its brand color.
 * Designed as a drop-in replacement for emoji `<span>` wrappers.
 */
export function ChannelIcon({
  channel,
  size = 14,
  className,
}: {
  channel: string;
  size?: number;
  className?: string;
}) {
  const meta = CHANNEL_META[channel] ?? CHANNEL_META.web;
  return (
    <span
      className={cn("inline-flex items-center justify-center shrink-0 leading-none", className)}
      style={{ color: meta.brandColor, fontSize: size }}
      aria-hidden
    >
      {meta.icon}
    </span>
  );
}

/**
 * Channel badge / pill — unified component used across all omnichannel pages.
 * Renders the brand icon + label inside a styled pill.
 */
export function ChannelPill({
  channel,
  showLabel = true,
  size = "md",
}: {
  channel: string | null;
  showLabel?: boolean;
  size?: "sm" | "md";
}) {
  if (!channel) return <span className="text-muted-foreground text-xs">--</span>;
  const meta = CHANNEL_META[channel] ?? CHANNEL_META.web;
  const iconSize = size === "sm" ? 10 : 12;
  const textSize = size === "sm" ? "text-[10px]" : "text-[11px]";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5",
        textSize,
        "font-medium",
        meta.className,
      )}
    >
      <ChannelIcon channel={channel} size={iconSize} />
      {showLabel && <span className="hidden sm:inline">{meta.label}</span>}
    </span>
  );
}
