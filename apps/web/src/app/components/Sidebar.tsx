"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, GitFork, FileText, Plug, LogOut, Menu, X } from "lucide-react";
import { useAuthStore } from "../lib/auth-store";
import { apiFetch } from "../lib/api";

const TEXT = {
  logo: "배곡",
  dashboard: "대시보드",
  repos: "레포 관리",
  reports: "리포트",
  mcp: "MCP 연결",
  logout: "로그아웃",
} as const;

const NAV_ITEMS = [
  { href: "/dashboard", label: TEXT.dashboard, icon: LayoutDashboard },
  { href: "/dashboard/repos", label: TEXT.repos, icon: GitFork },
  { href: "/dashboard/reports", label: TEXT.reports, icon: FileText },
  { href: "/dashboard/mcp", label: TEXT.mcp, icon: Plug },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore logout errors
    }
    clearAuth();
    window.location.href = "/";
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6">
        <Link
          href="/dashboard"
          className="text-xl font-bold no-underline"
          style={{ color: "var(--color-text)" }}
        >
          {TEXT.logo}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 text-base no-underline transition-colors"
              style={{
                fontWeight: active ? 600 : 500,
                backgroundColor: active ? "rgba(42,157,153,0.1)" : "transparent",
                color: active ? "var(--color-cta)" : "var(--color-text)",
              }}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Separator */}
      <div className="mx-4 my-2" style={{ borderTop: "1px solid var(--color-border-light)" }} />

      {/* Profile */}
      {user && (
        <div className="p-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={user.avatarUrl} alt={user.githubUsername} className="w-8 h-8 rounded-full" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user.githubUsername}</div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-transparent border-none cursor-pointer p-1"
            style={{ color: "var(--color-text-muted)" }}
            title={TEXT.logout}
          >
            <LogOut size={18} />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-transparent border-none cursor-pointer md:hidden"
        style={{ color: "var(--color-text)" }}
      >
        <Menu size={24} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-60 transform transition-transform md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: "var(--color-bg-alt)" }}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 bg-transparent border-none cursor-pointer"
          style={{ color: "var(--color-text)" }}
        >
          <X size={24} />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex md:flex-col md:w-60 md:flex-shrink-0 h-screen sticky top-0"
        style={{ backgroundColor: "var(--color-bg-alt)" }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
