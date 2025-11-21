import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Warehouse,
  History,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "./ui/separator";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/products", label: "Produtos", icon: Package },
    { path: "/customers", label: "Clientes", icon: Users },
    { path: "/pos", label: "PDV", icon: ShoppingCart },
    { path: "/stock", label: "Estoque", icon: Warehouse },
    { path: "/orders", label: "Vendas", icon: History },
    { path: "/settings", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">Sistema Distribuidora</h1>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r flex flex-col">
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-background">{children}</main>
      </div>
    </div>
  );
}

