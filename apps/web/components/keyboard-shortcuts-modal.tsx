"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useShortcutsStore } from "../lib/stores/shortcuts-store";

const SHORTCUTS: [string, string][] = [
  ["Ctrl+K / ⌘K", "Open Command Palette"],
  ["Ctrl+/ / ⌘/", "Open AI Chat"],
  ["?", "Show keyboard shortcuts"],
  ["G then D", "Go to Dashboard"],
  ["G then B", "Go to Billing"],
  ["G then M", "Go to Members"],
  ["G then I", "Go to Inventory"],
  ["G then C", "Launch CRM"],
  ["G then H", "Launch HRMS"],
  ["Esc", "Close any modal/drawer"],
];

export function KeyboardShortcutsModal() {
  const { open, setOpen } = useShortcutsStore();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          {SHORTCUTS.map(([keys, action]) => (
            <div key={action} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-slate-600 dark:text-slate-300">{action}</span>
              <kbd className="rounded-md border border-border bg-surface-subtle px-2 py-1 font-mono text-xs text-slate-500">
                {keys}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
