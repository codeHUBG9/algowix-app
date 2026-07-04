"use client";

import { CommandPalette } from "../../../components/command-palette";
import { AiChatDrawer } from "../../../components/ai-chat";
import { KeyboardShortcutsModal } from "../../../components/keyboard-shortcuts-modal";
import { useKeyboardShortcuts } from "../../../lib/hooks/use-keyboard-shortcuts";
import { useTrackRecentPage } from "../../../lib/hooks/use-recent-pages";

export function ShellOverlays() {
  useKeyboardShortcuts();
  useTrackRecentPage();

  return (
    <>
      <CommandPalette />
      <AiChatDrawer />
      <KeyboardShortcutsModal />
    </>
  );
}
