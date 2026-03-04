/**
 * TopBar — Dashboard top navigation bar
 *
 * Spec 7.1.4:
 *   Height: 56px
 *   Background: bg-background/80 with backdrop-blur-[12px]
 *   Border bottom: border-b border-border
 *   Left: hamburger on mobile, empty spacer on desktop
 *   Right: Search icon → GlobalSearch, What's New bell, Notifications bell, Help, Avatar
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { cn } from "@/lib/utils";

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
  { icon: React.ElementType; colorClass: string; bgClass: string }
> = {
  lead: { icon: UserPlus, colorClass: "text-success", bgClass: "bg-success/20" },
  escalation: { icon: AlertCircle, colorClass: "text-destructive", bgClass: "bg-destructive/20" },
  warning: { icon: TrendingUp, colorClass: "text-warning", bgClass: "bg-warning/20" },
  document: { icon: FileText, colorClass: "text-primary", bgClass: "bg-primary/20" },
  system: { icon: CheckCircle2, colorClass: "text-gray-500", bgClass: "bg-gray-500/20" },
};

// ─── Role colors ──────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<UserRole, { bg: string; text: string; label: string }> = {
  super_admin: { bg: "bg-destructive/15", text: "text-destructive", label: "Super Admin" },
  owner: { bg: "bg-primary/15", text: "text-primary", label: "Owner" },
  admin: { bg: "bg-purple-500/15", text: "text-purple-400", label: "Admin" },
  agent: { bg: "bg-success/15", text: "text-success", label: "Agent" },
  visitor: { bg: "bg-gray-500/15", text: "text-gray-500", label: "Visitor" },
};

// ─── Reusable icon button class ───────────────────────────────────────────────

const iconButtonClass =
  "w-9 h-9 flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer text-muted-foreground hover:bg-white/[0.08] hover:text-foreground transition-colors duration-150 relative";

// ─── Props ────────────────────────────────────────────────────────────────────

interface TopBarProps {
  onMenuClick: () => void; // triggers mobile sidebar
  isMobile: boolean;
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export function TopBar({ onMenuClick, isMobile }: TopBarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { user: roleUser } = useRole();

  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [whatsNewRead, setWhatsNewRead] = useState(() =>
    localStorage.getItem("nexachat-whatsnew-read") === "true"
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  return (
    <>
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <header className="h-14 bg-background/80 backdrop-blur-[12px] border-b border-border flex items-center px-4 gap-2 sticky top-0 z-40 flex-shrink-0">
        {/* Left: hamburger (mobile) or empty spacer (desktop) */}
        {isMobile && (
          <div className="flex items-center flex-1 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onMenuClick}
                  className={iconButtonClass}
                  aria-label="Open navigation"
                >
                  <Menu size={20} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Open menu</TooltipContent>
            </Tooltip>
          </div>
        )}

        {!isMobile && <div className="flex-1 min-w-0" />}

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Search */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setSearchOpen(true)}
                className={iconButtonClass}
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
                className={iconButtonClass}
                aria-label="What's New"
              >
                <Newspaper size={18} />
                {!whatsNewRead && (
                  <span className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full bg-primary border-[1.5px] border-background/90" />
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
                    className={iconButtonClass}
                    aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 bg-destructive text-white text-[9px] font-bold h-4 min-w-[16px] rounded-full px-[3px] flex items-center justify-center border-[1.5px] border-background/90">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
              <DropdownMenuContent
                align="end"
                className="w-80 bg-popover border-border max-h-[400px] overflow-y-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-[14px] font-semibold text-foreground font-heading">
                    Notifications
                    {unreadCount > 0 && (
                      <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded-full bg-destructive text-white">
                        {unreadCount}
                      </span>
                    )}
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[12px] text-primary hover:text-primary/80 transition-colors focus:outline-none"
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
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors duration-100 border-b border-white/[0.04] hover:bg-white/[0.04]",
                        !n.read && "bg-primary/[0.06]"
                      )}
                    >
                      <div
                        className={cn(
                          "flex-shrink-0 w-[30px] h-[30px] flex items-center justify-center rounded-full mt-0.5",
                          meta.bgClass
                        )}
                      >
                        <IconEl size={14} className={meta.colorClass} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-foreground font-heading">
                          {n.title}
                          {!n.read && (
                            <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-primary align-middle" />
                          )}
                        </div>
                        <div className="text-[12px] mt-0.5 text-gray-500">
                          {n.body}
                        </div>
                        <div className="text-[11px] mt-1 text-gray-600">
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
                    className="text-[13px] text-primary hover:text-primary/80 transition-colors focus:outline-none"
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
                    className={iconButtonClass}
                    aria-label="Help"
                  >
                    <HelpCircle size={18} />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Help</TooltipContent>
              <DropdownMenuContent
                align="end"
                className="w-52 bg-popover border-border"
              >
                <DropdownMenuItem
                  className="cursor-pointer text-[13px] text-muted-foreground"
                  onClick={() => navigate("/dashboard/support")}
                >
                  <HelpCircle size={14} className="mr-2" /> Help Center
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-[13px] text-muted-foreground"
                  onClick={() => navigate("/dashboard/install")}
                >
                  <FileText size={14} className="mr-2" /> Documentation
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem className="cursor-pointer text-[13px] text-muted-foreground">
                  <Newspaper size={14} className="mr-2" /> What&apos;s New
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Tooltip>

          {/* Account Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="focus:outline-none rounded-full ml-1"
                aria-label="Account menu"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={undefined} />
                  <AvatarFallback className="text-[12px] font-semibold text-white bg-gradient-to-br from-primary to-purple-500">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-popover border-border"
            >
              <div className="px-3 py-2">
                <div className="text-[13px] font-semibold text-foreground font-heading">
                  {user?.name || "User"}
                </div>
                <div className="text-[11px] mt-0.5 text-gray-500">
                  {user?.email}
                </div>
                <span
                  className={cn(
                    "inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded",
                    roleStyle.bg,
                    roleStyle.text
                  )}
                >
                  {roleStyle.label}
                </span>
              </div>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                className="cursor-pointer text-[13px] text-muted-foreground"
                onClick={() => navigate("/dashboard/profile")}
              >
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-[13px] text-muted-foreground"
                onClick={() => navigate("/dashboard/settings")}
              >
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                className="cursor-pointer text-[13px] text-destructive"
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
