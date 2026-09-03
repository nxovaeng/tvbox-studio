import { cn } from "../../lib/utils";
import { useUIStore } from "../../store";
import {
  Settings, List, Radio, Code2, ChevronLeft, ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "config" as const, icon: List, label: "配置管理", shortcut: "1" },
  { id: "playlist" as const, icon: Radio, label: "直播源", shortcut: "2" },
  { id: "editor" as const, icon: Code2, label: "代码编辑", shortcut: "3" },
  { id: "settings" as const, icon: Settings, label: "设置", shortcut: "," },
] as const;

export function Sidebar() {
  const { activeNav, setActiveNav, sidebarCollapsed, setSidebarCollapsed } = useUIStore();

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-sidebar transition-all duration-200 flex-shrink-0",
        sidebarCollapsed ? "w-12" : "w-44"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-3 border-b border-sidebar-border",
        sidebarCollapsed && "justify-center px-0"
      )}>
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-xs">TV</span>
        </div>
        {!sidebarCollapsed && (
          <span className="font-semibold text-sm text-sidebar-foreground truncate">TVBox Studio</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-1.5 space-y-0.5">
        {NAV_ITEMS.map(({ id, icon: Icon, label, shortcut }) => (
          <button
            key={id}
            onClick={() => setActiveNav(id)}
            title={sidebarCollapsed ? `${label} (${shortcut})` : undefined}
            className={cn(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
              "text-sidebar-foreground hover:bg-sidebar-accent/20 hover:text-foreground",
              activeNav === id && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
              sidebarCollapsed && "justify-center px-0"
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 truncate">{label}</span>
                <kbd className="text-[10px] text-muted-foreground font-mono opacity-60">{shortcut}</kbd>
              </>
            )}
          </button>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="p-1.5 border-t border-sidebar-border">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            "w-full flex items-center justify-center py-1.5 rounded-md text-sidebar-foreground",
            "hover:bg-sidebar-accent/20 transition-colors"
          )}
          title={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {sidebarCollapsed
            ? <ChevronRight className="h-4 w-4" />
            : <ChevronLeft className="h-4 w-4" />
          }
        </button>
      </div>
    </aside>
  );
}
