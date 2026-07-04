"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePaletteStore } from "../stores/palette-store";
import { useAiChatStore } from "../stores/ai-chat-store";
import { useShortcutsStore } from "../stores/shortcuts-store";
import { useLaunchNav } from "./use-launch-nav";

const GO_MAP: Record<string, string> = {
  d: "/dashboard",
  b: "/dashboard/billing",
  m: "/dashboard/members",
  i: "/dashboard/inventory",
};

const LAUNCH_MAP: Record<string, { slug: string; label: string }> = {
  c: { slug: "crm", label: "CRM" },
  h: { slug: "hrms", label: "HRMS" },
};

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

export function useKeyboardShortcuts() {
  const router = useRouter();
  const paletteOpen = usePaletteStore((s) => s.open);
  const togglePalette = usePaletteStore((s) => s.toggle);
  const setPaletteOpen = usePaletteStore((s) => s.setOpen);
  const toggleAiChat = useAiChatStore((s) => s.toggle);
  const aiChatOpen = useAiChatStore((s) => s.open);
  const setAiChatOpen = useAiChatStore((s) => s.setOpen);
  const shortcutsOpen = useShortcutsStore((s) => s.open);
  const setShortcutsOpen = useShortcutsStore((s) => s.setOpen);
  const pendingG = useRef(false);
  const { launchProduct } = useLaunchNav();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        togglePalette();
        return;
      }

      if (meta && e.key === "/") {
        e.preventDefault();
        toggleAiChat();
        return;
      }

      if (isTypingTarget(e.target)) return;

      if (e.key === "Escape") {
        if (paletteOpen) setPaletteOpen(false);
        else if (aiChatOpen) setAiChatOpen(false);
        else if (shortcutsOpen) setShortcutsOpen(false);
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      if (pendingG.current) {
        pendingG.current = false;
        const key = e.key.toLowerCase();
        const href = GO_MAP[key];
        const launch = LAUNCH_MAP[key];
        if (href) {
          e.preventDefault();
          router.push(href);
        } else if (launch) {
          e.preventDefault();
          launchProduct(launch.slug, launch.label);
        }
        return;
      }

      if (e.key.toLowerCase() === "g") {
        pendingG.current = true;
        setTimeout(() => {
          pendingG.current = false;
        }, 800);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [
    router,
    togglePalette,
    toggleAiChat,
    paletteOpen,
    aiChatOpen,
    shortcutsOpen,
    setPaletteOpen,
    setAiChatOpen,
    setShortcutsOpen,
    launchProduct,
  ]);
}
