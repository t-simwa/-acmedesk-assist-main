import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenu,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { FlaskConical } from "lucide-react";
import { useLocation, Link } from "react-router-dom";

// Sidebar intelligence section addition
export function IntelligenceSidebarSection() {
  const location = useLocation();
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Intelligence</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={location.pathname === "/dashboard/analytics"}>
            <Link to="/dashboard/analytics">
              <FlaskConical size={18} className="mr-2" /> Analytics
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={location.pathname === "/dashboard/documents"}>
            <Link to="/dashboard/documents">
              <FlaskConical size={18} className="mr-2" /> Knowledge Base
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={location.pathname === "/dashboard/integrations"}>
            <Link to="/dashboard/integrations">
              <FlaskConical size={18} className="mr-2" /> Integrations
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={location.pathname === "/dashboard/test"}>
            <Link to="/dashboard/test">
              <FlaskConical size={18} className="mr-2" /> Test Console
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={location.pathname === "/dashboard/training"}>
            <Link to="/dashboard/training">
              <FlaskConical size={18} className="mr-2" /> Improvements
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
