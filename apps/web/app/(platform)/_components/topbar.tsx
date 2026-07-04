"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { LogOut, User, Camera } from "lucide-react";
import { OrgSwitcher } from "./org-switcher";
import { NotificationBell } from "./notification-bell";
import { useCurrentSession } from "../../../lib/hooks/use-current-session";
import { apiClient } from "../../../lib/api-client";
import { useMyAvatar, useUploadAvatar } from "../../../lib/hooks/use-files";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function Topbar() {
  const router = useRouter();
  const { data: session } = useCurrentSession();
  const { data: avatar } = useMyAvatar();
  const uploadAvatar = useUploadAvatar();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur">
      <OrgSwitcher />
      <div className="flex items-center gap-1.5">
        <NotificationBell />
        <div className="relative" ref={ref}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-slate-100"
          >
            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
              {avatar?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${API_URL}${avatar.avatarUrl}`} alt="" className="h-full w-full object-cover" />
              ) : (
                session?.auth.email?.[0]?.toUpperCase() ?? <User size={14} />
              )}
            </div>
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="truncate text-sm font-medium text-slate-800">{session?.auth.email}</p>
                <p className="text-xs text-slate-400">{session?.auth.role}</p>
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadAvatar.isPending}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
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
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
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
