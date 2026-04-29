"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Persist collapse state
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) setIsCollapsed(stored === "true");
  }, []);

  function toggleCollapsed() {
    setIsCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", String(!prev));
      return !prev;
    });
  }

  return (
    <div className="flex h-full">
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onToggleCollapsed={toggleCollapsed}
        onMobileClose={() => setIsMobileOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[var(--sidebar)] border-b border-[var(--sidebar-border)] flex-shrink-0">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="text-white p-1 rounded-lg hover:bg-[var(--sidebar-active)] transition-colors"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-bold text-white">Estética Unisex</span>
        </header>

        <main className="flex-1 overflow-y-auto bg-[var(--background)]">
          {children}
        </main>
      </div>
    </div>
  );
}
