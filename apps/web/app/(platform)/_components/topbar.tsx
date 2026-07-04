"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { LogOut, User, Camera, Search, Sparkles, Sun, Moon, ChevronRight } from "lucide-react";
import { useTheme } from "next-themes";
import { OrgSwitcher } from "./org-switcher";
import { NotificationBell } from "./notification-bell";
import { useCurrentSession } from "../../../lib/hooks/use-current-session";
import { apiClient } from "../../../lib/api-client";
import { useMyAvatar, useUploadAvatar } from "../../../lib/hooks/use-files";
import { usePaletteStore } from "../../../lib/stores/palette-store";
import { useAiChatStore } from "../../../lib/stores/ai-chat-store";
import { PAGE_LABELS } from "../../../lib/nav-config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function Breadcrumb() {
  const pathname = usePathname() ?? "/dashboard";
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = segments.map((seg, i) => {
    const href = `/${segments.slice(0, i + 1).join("/")}`;
    const label = PAGE_LABELS[href] ?? seg.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
    return { href, label };
  });

  return (
    <nav className="hidden items-center gap-1 text-sm text-slate-500 md:flex">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={13} className="text-slate-300" />}
          <span className={i === crumbs.length - 1 ? "font-medium text-slate-900 dark:text-slate-100" : ""}>{crumb.label}</span>
        </span>
      ))}
    </nav>
  );
}

export function Topbar() {
  const router = useRouter();
  const { data: session } = useCurrentSession();
  const { data: avatar } = useMyAvatar();
  const uploadAvatar = useUploadAvatar();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const setPaletteOpen = usePaletteStore((s) => s.setOpen);
  const toggleAiChat = useAiChatStore((s) => s.toggle);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleLogout() {
    await apiClient.post("/api/v1/auth/logout");
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-surface/80 px-6 backdrop-blur">
      <div className="flex min-w-0 items-center gap-4">
        <OrgSwitcher />
        <Breadcrumb />
      </div>

      <div className="flex flex-1 justify-center px-4">
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex w-full max-w-sm items-center gap-2 rounded-lg border border-border bg-surface-subtle px-3 py-1.5 text-sm text-slate-400 hover:border-slate-300"
        >
          <Search size={14} />
          <span className="flex-1 text-left">Search anything...</span>
          <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-slate-400">⌘K</kbd>
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={toggleAiChat}
          className="flex h-8 w-8 items-center justify-center rounded-full text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40"
          aria-label="Open AI Chat"
        >
          <Sparkles size={16} />
        </button>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-surface-subtle"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <NotificationBell />
        <div className="relative" ref={ref}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-surface-subtle"
          >
            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
              {avatar?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${API_URL}${avatar.avatarUrl}`} alt="" className="h-full w-full object-cover" />
              ) : (
                session?.auth.email?.[0]?.toUpperCase() ?? <User size={14} />
              )}
            </div>
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-border bg-surface py-1 shadow-float">
              <div className="border-b border-border px-3 py-2">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{session?.auth.email}</p>
                <p className="text-xs text-slate-400">{session?.auth.role}</p>
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadAvatar.isPending}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-surface-subtle dark:text-slate-300"
              >
                <Camera size={14} /> {uploadAvatar.isPending ? "Uploading..." : "Change avatar"}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAvatar.mutate(file);
                }}
              />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
