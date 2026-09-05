import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { ToastContainer } from "../ui/Toast";
import { useUIStore, useSettingsStore } from "../../store";
import { ConfigPage } from "../config/ConfigPage";
import { PlaylistPage } from "../playlist/PlaylistPage";
import { EditorPage } from "../editor/EditorPage";
import { SettingsPage } from "../settings/SettingsPage";

export function Layout() {
  const { activeNav } = useUIStore();
  const { settings } = useSettingsStore();

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
    </div>
  );
}
