import { useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Warehouse,
  History,
  Settings,
  ChevronsLeft,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useAuthStore } from "@/state/authStore";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout: logoutFromStore } = useAuthStore((state) => ({
    user: state.user,
    logout: state.logout,
  }));

  const allNavItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
    { path: "/products", label: "Produtos", icon: Package, adminOnly: false },
    { path: "/customers", label: "Clientes", icon: Users, adminOnly: false },
    { path: "/pos", label: "PDV", icon: ShoppingCart, adminOnly: false },
    { path: "/stock", label: "Estoque", icon: Warehouse, adminOnly: false },
    { path: "/orders", label: "Vendas", icon: History, adminOnly: false },
    { path: "/settings", label: "Configurações", icon: Settings, adminOnly: true },
  ];

  const navItems = allNavItems.filter(item => !item.adminOnly || user?.role === 'admin');

  const handleLogout = async () => {
    await invoke("logout");
    logoutFromStore();
    navigate("/login");
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-card border-r flex flex-col transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Header na Sidebar */}
        <div className={cn(
          "p-4 border-b",
          isCollapsed && "px-2"
        )}>
          <div className={cn(
            "flex items-center gap-3",
            isCollapsed && "justify-center"
          )}>
            <h1 className={cn(
              "text-xl font-bold text-foreground transition-all duration-300 overflow-hidden whitespace-nowrap",
              isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            )}>
              Sistema Distribuidora
            </h1>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center px-4 py-3 rounded-md transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    isCollapsed ? "justify-center gap-0" : "justify-start gap-3"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span
                    className={cn(
                      "transition-all duration-300 overflow-hidden whitespace-nowrap",
                      isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t flex flex-col gap-2">
            {!isCollapsed && (
              <div className="mb-2 space-y-1">
                <div className="text-sm font-medium text-foreground">
                  {user?.username}
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  {user?.role}
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              className="w-full justify-center"
              onClick={handleLogout}
            >
              <LogOut className={cn("w-5 h-5", !isCollapsed && "mr-2")} />
              <span className={cn(isCollapsed && "hidden")}>Sair</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="w-full"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <ChevronsLeft
                className={cn(
                  "w-5 h-5 transition-transform duration-300",
                  isCollapsed && "rotate-180"
                )}
              />
              <span className="sr-only">Recolher/Expandir sidebar</span>
            </Button>
          </div>
        </aside>

      {/* Main Content */}
      <main
        key={location.pathname}
        className="flex-1 overflow-y-auto p-6 bg-background animate-fade-in"
      >
        <Outlet />
      </main>
    </div>
  );
}
