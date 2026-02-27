import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useRole, UserRole } from "@/contexts/RoleContext";
import {
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  UserCheck,
  CalendarCheck,
  Users,
  BarChart3,
  BookOpen,
  FlaskConical,
  Sparkles,
  Bot,
  Radio,
  Megaphone,
  Plug,
  Key,
  Settings,
  Download,
  Gift,
  HelpCircle,
  BarChart2,
  Activity,
  DollarSign,
  CreditCard,
  Tag,
  Mail,
  Flag,
  Terminal,
  Shield,
  Database,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: string;
  planGate?: string;
  restricted?: string[];
}

interface NavSection {
  section: string;
  items: NavItem[];
}

type NavConfig = Record<UserRole, NavSection[]>;

const NAV_CONFIG: NavConfig = {
  super_admin: [
    {
      section: "PLATFORM",
      items: [
        { label: "Overview", icon: BarChart2, path: "/admin" },
        { label: "Clients", icon: Users, path: "/admin/clients", badge: "clientCount" },
        { label: "Platform Health", icon: Activity, path: "/admin/health" },
      ],
    },
    {
      section: "REVENUE",
      items: [
        { label: "Analytics", icon: DollarSign, path: "/admin/analytics" },
        { label: "Billing", icon: CreditCard, path: "/admin/billing" },
        { label: "Promo Codes", icon: Tag, path: "/admin/promo-codes" },
      ],
    },
    {
      section: "SYSTEM",
      items: [
        { label: "Global Settings", icon: Settings, path: "/admin/settings" },
        { label: "Email Templates", icon: Mail, path: "/admin/emails" },
        { label: "Feature Flags", icon: Flag, path: "/admin/flags" },
        { label: "Announcements", icon: Megaphone, path: "/admin/announcements" },
      ],
    },
    {
      section: "TOOLS",
      items: [
        { label: "Impersonation Log", icon: Terminal, path: "/admin/impersonation-log" },
        { label: "Audit Log", icon: Shield, path: "/admin/audit-log" },
        { label: "DB Health", icon: Database, path: "/admin/database" },
      ],
    },
  ],
  owner: [
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
        { label: "Test Console", icon: FlaskConical, path: "/dashboard/test" },
        { label: "Improvements", icon: Sparkles, path: "/dashboard/training" },
      ],
    },
    {
      section: "CONFIGURATION",
      items: [
        { label: "Chatbot", icon: Bot, path: "/dashboard/chatbot" },
        { label: "Channels", icon: Radio, path: "/dashboard/channels" },
        { label: "Campaigns", icon: Megaphone, path: "/dashboard/campaigns", planGate: "growth" },
        { label: "Integrations", icon: Plug, path: "/dashboard/integrations", planGate: "growth" },
        { label: "API Access", icon: Key, path: "/dashboard/api", planGate: "growth" },
      ],
    },
    {
      section: "ACCOUNT",
      items: [
        { label: "Settings", icon: Settings, path: "/dashboard/settings" },
        { label: "Install Guide", icon: Download, path: "/dashboard/install" },
        { label: "Refer & Earn", icon: Gift, path: "/dashboard/referral" },
        { label: "Help & Docs", icon: HelpCircle, path: "/dashboard/help" },
      ],
    },
  ],
  admin: [
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
        { label: "Test Console", icon: FlaskConical, path: "/dashboard/test" },
        { label: "Improvements", icon: Sparkles, path: "/dashboard/training" },
      ],
    },
    {
      section: "CONFIGURATION",
      items: [
        { label: "Chatbot", icon: Bot, path: "/dashboard/chatbot" },
        { label: "Channels", icon: Radio, path: "/dashboard/channels", restricted: ["connect", "disconnect"] },
        { label: "Campaigns", icon: Megaphone, path: "/dashboard/campaigns" },
        { label: "Integrations", icon: Plug, path: "/dashboard/integrations" },
      ],
    },
    {
      section: "ACCOUNT",
      items: [
        { label: "Settings", icon: Settings, path: "/dashboard/settings" },
        { label: "Install Guide", icon: Download, path: "/dashboard/install" },
        { label: "Help & Docs", icon: HelpCircle, path: "/dashboard/help" },
      ],
    },
  ],
  agent: [
    {
      section: "WORK",
      items: [
        { label: "Inbox", icon: MessageSquare, path: "/dashboard/inbox", badge: "unread" },
        { label: "Conversations", icon: MessagesSquare, path: "/dashboard/conversations" },
        { label: "Leads", icon: UserCheck, path: "/dashboard/leads", badge: "newLeads" },
        { label: "Bookings", icon: CalendarCheck, path: "/dashboard/bookings" },
        { label: "Contacts", icon: Users, path: "/dashboard/contacts" },
      ],
    },
    {
      section: "HELP",
      items: [
        { label: "Help & Docs", icon: HelpCircle, path: "/dashboard/help" },
      ],
    },
  ],
  visitor: [],
};

const ROLE_COLORS: Record<UserRole, { bg: string; text: string; label: string }> = {
  super_admin: { bg: "rgba(239,68,68,0.15)", text: "#EF4444", label: "Super Admin" },
  owner: { bg: "rgba(79,142,247,0.15)", text: "#4F8EF7", label: "Owner" },
  admin: { bg: "rgba(124,58,237,0.15)", text: "#7C3AED", label: "Admin" },
  agent: { bg: "rgba(16,185,129,0.15)", text: "#10B981", label: "Agent" },
  visitor: { bg: "rgba(107,114,128,0.15)", text: "#6B7280", label: "Visitor" },
};

function NavSection({
  section,
  items,
  isExpanded,
  isActiveSection,
  onToggle,
  isPathActive,
  getBadgeCount,
}: {
  section: string;
  items: NavItem[];
  isExpanded: boolean;
  isActiveSection: boolean;
  onToggle: () => void;
  isPathActive: (path: string) => boolean;
  getBadgeCount: (badgeType?: string) => number;
}) {
  return (
    <div className="px-3">
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 rounded-lg transition-all duration-200",
          "text-[11px] font-semibold uppercase tracking-wider",
          isActiveSection
            ? "text-foreground bg-muted/50"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
        )}
      >
        <span>{section}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 transition-transform duration-200",
            isExpanded ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>
      
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-out",
          isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="space-y-0.5 py-1">
          {items.map((item) => {
            const isActive = isPathActive(item.path);
            const badgeCount = item.badge ? getBadgeCount(item.badge) : 0;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-all duration-150",
                  "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 min-h-[44px]",
                  isActive
                    ? "bg-primary/10 text-primary-foreground font-medium border-l-2 border-primary ml-[-2px]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <span className="flex items-center gap-3">
                  <item.icon
                    size={18}
                    className={cn(
                      "transition-colors duration-150",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                    aria-hidden="true"
                  />
                  {item.label}
                </span>
                {badgeCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-[11px] font-medium px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function RoleBasedSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, isSuperAdmin, isOwner, isAdmin, isAgent } = useRole();

  const getUserRole = (): UserRole => {
    if (isSuperAdmin) return "super_admin";
    if (isOwner) return "owner";
    if (isAdmin) return "admin";
    if (isAgent) return "agent";
    return "visitor";
  };

  const userRole = getUserRole();
  const navSections = NAV_CONFIG[userRole] || [];

  const isPathActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  const getBadgeCount = (badgeType?: string) => {
    return 0;
  };

  const getActiveSection = () => {
    for (const section of navSections) {
      for (const item of section.items) {
        if (isPathActive(item.path)) {
          return section.section;
        }
      }
    }
    return navSections[0]?.section || "";
  };

  const activeSection = getActiveSection();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (activeSection) {
      initial.add(activeSection);
    }
    return initial;
  });

  useEffect(() => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (activeSection) {
        newSet.add(activeSection);
      }
      return newSet;
    });
  }, [activeSection]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const isActiveSection = (section: string) => {
    return navSections
      .find((s) => s.section === section)
      ?.items.some((item) => isPathActive(item.path));
  };

  return (
    <div className="flex flex-col h-full py-2">
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {navSections.map((section) => (
        <NavSection
          key={section.section}
          section={section.section}
          items={section.items}
          isExpanded={expandedSections.has(section.section)}
          isActiveSection={!!isActiveSection(section.section)}
          onToggle={() => toggleSection(section.section)}
          isPathActive={isPathActive}
          getBadgeCount={getBadgeCount}
        />
      ))}
    </div>
  );
}

export { ROLE_COLORS };
