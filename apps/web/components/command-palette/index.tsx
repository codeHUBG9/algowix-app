"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sparkles, Moon, Sun, UserPlus, KeyRound, Boxes, Clock } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../ui/command";
import { usePaletteStore } from "../../lib/stores/palette-store";
import { useAiChatStore } from "../../lib/stores/ai-chat-store";
import { NAV_GROUPS, PAGE_LABELS } from "../../lib/nav-config";
import { useLaunchNav } from "../../lib/hooks/use-launch-nav";
import { getRecentPages } from "../../lib/hooks/use-recent-pages";

const QUICK_ACTIONS = [
  { label: "Invite Member", href: "/dashboard/members", icon: UserPlus },
  { label: "Create Product", href: "/dashboard/products", icon: Boxes },
  { label: "Generate API Key", href: "/dashboard/developer", icon: KeyRound },
  { label: "Add Inventory Item", href: "/dashboard/inventory?new=1", icon: Boxes },
];

export function CommandPalette() {
  const { open, setOpen } = usePaletteStore();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { askWithPrompt } = useAiChatStore();
  const { launchProduct } = useLaunchNav();
  const [search, setSearch] = useState("");
  const recentPages = useMemo(() => (open ? getRecentPages() : []), [open]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function runLaunch(slug: string, label: string) {
    setOpen(false);
    launchProduct(slug, label);
  }

  function askAi() {
    const query = search;
    setOpen(false);
    askWithPrompt(query || "What can you help me with?");
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput value={search} onValueChange={setSearch} placeholder="Search anything..." />
      <CommandList>
        <CommandEmpty>
          <button
            onClick={askAi}
            className="mx-auto flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-slate-600 hover:bg-surface-subtle dark:text-slate-300"
          >
            <Sparkles size={14} className="text-brand-600" /> Ask AI: &ldquo;{search}&rdquo;
          </button>
        </CommandEmpty>

        <CommandGroup heading="Navigation">
          {NAV_GROUPS.flatMap((g) => g.items).map((item) =>
            item.type === "link" ? (
              <CommandItem key={item.href} value={`go to ${item.label}`} onSelect={() => go(item.href)}>
                <item.icon size={15} className="text-slate-400" />
                Go to {item.label}
              </CommandItem>
            ) : (
              <CommandItem key={item.slug} value={`launch ${item.label}`} onSelect={() => runLaunch(item.slug, item.label)}>
                <item.icon size={15} className="text-slate-400" />
                Launch {item.label}
              </CommandItem>
            )
          )}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          {QUICK_ACTIONS.map((action) => (
            <CommandItem key={action.label} value={action.label} onSelect={() => go(action.href)}>
              <action.icon size={15} className="text-slate-400" />
              {action.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {recentPages.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent Pages">
              {recentPages.map((path) => (
                <CommandItem key={path} value={`recent ${PAGE_LABELS[path] ?? path}`} onSelect={() => go(path)}>
                  <Clock size={15} className="text-slate-400" />
                  {PAGE_LABELS[path] ?? path}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading="Ask AI">
          <CommandItem value="ask ai" onSelect={askAi}>
            <Sparkles size={15} className="text-brand-600" />
            Ask AI about this...
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Settings">
          <CommandItem value="edit profile" onSelect={() => go("/dashboard/settings")}>
            Edit Profile
          </CommandItem>
          <CommandItem value="manage billing" onSelect={() => go("/dashboard/billing")}>
            Manage Billing
          </CommandItem>
          <CommandItem value="security settings" onSelect={() => go("/dashboard/settings")}>
            Security Settings
          </CommandItem>
          <CommandItem value="toggle theme dark light mode" onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun size={15} className="text-slate-400" /> : <Moon size={15} className="text-slate-400" />}
            Toggle Dark / Light Mode
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
