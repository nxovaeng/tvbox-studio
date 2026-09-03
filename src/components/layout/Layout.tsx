import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { ToastContainer } from "../ui/Toast";
import { useUIStore, useSettingsStore } from "../../store";
import { ConfigPage } from "../config/ConfigPage";
import { PlaylistPage } from "../playlist/PlaylistPage";
import { EditorPage } from "../editor/EditorPage";
import { SettingsPage } from "../settings/SettingsPage";
import { KeyboardShortcutsDialog, ShortcutsHint } from "../ui/KeyboardShortcuts";

export function Layout() {
  const { activeNav, setActiveNav } = useUIStore();
  const { settings } = useSettingsStore();
  const [showShortcuts, setShowShortcuts] = useState(false);

  // 应用主题
  useEffect(() => {
    const apply = (dark: boolean) => {
      document.documentElement.classList.toggle("dark", dark);
    };
    if (settings.theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mq.matches);
      const handler = (e: MediaQueryListEvent) => apply(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      apply(settings.theme === "dark");
    }
  }, [settings.theme]);

  // 全局快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // ? 打开快捷键面板（不在输入框中时）
      if (
        e.key === "?" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        setShowShortcuts(true);
        return;
      }
      // Ctrl/Cmd + 数字切换导航
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "1") { e.preventDefault(); setActiveNav("config"); }
        if (e.key === "2") { e.preventDefault(); setActiveNav("playlist"); }
        if (e.key === "3") { e.preventDefault(); setActiveNav("editor"); }
        if (e.key === ",") { e.preventDefault(); setActiveNav("settings"); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setActiveNav]);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-hidden relative">
        {activeNav === "config"   && <ConfigPage />}
        {activeNav === "playlist" && <PlaylistPage />}
        {activeNav === "editor"   && <EditorPage />}
        {activeNav === "settings" && <SettingsPage />}
      </main>

      <ToastContainer />
      <ShortcutsHint onClick={() => setShowShortcuts(true)} />
      <KeyboardShortcutsDialog
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}
