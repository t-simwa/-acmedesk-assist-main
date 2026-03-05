/**
 * Sidebar — Client Dashboard Navigation
 *
 * Spec 7.1.1: Fixed left, 240px expanded / 64px collapsed
 * Uses Tailwind design tokens from tailwind.config.ts / index.css
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
  Plug,
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
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  /** "unread" = primary badge | "newLeads" = primary badge | "urgent" = destructive badge */
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
      { label: "Integrations", icon: Plug, path: "/dashboard/integrations" },
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
      { label: "Help Center", icon: HelpCircle, path: "/dashboard/help" },
      { label: "Support", icon: MessageCircle, path: "/dashboard/support" },
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

const SUPER_ADMIN_NAV: NavSection[] = [
  {
    section: "PLATFORM",
    items: [
      { label: "Overview", icon: LayoutDashboard, path: "/admin" },
      { label: "Clients", icon: UserCheck, path: "/admin/clients" },
    ],
  },
  {
    section: "REVENUE",
    items: [
      { label: "Analytics", icon: BarChart3, path: "/admin/analytics" },
    ],
  },
  {
    section: "SYSTEM",
    items: [
      { label: "Settings", icon: Settings, path: "/admin/settings" },
      { label: "Email Templates", icon: Megaphone, path: "/admin/emails" },
    ],
  },
];

// ─── Mock usage data (wire to backend API later) ─────────────────────────────

const MOCK_USAGE = { current: 412, limit: 500 };

// ─── Logo mark ────────────────────────────────────────────────────────────────

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <div
      className="sidebar-logo-mark flex items-center justify-center rounded-lg flex-shrink-0 bg-gradient-to-br from-primary to-purple-500"
      style={{ width: size, height: size }}
    >
      <Zap size={Math.round(size * 0.55)} className="text-white" strokeWidth={2.5} />
    </div>
  );
}

// ─── Sidebar Header ───────────────────────────────────────────────────────────

function SidebarHeader({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center flex-shrink-0 h-16 min-w-0 border-b border-sidebar-border",
        isCollapsed ? "px-[18px]" : "px-4"
      )}
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
          <span className="font-bold text-[15px] truncate font-heading bg-gradient-to-br from-primary to-purple-500 bg-clip-text text-transparent">
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
          <div className="flex justify-center items-center cursor-pointer rounded-lg h-11 w-10 mx-auto my-1.5">
            <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br from-primary to-purple-500">
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
          className={cn(
            "flex items-center gap-2.5 rounded-lg text-left focus:outline-none transition-colors duration-150 mx-2 my-1.5 w-[calc(100%-16px)] px-2.5 py-2",
            open ? "bg-white/[0.06]" : "hover:bg-white/[0.06]"
          )}
        >
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 bg-gradient-to-br from-primary to-purple-500">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold truncate text-sidebar-foreground">
              {name}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                {plan}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                Live
              </span>
            </div>
          </div>
          <ChevronDown
            size={14}
            className={cn(
              "text-gray-500 flex-shrink-0 transition-transform duration-200 ease-in-out",
              open && "rotate-180"
            )}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56 bg-popover border-border"
      >
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          Your Chatbots
        </div>
        <DropdownMenuSeparator className="bg-sidebar-border" />
        <DropdownMenuItem className="flex items-center gap-2.5 cursor-pointer rounded-md text-foreground">
          <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 bg-gradient-to-br from-primary to-purple-500">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium truncate">{name}</div>
            <div className="text-[10px] text-gray-500">
              {plan} · Live
            </div>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-sidebar-border" />
        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer rounded-md text-muted-foreground">
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
  const navClasses = cn(
    "sidebar-nav-item h-10 rounded-lg flex items-center relative no-underline transition-[background] duration-150",
    isCollapsed
      ? "p-0 mx-auto w-10 justify-center"
      : "pl-4 pr-3 mx-2 w-[calc(100%-16px)] gap-3",
    isActive
      ? "bg-sidebar-primary/10"
      : "hover:bg-white/5"
  );

  // Gradient active indicator (replaces plain left border)
  const activeIndicator = isActive && !isCollapsed ? (
    <span
      aria-hidden="true"
      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-sm bg-gradient-to-b from-primary to-purple-500"
    />
  ) : null;

  const iconEl = (
    <item.icon
      size={18}
      className={cn(
        "sidebar-icon flex-shrink-0",
        isActive ? "text-sidebar-primary" : "text-gray-500"
      )}
      aria-hidden="true"
    />
  );

  const badgeEl = badgeCount > 0 ? (
    <span
      className={cn(
        "text-[10px] font-heading font-bold h-[18px] min-w-[18px] rounded-full px-[5px] flex items-center justify-center flex-shrink-0 text-white",
        item.badge === "urgent" ? "bg-destructive" : "bg-sidebar-primary"
      )}
    >
      {badgeCount}
    </span>
  ) : null;

  const collapsedBadgeEl = badgeCount > 0 ? (
    <span
      className={cn(
        "absolute top-[3px] right-[3px] text-[9px] font-bold h-3.5 min-w-[14px] rounded-full px-[3px] flex items-center justify-center text-white",
        item.badge === "urgent" ? "bg-destructive" : "bg-sidebar-primary"
      )}
    >
      {badgeCount}
    </span>
  ) : null;

  const labelEl = !isCollapsed && (
    <>
      <span
        className={cn(
          "flex-1 text-[13px] truncate font-heading",
          isActive ? "font-semibold text-sidebar-foreground" : "font-medium text-muted-foreground"
        )}
      >
        {item.label}
      </span>
      {badgeEl}
    </>
  );

  if (item.external) {
    const el = (
      <a
        href={item.path}
        target="_blank"
        rel="noopener noreferrer"
        className={navClasses}
        style={{ animationDelay: `${index * 28}ms` }}
      >
        {activeIndicator}
        {iconEl}
        {labelEl}
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
      className={navClasses}
      style={{ animationDelay: `${index * 28}ms` }}
    >
      {activeIndicator}
      {iconEl}
      {labelEl}
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
    <div className="flex items-center gap-2 px-4 mb-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 font-heading flex-shrink-0">
        {label}
      </span>
      <span
        aria-hidden="true"
        className="flex-1 h-px bg-gradient-to-r from-white/[0.07] to-transparent"
      />
    </div>
  );
}

// ─── Usage Bar ────────────────────────────────────────────────────────────────

function UsageBar({ isCollapsed }: { isCollapsed: boolean }) {
  const { current, limit } = MOCK_USAGE;
  const pct = Math.round((current / limit) * 100);

  if (pct <= 70) return null;

  const barColorClass =
    pct >= 95
      ? "bg-destructive"
      : pct >= 80
      ? "bg-warning"
      : "bg-sidebar-primary";

  const gradientBarClass =
    pct >= 95
      ? "bg-gradient-to-r from-warning to-destructive"
      : pct >= 80
      ? "bg-gradient-to-r from-sidebar-primary to-warning"
      : "bg-gradient-to-r from-primary to-purple-500";

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-center py-2">
            <div className="w-7 h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className={cn("sidebar-usage-fill h-full rounded-full", barColorClass)}
                style={{ width: `${pct}%` }}
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
    <div className="mx-3 mb-2 p-2.5 px-3 rounded-lg bg-white/[0.04] border border-white/5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-muted-foreground font-heading">
          Conversations
        </span>
        <span className="text-[11px] font-semibold text-sidebar-foreground font-heading">
          {current}/{limit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-sidebar-border overflow-hidden mb-2">
        <div
          className={cn("sidebar-usage-fill h-full rounded-full", gradientBarClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          "text-[11px]",
          pct >= 95 ? "text-destructive" : "text-muted-foreground"
        )}
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
    <Avatar className="flex-shrink-0 w-8 h-8">
      <AvatarImage src={undefined} />
      <AvatarFallback className="text-[12px] font-semibold text-white bg-gradient-to-br from-primary to-purple-500">
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  const menuItems = (
    <DropdownMenuContent
      align="end"
      side={isCollapsed ? "right" : "top"}
      className="w-52 bg-popover border-border"
    >
      <div className="px-3 py-2">
        <div className="text-[13px] font-semibold text-foreground">
          {user.name || "User"}
        </div>
        <div className="text-[11px] mt-0.5 text-gray-500">
          {user.email}
        </div>
        <span className="inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/15 text-primary">
          {planLabel}
        </span>
      </div>
      <DropdownMenuSeparator className="bg-sidebar-border" />
      <DropdownMenuItem
        className="cursor-pointer text-[13px] text-muted-foreground"
        onClick={() => navigate("/dashboard/profile")}
      >
        <User size={14} className="mr-2" /> View Profile
      </DropdownMenuItem>
      <DropdownMenuItem
        className="cursor-pointer text-[13px] text-muted-foreground"
        onClick={() => navigate("/dashboard/settings")}
      >
        <Settings size={14} className="mr-2" /> Account Settings
      </DropdownMenuItem>
      <DropdownMenuItem
        className="cursor-pointer text-[13px] text-muted-foreground"
        onClick={() => navigate("/dashboard/settings/billing")}
      >
        <CreditCard size={14} className="mr-2" /> Billing
      </DropdownMenuItem>
      <DropdownMenuSeparator className="bg-sidebar-border" />
      <DropdownMenuItem className="cursor-pointer text-[13px] text-muted-foreground">
        <Newspaper size={14} className="mr-2" /> What&apos;s New
      </DropdownMenuItem>
      <DropdownMenuItem
        className="cursor-pointer text-[13px] text-muted-foreground"
        onClick={() => navigate("/dashboard/support")}
      >
        <HelpCircle size={14} className="mr-2" /> Help &amp; Documentation
      </DropdownMenuItem>
      <DropdownMenuItem className="cursor-pointer text-[13px] text-muted-foreground">
        <MessageCircle size={14} className="mr-2" /> Send Feedback
      </DropdownMenuItem>
      <DropdownMenuSeparator className="bg-sidebar-border" />
      <DropdownMenuItem
        className="cursor-pointer text-[13px] text-destructive"
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
            className="flex items-center justify-center w-10 h-10 focus:outline-none"
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
    <div className="flex items-center gap-2.5 flex-shrink-0 border-t border-sidebar-border px-3 py-2.5">
      {avatar}
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold truncate font-heading text-sidebar-foreground">
          {user.name || "User"}
        </div>
        <div className="text-[11px] truncate text-gray-500">
          {user.email}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-md transition-colors duration-150 focus:outline-none text-gray-500 hover:bg-white/[0.08]"
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
    ? SUPER_ADMIN_NAV
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
      className={cn(
        mobile
          ? "relative w-full h-full bg-sidebar flex flex-col overflow-hidden"
          : "fixed top-0 left-0 bottom-0 bg-sidebar border-r border-sidebar-border z-50 flex flex-col overflow-hidden transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
      )}
      style={mobile ? undefined : { width: collapsed ? 64 : 240 }}
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
          <div className="py-1">
            {navSections.map((section, idx) => (
              <div key={section.section}>
                {idx > 0 && (
                  <div className="h-px mx-4 my-1.5 bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
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
          <div className="py-1">
            {navSections.map((section, idx) => (
              <div key={section.section} className={idx > 0 ? "mt-4" : ""}>
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
          className={cn(
            "border-t border-sidebar-border px-2 pt-1.5 pb-2 flex",
            collapsed ? "justify-center" : "justify-end"
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggle}
                className={cn(
                  "flex items-center justify-center rounded-md transition-colors duration-150 focus:outline-none text-gray-500 hover:bg-white/[0.06] h-8 gap-1.5",
                  collapsed ? "w-10" : "w-auto px-2.5"
                )}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <ChevronRight size={16} />
                ) : (
                  <>
                    <ChevronLeft size={14} />
                    <span className="text-[11px] font-heading">
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
