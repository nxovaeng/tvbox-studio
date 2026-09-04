import { useState, useEffect, useMemo } from "react";
import { cn } from "../../lib/utils";
import { useUIStore, useConfigCardsStore, useTvBoxStore } from "../../store";
import {
  Settings, List, Radio, Code2, ChevronLeft, ChevronRight,
  ChevronDown, ChevronRight as ChevronRightSm,
  Globe, HardDrive, Star, Plus, Layers,
} from "lucide-react";

const TOP_NAV_ITEMS = [
  { id: "playlist" as const, icon: Radio,  label: "直播源",  shortcut: "2" },
  { id: "editor"   as const, icon: Code2,  label: "代码编辑", shortcut: "3" },
  { id: "settings" as const, icon: Settings, label: "设置",  shortcut: "," },
] as const;

export function Sidebar() {
  const { activeNav, setActiveNav, sidebarCollapsed, setSidebarCollapsed, activeConfigId, setActiveConfigId } = useUIStore();
  const { cards } = useConfigCardsStore();
  const { source, sourceUrl, clearSource } = useTvBoxStore();

  // 配置管理子菜单展开状态
  const [configExpanded, setConfigExpanded] = useState(true);
  const MAX_VISIBLE = 8;

  // Group cards by directory (for local) or url (for remote)
    const groupedProjects = useMemo(() => {
    const sorted = [...cards].sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return b.updatedAt - a.updatedAt;
    });
    return sorted.slice(0, MAX_VISIBLE);
  }, [cards]);

  // 当工作区打开配置时，同步 activeConfigId
    useEffect(() => {
    if (!source) {
      setActiveConfigId(null);
      return;
    }
    const matched = cards.find((c) => sourceUrl.includes("/" + c.projectName + "/"));
    setActiveConfigId(matched?.id ?? null);
  }, [source, sourceUrl, cards, setActiveConfigId]);

  const handleConfigNavClick = () => {
    if (sidebarCollapsed) {
      setActiveNav("config");
      return;
    }
    if (activeNav !== "config") {
      setActiveNav("config");
      setConfigExpanded(true);
    } else {
      setConfigExpanded((v) => !v);
    }
  };

  const handleProjectClick = (project: any) => {
    setActiveNav("config");
    // Get the active card in this project, or the most recent one
    let targetCard = project.cards.find((c: any) => c.id === activeConfigId);
    if (!targetCard) targetCard = project.cards[0];
    
    setActiveConfigId(targetCard.id);
    window.dispatchEvent(
      new CustomEvent("sidebar:openConfig", {
        detail: { id: targetCard.id, url: targetCard.url || (targetCard.path ? `file://${targetCard.path}` : ""), path: targetCard.path },
      })
    );
  };

  const handleNewConfig = () => {
    setActiveNav("config");
    window.dispatchEvent(new CustomEvent("sidebar:newConfig"));
  };

  const isConfigActive = activeNav === "config";

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-sidebar transition-all duration-200 flex-shrink-0 overflow-hidden",
        sidebarCollapsed ? "w-12" : "w-52"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-3 border-b border-sidebar-border flex-shrink-0",
          sidebarCollapsed && "justify-center px-0"
        )}
      >
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-xs">TV</span>
        </div>
        {!sidebarCollapsed && (
          <span className="font-semibold text-sm text-sidebar-foreground truncate">TVBox Studio</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-1.5 space-y-0.5">

        {/* ── 配置管理（可展开二级菜单）── */}
        <div>
          <button
            onClick={handleConfigNavClick}
            title={sidebarCollapsed ? "配置管理 (1)" : undefined}
            className={cn(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
              "text-sidebar-foreground hover:bg-sidebar-accent/20 hover:text-foreground",
              isConfigActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
              sidebarCollapsed && "justify-center px-0"
            )}
          >
            <List className="h-4 w-4 flex-shrink-0" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 truncate text-left">配置管理</span>
                <kbd className="text-[10px] text-muted-foreground font-mono opacity-60 mr-0.5">1</kbd>
                {configExpanded
                  ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  : <ChevronRightSm className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                }
              </>
            )}
          </button>

          {/* 二级菜单：项目列表 */}
          {!sidebarCollapsed && configExpanded && (
            <div className="mt-0.5 ml-3 pl-2.5 border-l border-sidebar-border/60 space-y-0.5">
              {/* 配置中心入口 */}
              <button
                onClick={() => { setActiveNav("config"); window.dispatchEvent(new CustomEvent("sidebar:newConfig")); }}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                  "text-sidebar-foreground hover:bg-sidebar-accent/20 hover:text-foreground",
                  isConfigActive && !source && "bg-primary/10 text-primary font-medium"
                )}
              >
                <Layers className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-left">配置中心</span>
              </button>

              {/* 分隔 */}
              {groupedProjects.length > 0 && (
                <div className="pt-0.5 pb-0.5">
                  <div className="text-[10px] font-semibold text-muted-foreground/60 px-2 pb-0.5 uppercase tracking-wide">
                    最近项目
                  </div>
                </div>
              )}

              {/* 项目列表 */}
              {groupedProjects.map((project: any) => {
                const isProjectActive = (activeConfigId === project.id);

                return (
                  <button
                    key={project.id}
                    onClick={() => handleProjectClick(project)}
                    title={project.projectName}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors group/card",
                      "text-sidebar-foreground hover:bg-sidebar-accent/20 hover:text-foreground",
                      isProjectActive && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    {true ? (
                      <HardDrive className={cn("h-3 w-3 flex-shrink-0", isProjectActive ? "text-primary" : "text-yellow-500")} />
                    ) : (
                      <Globe className={cn("h-3 w-3 flex-shrink-0", isProjectActive ? "text-primary" : "text-blue-400")} />
                    )}
                    <span className="flex-1 truncate text-left leading-tight">{project.projectName}</span>
                    {project.favorite && (
                      <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}

              {/* 超出 MAX_VISIBLE 时显示省略提示 */}
              {cards.length > 0 && groupedProjects.length === MAX_VISIBLE && (
                <button
                  onClick={() => { setActiveNav("config"); window.dispatchEvent(new CustomEvent("sidebar:newConfig")); }}
                  className="w-full text-left text-[10px] text-muted-foreground/70 hover:text-primary px-2 py-1 transition-colors"
                >
                  查看全部项目 →
                </button>
              )}

              {/* 新建配置快捷入口 */}
              <button
                onClick={handleNewConfig}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                  "text-muted-foreground hover:bg-sidebar-accent/20 hover:text-primary border border-dashed border-transparent hover:border-primary/30 mt-0.5"
                )}
              >
                <Plus className="h-3.5 w-3.5 flex-shrink-0" />
                <span>新建配置</span>
              </button>
            </div>
          )}
        </div>

        {/* ── 其他导航项 ── */}
        {TOP_NAV_ITEMS.map(({ id, icon: Icon, label, shortcut }) => (
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
      <div className="p-1.5 border-t border-sidebar-border flex-shrink-0">
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
