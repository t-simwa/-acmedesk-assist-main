/**
 * TopBar — Dashboard top navigation bar
 *
 * Spec 7.1.4:
 *   Height: 56px
 *   Background: rgba(7,11,20,0.8) with backdrop-filter: blur(12px)
 *   Border bottom: 1px solid rgba(255,255,255,0.08)
 *   Left: page title (Plus Jakarta Sans 600 18px) or hamburger on mobile
 *   Right: Search icon → GlobalSearch, What's New bell, Notifications bell, Help, Avatar
 */

import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Menu,
  Bell,
  HelpCircle,
  Newspaper,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  TrendingUp,
  FileText,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole, UserRole } from "@/contexts/RoleContext";
import { GlobalSearch } from "./GlobalSearch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Route → Page title mapping ───────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/inbox": "Inbox",
  "/dashboard/conversations": "Conversations",
  "/dashboard/leads": "Leads",
  "/dashboard/bookings": "Bookings",
  "/dashboard/analytics": "Analytics",
  "/dashboard/documents": "Knowledge Base",
  "/dashboard/chatbot": "Chatbot",
  "/dashboard/channels": "Channels",
  "/dashboard/campaigns": "Campaigns",
  "/dashboard/settings": "Settings",
  "/dashboard/install": "Install Guide",
  "/dashboard/support": "Support",
  "/dashboard/profile": "Profile",
  "/dashboard/help": "Help & Docs",
  // Legacy /admin paths
  "/admin": "Overview",
  "/admin/documents": "Knowledge Base",
  "/admin/analytics": "Analytics",
  "/admin/inbox": "Inbox",
  "/admin/settings": "Settings",
  "/admin/profile": "Profile",
  "/admin/security": "Security",
  "/admin/team": "Team",
  "/admin/audit-logs": "Audit Logs",
  "/admin/api-keys": "API Keys",
  "/admin/help": "Help & Docs",
  "/admin/install": "Install Guide",
  "/admin/email": "Email Channel",
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Partial match (for nested routes)
  const matched = Object.entries(PAGE_TITLES)
    .filter(([key]) => pathname.startsWith(key))
    .sort((a, b) => b[0].length - a[0].length)[0];
  return matched ? matched[1] : "Dashboard";
}

// ─── Mock notifications ───────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: "lead" | "escalation" | "warning" | "document" | "system";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "lead",
    title: "New lead captured",
    body: "John Smith from Web Widget",
    time: "2 min ago",
    read: false,
  },
  {
    id: "n2",
    type: "escalation",
    title: "Escalation required",
    body: "Sarah Lee needs human support",
    time: "15 min ago",
    read: false,
  },
  {
    id: "n3",
    type: "warning",
    title: "Usage at 82%",
    body: "You're close to your conversation limit",
    time: "1 hour ago",
    read: false,
  },
  {
    id: "n4",
    type: "document",
    title: "Document indexed",
    body: "Product Catalog 2026.pdf is ready",
    time: "3 hours ago",
    read: true,
  },
  {
    id: "n5",
    type: "system",
    title: "Chatbot is live",
    body: "Your widget is active on your website",
    time: "Yesterday",
    read: true,
  },
];

const NOTIFICATION_ICONS: Record<
  Notification["type"],
  { icon: React.ElementType; color: string }
> = {
  lead: { icon: UserPlus, color: "#10B981" },
  escalation: { icon: AlertCircle, color: "#EF4444" },
  warning: { icon: TrendingUp, color: "#F59E0B" },
  document: { icon: FileText, color: "#4F8EF7" },
  system: { icon: CheckCircle2, color: "#6B7280" },
};

// ─── Role colors ──────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<UserRole, { bg: string; text: string; label: string }> = {
  super_admin: { bg: "rgba(239,68,68,0.15)", text: "#EF4444", label: "Super Admin" },
  owner: { bg: "rgba(79,142,247,0.15)", text: "#4F8EF7", label: "Owner" },
  admin: { bg: "rgba(124,58,237,0.15)", text: "#7C3AED", label: "Admin" },
  agent: { bg: "rgba(16,185,129,0.15)", text: "#10B981", label: "Agent" },
  visitor: { bg: "rgba(107,114,128,0.15)", text: "#6B7280", label: "Visitor" },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface TopBarProps {
  onMenuClick: () => void; // triggers mobile sidebar
  isMobile: boolean;
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export function TopBar({ onMenuClick, isMobile }: TopBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { user: roleUser } = useRole();

  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [whatsNewRead, setWhatsNewRead] = useState(() =>
    localStorage.getItem("nexachat-whatsnew-read") === "true"
  );

  const unreadCount = notifications.filter((n) => !n.read).length;
  const pageTitle = getPageTitle(location.pathname);

  const userRole = (roleUser?.role || "visitor") as UserRole;
  const roleStyle = ROLE_COLORS[userRole] || ROLE_COLORS.visitor;

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const initials = (() => {
    if (!user) return "?";
    const name = user.name;
    if (name) {
      const parts = name.trim().split(" ");
      return parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  })();

  const iconButtonStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#9CA3AF",
    transition: "background 150ms ease, color 150ms ease",
    position: "relative",
  };

  return (
    <>
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <header
        style={{
          height: 56,
          background: "rgba(7,11,20,0.8)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 8,
          position: "sticky",
          top: 0,
          zIndex: 40,
          flexShrink: 0,
        }}
      >
        {/* Left: hamburger (mobile) or page title (desktop) */}
        <div className="flex items-center flex-1 min-w-0">
          {isMobile ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onMenuClick}
                  style={iconButtonStyle}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
                    (e.currentTarget as HTMLElement).style.color = "#F9FAFB";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "#9CA3AF";
                  }}
                  aria-label="Open navigation"
                >
                  <Menu size={20} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Open menu</TooltipContent>
            </Tooltip>
          ) : (
            <h1
              className="truncate"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                fontSize: 18,
                color: "#F9FAFB",
                margin: 0,
              }}
            >
              {pageTitle}
            </h1>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Search */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setSearchOpen(true)}
                style={iconButtonStyle}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
                  (e.currentTarget as HTMLElement).style.color = "#F9FAFB";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "#9CA3AF";
                }}
                aria-label="Search (Ctrl+K)"
              >
                <Search size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Search · Ctrl+K</TooltipContent>
          </Tooltip>

          {/* What's New */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  setWhatsNewRead(true);
                  localStorage.setItem("nexachat-whatsnew-read", "true");
                }}
                style={{ ...iconButtonStyle, position: "relative" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
                  (e.currentTarget as HTMLElement).style.color = "#F9FAFB";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "#9CA3AF";
                }}
                aria-label="What's New"
              >
                <Newspaper size={18} />
                {!whatsNewRead && (
                  <span
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#4F8EF7",
                      border: "1.5px solid rgba(7,11,20,0.9)",
                    }}
                  />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>What&apos;s New</TooltipContent>
          </Tooltip>

          {/* Notifications */}
          <Tooltip>
            <DropdownMenu>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    style={{ ...iconButtonStyle, position: "relative" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(255,255,255,0.08)";
                      (e.currentTarget as HTMLElement).style.color = "#F9FAFB";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "#9CA3AF";
                    }}
                    aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          background: "#EF4444",
                          color: "#FFFFFF",
                          fontSize: 9,
                          fontWeight: 700,
                          height: 16,
                          minWidth: 16,
                          borderRadius: 9999,
                          padding: "0 3px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1.5px solid rgba(7,11,20,0.9)",
                        }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            <DropdownMenuContent
              align="end"
              className="w-80"
              style={{
                background: "#0D1117",
                border: "1px solid rgba(255,255,255,0.12)",
                maxHeight: 400,
                overflowY: "auto",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span
                  className="text-[14px] font-semibold"
                  style={{ color: "#F9FAFB", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Notifications
                  {unreadCount > 0 && (
                    <span
                      className="ml-2 text-[11px] px-1.5 py-0.5 rounded-full"
                      style={{ background: "#EF4444", color: "#FFF" }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[12px] transition-colors focus:outline-none"
                    style={{ color: "#4F8EF7" }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.color = "#7EB3FF")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.color = "#4F8EF7")
                    }
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification list */}
              {notifications.map((n) => {
                const meta = NOTIFICATION_ICONS[n.type];
                const IconEl = meta.icon;
                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors duration-100"
                    style={{
                      background: n.read ? "transparent" : "rgba(79,142,247,0.06)",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "rgba(255,255,255,0.04)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = n.read
                        ? "transparent"
                        : "rgba(79,142,247,0.06)")
                    }
                  >
                    <div
                      className="flex-shrink-0 flex items-center justify-center rounded-full mt-0.5"
                      style={{ width: 30, height: 30, background: `${meta.color}20` }}
                    >
                      <IconEl size={14} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[13px] font-medium"
                        style={{ color: "#F9FAFB", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      >
                        {n.title}
                        {!n.read && (
                          <span
                            className="ml-2 inline-block w-1.5 h-1.5 rounded-full"
                            style={{ background: "#4F8EF7", verticalAlign: "middle" }}
                          />
                        )}
                      </div>
                      <div className="text-[12px] mt-0.5" style={{ color: "#6B7280" }}>
                        {n.body}
                      </div>
                      <div className="text-[11px] mt-1" style={{ color: "#4B5563" }}>
                        {n.time}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Footer */}
              <div className="px-4 py-2.5 text-center">
                <button
                  onClick={() => navigate("/dashboard/notifications")}
                  className="text-[13px] transition-colors focus:outline-none"
                  style={{ color: "#4F8EF7" }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.color = "#7EB3FF")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.color = "#4F8EF7")
                  }
                >
                  View all notifications →
                </button>
               </div>
             </DropdownMenuContent>
            </DropdownMenu>
          </Tooltip>

          {/* Help */}
          <Tooltip>
            <DropdownMenu>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    style={iconButtonStyle}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(255,255,255,0.08)";
                      (e.currentTarget as HTMLElement).style.color = "#F9FAFB";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "#9CA3AF";
                    }}
                    aria-label="Help"
                  >
                    <HelpCircle size={18} />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Help</TooltipContent>
            <DropdownMenuContent
              align="end"
              className="w-52"
              style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <DropdownMenuItem
                className="cursor-pointer text-[13px]"
                style={{ color: "#9CA3AF" }}
                onClick={() => navigate("/dashboard/support")}
              >
                <HelpCircle size={14} className="mr-2" /> Help Center
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-[13px]"
                style={{ color: "#9CA3AF" }}
                onClick={() => navigate("/dashboard/install")}
              >
                <FileText size={14} className="mr-2" /> Documentation
              </DropdownMenuItem>
              <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.08)" }} />
              <DropdownMenuItem className="cursor-pointer text-[13px]" style={{ color: "#9CA3AF" }}>
                <Newspaper size={14} className="mr-2" /> What&apos;s New
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
         </Tooltip>

          {/* Account Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="focus:outline-none rounded-full"
                style={{ marginLeft: 4 }}
                aria-label="Account menu"
              >
                <Avatar style={{ width: 32, height: 32 }}>
                  <AvatarImage src={undefined} />
                  <AvatarFallback
                    className="text-[12px] font-semibold text-white"
                    style={{
                      background: "linear-gradient(135deg, #4F8EF7, #7C3AED)",
                      fontSize: 12,
                    }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56"
              style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <div className="px-3 py-2">
                <div
                  className="text-[13px] font-semibold"
                  style={{ color: "#F9FAFB", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {user?.name || "User"}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: "#6B7280" }}>
                  {user?.email}
                </div>
                <span
                  className="inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{ background: roleStyle.bg, color: roleStyle.text }}
                >
                  {roleStyle.label}
                </span>
              </div>
              <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.08)" }} />
              <DropdownMenuItem
                className="cursor-pointer text-[13px]"
                style={{ color: "#9CA3AF" }}
                onClick={() => navigate("/dashboard/profile")}
              >
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-[13px]"
                style={{ color: "#9CA3AF" }}
                onClick={() => navigate("/dashboard/settings")}
              >
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.08)" }} />
              <DropdownMenuItem
                className="cursor-pointer text-[13px]"
                style={{ color: "#EF4444" }}
                onClick={logout}
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
