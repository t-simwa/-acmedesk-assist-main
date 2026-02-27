import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRole, UserRole } from "@/contexts/RoleContext";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings, LogOut, Shield, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

const ROLE_COLORS: Record<UserRole, { bg: string; text: string; label: string }> = {
  super_admin: { bg: "rgba(239,68,68,0.15)", text: "#EF4444", label: "Super Admin" },
  owner: { bg: "rgba(79,142,247,0.15)", text: "#4F8EF7", label: "Owner" },
  admin: { bg: "rgba(124,58,237,0.15)", text: "#7C3AED", label: "Admin" },
  agent: { bg: "rgba(16,185,129,0.15)", text: "#10B981", label: "Agent" },
  visitor: { bg: "rgba(107,114,128,0.15)", text: "#6B7280", label: "Visitor" },
};

export function UserMenu() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const { user: roleUser } = useRole();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const userRole = (roleUser?.role || "visitor") as UserRole;
  const roleStyle = ROLE_COLORS[userRole] || ROLE_COLORS.visitor;

  const handleLogout = () => {
    setOpen(false);
    logout();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
          aria-label="User menu"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={undefined} alt={user.name || user.email} />
            <AvatarFallback className="bg-primary text-primary-foreground text-[13px] font-medium">
              {getInitials(user.name, user.email)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.name || "User"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <span
              className="text-xs font-medium mt-1 px-2 py-0.5 rounded inline-block w-fit"
              style={{ backgroundColor: roleStyle.bg, color: roleStyle.text }}
            >
              {roleStyle.label}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            to="/admin/profile"
            className="flex items-center cursor-pointer"
            onClick={() => setOpen(false)}
          >
            <User className="mr-2 h-4 w-4" />
            <span>{t("navigation.profile")}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="/admin/security"
            className="flex items-center cursor-pointer"
            onClick={() => setOpen(false)}
          >
            <Shield className="mr-2 h-4 w-4" />
            <span>{t("navigation.security")}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="/admin/settings"
            className="flex items-center cursor-pointer"
            onClick={() => setOpen(false)}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>{t("navigation.settings")}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => {
            setTheme(resolvedTheme === "light" ? "dark" : "light");
            setOpen(false);
          }}
        >
          {resolvedTheme === "light" ? (
            <Moon className="mr-2 h-4 w-4" />
          ) : (
            <Sun className="mr-2 h-4 w-4" />
          )}
          <span>{resolvedTheme === "light" ? "Dark Mode" : "Light Mode"}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive cursor-pointer"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
