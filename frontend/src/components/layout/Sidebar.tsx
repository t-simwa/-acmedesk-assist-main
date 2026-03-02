/**
 * Sidebar — Client Dashboard Navigation
 *
 * Spec 7.1.1: Fixed left, 240px expanded / 64px collapsed
 * Background #0D1117 | Border 1px solid rgba(255,255,255,0.08) | Z-index 50
 * Collapse state persisted to localStorage key "nexachat-sidebar-collapsed"
 */

import { useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import {
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  UserCheck,
  CalendarCheck,
  BarChart3,
  BookOpen,
  Bot,
  Radio,
  Megaphone,
  Settings,
  Download,
  ExternalLink,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  User,
  CreditCard,
  Newspaper,
  MessageCircle,
  LogOut,
  Plus,
  Zap,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  /** "unread" = blue #4F8EF7 | "newLeads" = blue #4F8EF7 | "urgent" = red #EF4444 */
  badge?: "unread" | "newLeads" | "urgent";
  external?: boolean;
}

interface NavSection {
  section: string;
  items: NavItem[];
}

// ─── Navigation Configuration (matches spec exactly) ────────────────────────────

const CLIENT_NAV: NavSection[] = [
  {
    section: "MAIN",
    items: [
      { label: "Overview", icon: LayoutDashboard, path: "/dashboard" },
      { label: "Inbox", icon: MessageSquare, path: "/dashboard/inbox", badge: "unread" },
      { label: "Conversations", icon: MessagesSquare, path: "/dashboard/conversations" },
      { label: "Leads", icon: UserCheck, path: "/dashboard/leads", badge: "newLeads" },
      { label: "Bookings", icon: CalendarCheck, path: "/dashboard/bookings" },
    ],
  },
  {
    section: "INTELLIGENCE",
    items: [
      { label: "Analytics", icon: BarChart3, path: "/dashboard/analytics" },
      { label: "Knowledge Base", icon: BookOpen, path: "/dashboard/documents" },
    ],
  },
  {
    section: "CONFIGURATION",
    items: [
      { label: "Chatbot", icon: Bot, path: "/dashboard/chatbot" },
      { label: "Channels", icon: Radio, path: "/dashboard/channels" },
      { label: "Campaigns", icon: Megaphone, path: "/dashboard/campaigns" },
      { label: "Settings", icon: Settings, path: "/dashboard/settings" },
    ],
  },
  {
    section: "RESOURCES",
    items: [
      { label: "Install Guide", icon: Download, path: "/dashboard/install" },
      { label: "Documentation", icon: ExternalLink, path: "/docs", external: true },
      { label: "Support", icon: HelpCircle, path: "/dashboard/support" },
    ],
  },
];

const AGENT_NAV: NavSection[] = [
  {
    section: "WORK",
    items: [
      { label: "Inbox", icon: MessageSquare, path: "/dashboard/inbox", badge: "unread" },
      { label: "Conversations", icon: MessagesSquare, path: "/dashboard/conversations" },
      { label: "Leads", icon: UserCheck, path: "/dashboard/leads", badge: "newLeads" },
      { label: "Bookings", icon: CalendarCheck, path: "/dashboard/bookings" },
    ],
  },
  {
    section: "RESOURCES",
    items: [{ label: "Support", icon: HelpCircle, path: "/dashboard/support" }],
  },
];

// ─── Mock usage data (wire to backend API later) ─────────────────────────────

const MOCK_USAGE = { current: 412, limit: 500 };

// ─── Design tokens ────────────────────────────────────────────────────────────

const SIDEBAR_BG =
  "radial-gradient(ellipse 140% 30% at 50% 0%, rgba(79,142,247,0.07) 0%, transparent 70%), #0D1117";
const ACCENT = "#4F8EF7";
const ACCENT_ALT = "#7C3AED";
const ACTIVE_BG = "linear-gradient(90deg, rgba(79,142,247,0.18) 0%, rgba(79,142,247,0.05) 100%)";

// ─── Logo mark ────────────────────────────────────────────────────────────────

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <div
      className="sidebar-logo-mark flex items-center justify-center rounded-lg flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_ALT} 100%)`,
      }}
    >
      <Zap size={Math.round(size * 0.55)} className="text-white" strokeWidth={2.5} />
    </div>
  );
}

// ─── Sidebar Header ───────────────────────────────────────────────────────────

function SidebarHeader({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <div
      className="flex items-center flex-shrink-0"
      style={{
        height: 64,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: isCollapsed ? "0 18px" : "0 16px",
        minWidth: 0,
      }}
    >
      {isCollapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to="/dashboard">
              <LogoMark size={28} />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">NexaChat</TooltipContent>
        </Tooltip>
      ) : (
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 min-w-0 focus:outline-none"
        >
          <LogoMark size={28} />
          <span
            className="font-bold text-[16px] truncate"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_ALT} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            NexaChat
          </span>
        </Link>
      )}
    </div>
  );
}

// ─── Business Selector ────────────────────────────────────────────────────────

function BusinessSelector({ isCollapsed }: { isCollapsed: boolean }) {
  const [open, setOpen] = useState(false);

  const initials = "SC";
  const name = "Simca Cleaning";
  const plan = "Growth";

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex justify-center items-center cursor-pointer rounded-lg mx-auto"
            style={{ height: 44, width: 40, margin: "6px auto" }}
          >
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_ALT})` }}
            >
              {initials}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-xs">{name}</span>
            <span className="text-[10px] text-muted-foreground">{plan} Plan · Live</span>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2.5 rounded-lg text-left focus:outline-none transition-colors duration-150"
          style={{
            margin: "6px 8px",
            width: "calc(100% - 16px)",
            padding: "8px 10px",
            background: open ? "rgba(255,255,255,0.06)" : "transparent",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = open
              ? "rgba(255,255,255,0.06)"
              : "transparent")
          }
        >
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_ALT})` }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-[13px] font-semibold truncate"
              style={{ color: "#F9FAFB" }}
            >
              {name}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                style={{ background: `rgba(79,142,247,0.15)`, color: ACCENT }}
              >
                {plan}
              </span>
              <span className="flex items-center gap-1 text-[10px]" style={{ color: "#9CA3AF" }}>
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "#10B981" }}
                />
                Live
              </span>
            </div>
          </div>
          <ChevronDown
            size={14}
            style={{
              color: "#6B7280",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 200ms ease",
              flexShrink: 0,
            }}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56"
        style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        <div
          className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "#6B7280" }}
        >
          Your Chatbots
        </div>
        <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.08)" }} />
        <DropdownMenuItem
          className="flex items-center gap-2.5 cursor-pointer rounded-md"
          style={{ color: "#F9FAFB" }}
        >
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_ALT})` }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium truncate">{name}</div>
            <div className="text-[10px]" style={{ color: "#6B7280" }}>
              {plan} · Live
            </div>
          </div>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />
        </DropdownMenuItem>
        <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.08)" }} />
        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer rounded-md"
          style={{ color: "#9CA3AF" }}
        >
          <Plus size={14} />
          <span className="text-[13px]">Add New Chatbot</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Nav Item ─────────────────────────────────────────────────────────────────

function NavItemRow({
  item,
  isActive,
  isCollapsed,
  badgeCount,
  index = 0,
}: {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  badgeCount: number;
  index?: number;
}) {
  const badgeBg = item.badge === "urgent" ? "#EF4444" : ACCENT;

  const sharedStyle: React.CSSProperties = {
    height: 40,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    position: "relative",
    textDecoration: "none",
    transition: "background 150ms ease",
    animationDelay: `${index * 28}ms`,
    ...(isActive ? { background: ACTIVE_BG } : {}),
  };

  const expandedStyle: React.CSSProperties = {
    ...sharedStyle,
    padding: "0 12px 0 16px",
    margin: "2px 8px",
    width: "calc(100% - 16px)",
    gap: 12,
  };

  const collapsedStyle: React.CSSProperties = {
    ...sharedStyle,
    padding: 0,
    margin: "2px auto",
    width: 40,
    justifyContent: "center",
  };

  // Gradient active indicator (replaces plain left border)
  const activeIndicator = isActive && !isCollapsed ? (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        top: 6,
        bottom: 6,
        width: 3,
        borderRadius: "0 2px 2px 0",
        background: `linear-gradient(to bottom, ${ACCENT}, ${ACCENT_ALT})`,
      }}
    />
  ) : null;

  const iconEl = (
    <item.icon
      size={18}
      className="sidebar-icon"
      style={{
        color: isActive ? ACCENT : "#6B7280",
        flexShrink: 0,
      }}
      aria-hidden="true"
    />
  );

  const badgeEl = badgeCount > 0 ? (
    <span
      style={{
        background: badgeBg,
        color: "#FFFFFF",
        fontSize: 10,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 700,
        height: 18,
        minWidth: 18,
        borderRadius: 9999,
        padding: "0 5px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {badgeCount}
    </span>
  ) : null;

  const collapsedBadgeEl = badgeCount > 0 ? (
    <span
      style={{
        position: "absolute",
        top: 3,
        right: 3,
        background: badgeBg,
        color: "#FFFFFF",
        fontSize: 9,
        fontWeight: 700,
        height: 14,
        minWidth: 14,
        borderRadius: 9999,
        padding: "0 3px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {badgeCount}
    </span>
  ) : null;

  const hoverHandlers = !isActive
    ? {
        onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
        },
        onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
        },
      }
    : {};

  if (item.external) {
    const el = (
      <a
        href={item.path}
        target="_blank"
        rel="noopener noreferrer"
        className="sidebar-nav-item"
        style={isCollapsed ? collapsedStyle : expandedStyle}
        {...hoverHandlers}
      >
        {activeIndicator}
        {iconEl}
        {!isCollapsed && (
          <>
            <span
              className="flex-1 text-[14px] truncate"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#F9FAFB" : "#9CA3AF",
              }}
            >
              {item.label}
            </span>
            {badgeEl}
          </>
        )}
        {isCollapsed && collapsedBadgeEl}
      </a>
    );
    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{el}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }
    return el;
  }

  const el = (
    <Link
      to={item.path}
      className="sidebar-nav-item"
      style={isCollapsed ? collapsedStyle : expandedStyle}
      {...hoverHandlers}
    >
      {activeIndicator}
      {iconEl}
      {!isCollapsed && (
        <>
          <span
            className="flex-1 text-[14px] truncate"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: isActive ? 600 : 500,
              color: isActive ? "#F9FAFB" : "#9CA3AF",
            }}
          >
            {item.label}
          </span>
          {badgeEl}
        </>
      )}
      {isCollapsed && collapsedBadgeEl}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{el}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }
  return el;
}

// ─── Section Label ─────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 16px",
        marginBottom: 4,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#4B5563",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        style={{
          flex: 1,
          height: 1,
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.07) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}

// ─── Usage Bar ────────────────────────────────────────────────────────────────

function UsageBar({ isCollapsed }: { isCollapsed: boolean }) {
  const { current, limit } = MOCK_USAGE;
  const pct = Math.round((current / limit) * 100);

  if (pct <= 70) return null;

  const barColor =
    pct >= 95
      ? "#EF4444"
      : pct >= 80
      ? "#F59E0B"
      : ACCENT;

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-center py-2">
            <div
              style={{
                width: 28,
                height: 4,
                borderRadius: 9999,
                background: "rgba(255,255,255,0.1)",
                overflow: "hidden",
              }}
            >
              <div
                className="sidebar-usage-fill"
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  borderRadius: 9999,
                  background: barColor,
                }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          {current}/{limit} conversations ({pct}%)
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div
      style={{
        margin: "0 12px 8px",
        padding: "10px 12px",
        borderRadius: 8,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-[11px]"
          style={{ color: "#9CA3AF", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Conversations
        </span>
        <span
          className="text-[11px] font-semibold"
          style={{ color: "#F9FAFB", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {current}/{limit}
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 9999,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
          marginBottom: 8,
        }}
      >
        <div
          className="sidebar-usage-fill"
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 9999,
            background:
              pct >= 95
                ? "linear-gradient(90deg, #F59E0B, #EF4444)"
                : pct >= 80
                ? "linear-gradient(90deg, #4F8EF7, #F59E0B)"
                : `linear-gradient(90deg, ${ACCENT}, ${ACCENT_ALT})`,
          }}
        />
      </div>
      <span
        className="text-[11px]"
        style={{ color: pct >= 95 ? "#EF4444" : "#9CA3AF" }}
      >
        {pct >= 95
          ? "⚠ Upgrade Now to avoid service interruption"
          : "⚠ Upgrade to avoid limit"}
      </span>
    </div>
  );
}

// ─── User Block ───────────────────────────────────────────────────────────────

function UserBlock({
  isCollapsed,
  onLogout,
}: {
  isCollapsed: boolean;
  onLogout: () => void;
}) {
  const { user } = useAuth();
  const { isOwner, isAdmin: isAdminRole, isAgent: isAgentRole } = useRole();
  const navigate = useNavigate();

  if (!user) return null;

  const initials = (() => {
    const name = user.name;
    if (name) {
      const parts = name.trim().split(" ");
      return parts.length >= 2
        ? `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  })();

  const planLabel = isOwner
    ? "Growth Plan"
    : isAdminRole
    ? "Admin"
    : isAgentRole
    ? "Agent"
    : "Starter Plan";

  const avatar = (
    <Avatar className="flex-shrink-0" style={{ width: 32, height: 32 }}>
      <AvatarImage src={undefined} />
      <AvatarFallback
        className="text-[12px] font-semibold text-white"
        style={{
          background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_ALT})`,
          fontSize: 12,
        }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  const menuItems = (
    <DropdownMenuContent
      align={isCollapsed ? "end" : "end"}
      side={isCollapsed ? "right" : "top"}
      className="w-52"
      style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.12)" }}
    >
      <div className="px-3 py-2">
        <div className="text-[13px] font-semibold" style={{ color: "#F9FAFB" }}>
          {user.name || "User"}
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: "#6B7280" }}>
          {user.email}
        </div>
        <span
          className="inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded"
          style={{ background: "rgba(79,142,247,0.15)", color: ACCENT }}
        >
          {planLabel}
        </span>
      </div>
      <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.08)" }} />
      <DropdownMenuItem
        className="cursor-pointer text-[13px]"
        style={{ color: "#9CA3AF" }}
        onClick={() => navigate("/dashboard/profile")}
      >
        <User size={14} className="mr-2" /> View Profile
      </DropdownMenuItem>
      <DropdownMenuItem
        className="cursor-pointer text-[13px]"
        style={{ color: "#9CA3AF" }}
        onClick={() => navigate("/dashboard/settings")}
      >
        <Settings size={14} className="mr-2" /> Account Settings
      </DropdownMenuItem>
      <DropdownMenuItem
        className="cursor-pointer text-[13px]"
        style={{ color: "#9CA3AF" }}
        onClick={() => navigate("/dashboard/settings/billing")}
      >
        <CreditCard size={14} className="mr-2" /> Billing
      </DropdownMenuItem>
      <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.08)" }} />
      <DropdownMenuItem className="cursor-pointer text-[13px]" style={{ color: "#9CA3AF" }}>
        <Newspaper size={14} className="mr-2" /> What&apos;s New
      </DropdownMenuItem>
      <DropdownMenuItem
        className="cursor-pointer text-[13px]"
        style={{ color: "#9CA3AF" }}
        onClick={() => navigate("/dashboard/support")}
      >
        <HelpCircle size={14} className="mr-2" /> Help &amp; Documentation
      </DropdownMenuItem>
      <DropdownMenuItem className="cursor-pointer text-[13px]" style={{ color: "#9CA3AF" }}>
        <MessageCircle size={14} className="mr-2" /> Send Feedback
      </DropdownMenuItem>
      <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.08)" }} />
      <DropdownMenuItem
        className="cursor-pointer text-[13px]"
        style={{ color: "#EF4444" }}
        onClick={onLogout}
      >
        <LogOut size={14} className="mr-2" /> Sign Out
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  if (isCollapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center justify-center focus:outline-none"
            style={{ width: 40, height: 40 }}
            aria-label="User menu"
          >
            {avatar}
          </button>
        </DropdownMenuTrigger>
        {menuItems}
      </DropdownMenu>
    );
  }

  return (
    <div
      className="flex items-center gap-2.5 flex-shrink-0"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: "10px 12px",
      }}
    >
      {avatar}
      <div className="flex-1 min-w-0">
        <div
          className="text-[13px] font-semibold truncate"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#F9FAFB" }}
        >
          {user.name || "User"}
        </div>
        <div className="text-[11px] truncate" style={{ color: "#6B7280" }}>
          {user.email}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex-shrink-0 flex items-center justify-center rounded-md transition-colors duration-150 focus:outline-none"
            style={{ width: 28, height: 28, color: "#6B7280" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "transparent")
            }
            aria-label="User menu"
          >
            <MoreHorizontal size={16} />
          </button>
        </DropdownMenuTrigger>
        {menuItems}
      </DropdownMenu>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  /** When true: relative positioning, no collapse toggle, always expanded — for mobile drawer */
  mobile?: boolean;
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export function Sidebar({ isCollapsed, onToggle, mobile = false }: SidebarProps) {
  const collapsed = mobile ? false : isCollapsed;
  const location = useLocation();
  const { logout } = useAuth();
  const { isSuperAdmin, isAgent } = useRole();

  const navSections: NavSection[] = isSuperAdmin
    ? []
    : isAgent
    ? AGENT_NAV
    : CLIENT_NAV;

  // Precompute flat indices per item path for staggered entrance animation
  const navItemIndex = useMemo(() => {
    const map = new Map<string, number>();
    let i = 0;
    navSections.forEach((s) => s.items.forEach((item) => map.set(item.path, i++)));
    return map;
  }, [navSections]);

  const isPathActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    const adminEquiv = path.replace("/dashboard", "/admin");
    return (
      location.pathname.startsWith(path) ||
      location.pathname.startsWith(adminEquiv)
    );
  };

  const getBadgeCount = (badgeType?: "unread" | "newLeads" | "urgent") => {
    if (badgeType === "unread") return 3;
    if (badgeType === "newLeads") return 5;
    if (badgeType === "urgent") return 0;
    return 0;
  };

  return (
    <aside
      aria-label="Main navigation"
      style={
        mobile
          ? {
              position: "relative",
              width: "100%",
              background: SIDEBAR_BG,
              display: "flex",
              flexDirection: "column",
              flex: 1,
              overflow: "hidden",
            }
          : {
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: collapsed ? 64 : 240,
              background: SIDEBAR_BG,
              borderRight: "1px solid rgba(255,255,255,0.07)",
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              transition: "width 200ms cubic-bezier(0.4,0,0.2,1)",
              overflow: "hidden",
            }
      }
    >
      {/* 1. Header — 64px */}
      <SidebarHeader isCollapsed={collapsed} />

      {/* 2. Business Selector */}
      <BusinessSelector isCollapsed={collapsed} />

      {/* 3. Nav sections (scrollable middle area) */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        {collapsed ? (
          /* Collapsed: icons only, thin dividers between sections */
          <div style={{ paddingTop: 4, paddingBottom: 4 }}>
            {navSections.map((section, idx) => (
              <div key={section.section}>
                {idx > 0 && (
                  <div
                    style={{
                      height: 1,
                      margin: "6px 16px",
                      background:
                        "linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.08) 70%, transparent)",
                    }}
                  />
                )}
                {section.items.map((item) => (
                  <NavItemRow
                    key={item.path}
                    item={item}
                    isActive={isPathActive(item.path)}
                    isCollapsed={true}
                    badgeCount={getBadgeCount(item.badge)}
                    index={navItemIndex.get(item.path) ?? 0}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          /* Expanded: section labels + items */
          <div style={{ paddingTop: 4, paddingBottom: 4 }}>
            {navSections.map((section, idx) => (
              <div key={section.section} style={{ marginTop: idx > 0 ? 16 : 0 }}>
                <SectionLabel label={section.section} />
                {section.items.map((item) => (
                  <NavItemRow
                    key={item.path}
                    item={item}
                    isActive={isPathActive(item.path)}
                    isCollapsed={false}
                    badgeCount={getBadgeCount(item.badge)}
                    index={navItemIndex.get(item.path) ?? 0}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Usage Bar (visible only when >70%) */}
      <UsageBar isCollapsed={collapsed} />

      {/* 5. User Block */}
      <UserBlock isCollapsed={collapsed} onLogout={logout} />

      {/* 6. Collapse Toggle — hidden on mobile */}
      {!mobile && (
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            padding: "6px 8px 8px",
            display: "flex",
            justifyContent: collapsed ? "center" : "flex-end",
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggle}
                className="flex items-center justify-center rounded-md transition-colors duration-150 focus:outline-none"
                style={{
                  width: collapsed ? 40 : "auto",
                  height: 32,
                  padding: collapsed ? 0 : "0 10px",
                  color: "#6B7280",
                  gap: 6,
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.06)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = "transparent")
                }
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <ChevronRight size={16} />
                ) : (
                  <>
                    <ChevronLeft size={14} />
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}
                    >
                      Collapse
                    </span>
                  </>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side={collapsed ? "right" : "top"}>
              {collapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </aside>
  );
}
