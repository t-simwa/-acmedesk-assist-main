import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, BarChart3, Settings } from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Documents", path: "/admin/documents", icon: FileText },
  { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
  { label: "Settings", path: "/admin/settings", icon: Settings },
];

export function AdminLayout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-surface">
      {/* Sidebar */}
      <aside className="w-60 border-r border-border bg-background flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center">
              <span className="text-[12px] font-bold text-background tracking-tight">A</span>
            </div>
            <div>
              <span className="text-[15px] font-semibold text-foreground">AcmeDesk</span>
              <span className="text-[11px] text-muted-foreground block -mt-0.5">Support AI</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              item.path === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[13px] font-medium text-muted-foreground">
              SL
            </div>
            <div className="text-[13px]">
              <div className="font-medium text-foreground">Sarah Lee</div>
              <div className="text-muted-foreground text-[12px]">Support Lead</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
