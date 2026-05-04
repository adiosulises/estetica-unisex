"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  Tag,
  ShoppingCart,
  Wallet,
  Receipt,
  ArrowLeftRight,
  Banknote,
  DollarSign,
  UserCog,
  Bookmark,
  CalendarDays,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/marcas", label: "Marcas", icon: Users },
  { href: "/inventario", label: "Inventario", icon: Package },
  { href: "/etiquetas", label: "Etiquetas", icon: Tag },
  { href: "/pos", label: "POS", icon: ShoppingCart },
  { href: "/caja", label: "Caja", icon: Wallet },
  { href: "/historial", label: "Historial ventas", icon: Receipt },
  { href: "/transacciones", label: "Transacciones", icon: ArrowLeftRight },
  { href: "/marcas/pagos", label: "Pagos a marcas", icon: Banknote },
  { href: "/sueldos", label: "Sueldos", icon: DollarSign },
  { href: "/empleados", label: "Empleados", icon: UserCog },
  { href: "/apartados", label: "Apartados", icon: Bookmark },
  { href: "/eventos", label: "Eventos", icon: CalendarDays },
];

interface SidebarProps {
  isCollapsed?: boolean;
  isMobileOpen?: boolean;
  onToggleCollapsed?: () => void;
  onMobileClose?: () => void;
}

export function Sidebar({
  isCollapsed = false,
  isMobileOpen = false,
  onToggleCollapsed,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        // Base
        "flex-shrink-0 bg-[var(--sidebar)] flex flex-col h-full z-40 transition-all duration-200",
        // Desktop: static, collapsible width
        "hidden lg:flex",
        isCollapsed ? "w-14" : "w-56",
        // Mobile: fixed overlay, slide in/out
        isMobileOpen && "!flex fixed inset-y-0 left-0 w-56 shadow-2xl",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center border-b border-[var(--sidebar-border)] flex-shrink-0",
          isCollapsed ? "justify-center px-0 py-4" : "justify-between px-4 py-4",
        )}
      >
        {!isCollapsed && (
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">Estética Unisex</h1>
            <p className="text-xs text-[var(--sidebar-foreground)] opacity-60 mt-0.5">POS</p>
          </div>
        )}

        {/* Mobile close button */}
        {isMobileOpen && (
          <button
            onClick={onMobileClose}
            className="lg:hidden text-[var(--sidebar-foreground)] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        )}

        {/* Desktop collapse toggle */}
        {!isMobileOpen && onToggleCollapsed && (
          <button
            onClick={onToggleCollapsed}
            className="hidden lg:flex text-[var(--sidebar-foreground)] hover:text-white transition-colors p-0.5 rounded"
            title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onMobileClose}
              title={isCollapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm mb-0.5 transition-colors",
                isCollapsed && "justify-center px-0",
                isActive
                  ? "bg-[var(--sidebar-active)] text-white font-medium"
                  : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-active)] hover:text-white"
              )}
            >
              <Icon size={16} strokeWidth={1.75} className="flex-shrink-0" />
              {!isCollapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-[var(--sidebar-border)] flex-shrink-0">
        <button
          onClick={handleLogout}
          title={isCollapsed ? "Cerrar sesión" : undefined}
          className={cn(
            "flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-sm text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-active)] hover:text-white transition-colors",
            isCollapsed && "justify-center px-0",
          )}
        >
          <LogOut size={16} strokeWidth={1.75} className="flex-shrink-0" />
          {!isCollapsed && "Cerrar sesión"}
        </button>
      </div>
    </aside>
  );
}
