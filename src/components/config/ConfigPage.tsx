import React, { useState, useCallback, useEffect, useRef } from "react";
import { useTvBoxStore, useUIStore, useConfigCardsStore, useSettingsStore } from "../../store";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Dialog } from "../ui/Dialog";
import { Input } from "../ui/Input";
import { cn } from "../../lib/utils";
import { getContent, readFile, writeFile as tauriWriteFile } from "../../lib/tauri";
import {
  Download, RefreshCw, Merge, Upload,
  Shield, Radio, Film, Puzzle, Filter, Settings2, Layers, Flag, Volume2,
  HardDrive, Globe, FileJson,
} from "lucide-react";
import { SitesTab } from "./tabs/SitesTab";
import { LivesTab } from "./tabs/LivesTab";
import { ParsesTab } from "./tabs/ParsesTab";
import { BasicTab } from "./tabs/BasicTab";
import { AdsTab } from "./tabs/AdsTab";
import { FlagsTab } from "./tabs/FlagsTab";
import { IjkTab } from "./tabs/IjkTab";
import { RulesTab } from "./tabs/RulesTab";
import { DohTab } from "./tabs/DohTab";
import { MergeDialog } from "./MergeDialog";
import { SaveDialog } from "./SaveDialog";
import { PublishDialog } from "./PublishDialog";
import { LocalizeDialog } from "./LocalizeDialog";
import { ConfigManagerView } from "./manager/ConfigManagerView";

type TabId = "basic" | "sites" | "lives" | "parses" | "doh" | "ads" | "flags" | "ijk" | "rules";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "basic",  label: "基础信息", icon: Settings2 },
  { id: "sites",  label: "爬虫规则", icon: Film },
  { id: "lives",  label: "直播规则", icon: Radio },
  { id: "parses", label: "解析接口", icon: Puzzle },
  { id: "doh",    label: "网络/DoH",  icon: Globe },
  { id: "ads",    label: "广告过滤", icon: Filter },
  { id: "flags",  label: "VIP标识",  icon: Flag },
  { id: "ijk",    label: "IJK参数",  icon: Volume2 },
  { id: "rules",  label: "提取规则", icon: Layers },
];

export function ConfigPage() {
  const {
    source, sourceUrl, sourcePath, isDirty, loading,
    setSourceUrl, loadFromUrl, loadFromText, clearSource, getJson,
  } = useTvBoxStore();
  const { addToast, setActiveConfigId } = useUIStore();
  const { cards, upsert: upsertConfigCard } = useConfigCardsStore();

  const [activeTab, setActiveTab] = useState<TabId>("basic");
  const [showMerge, setShowMerge] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showLocalize, setShowLocalize] = useState(false);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [saveAsName, setSaveAsName] = useState("");

  // ── 推导当前配置的专属子目录 ──
  const getSubDir = useCallback((): string => {
    const raw = sourcePath || source?.path || "";
    const p = raw.startsWith("file://") ? decodeURIComponent(raw.slice(7)) : raw;
    if (!p) return "";
    return p.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
  }, [sourcePath, source?.path]);

  // ── 获取同级目录下的其他配置 ──
  
  const activeProject = React.useMemo(() => {
    const subDir = getSubDir();
    if (!subDir) return null;
    const projName = subDir.split("/").pop();
    return cards.find(c => c.projectName === projName);
  }, [cards, getSubDir]);

  const siblingConfigs = activeProject ? activeProject.configs : [];


  // ── 核心：加载配置（侧边栏点击、配置中心点击、创建后进入）──
  const handleCardSelect = useCallback(async (
    url: string,
    tab?: any,
    cardId?: string,
    targetLocalPath?: string,
    customName?: string
  ) => {
    const { sourceUrl, isDirty } = useTvBoxStore.getState();

    // 拦截重复点击
    if (sourceUrl && url && !url.startsWith("blank://")) {
      const isSame = sourceUrl === url || (targetLocalPath && sourceUrl === `file://${targetLocalPath}`);
      if (isSame) {
        if (cardId) setActiveConfigId(cardId);
        setActiveTab(tab ?? "basic");
        return;
      }
    }

    if (isDirty) {
      const ok = window.confirm("当前配置有未保存的修改，确认要放弃修改并切换吗？");
      if (!ok) return;
    }

    if (!url) {
      loadFromText(JSON.stringify({ sites: [], lives: [] }), "");
      setActiveTab(tab ?? "basic");
      return;
    }

    // 空白配置（来自模板 / 新建）
    if (url.startsWith("blank://")) {
      const decoded = decodeURIComponent(url.slice(8));
      // 剔除顶层 name/path 后写入文件
      let cleanContent = decoded;
      try {
        const parsed = JSON.parse(decoded);
        delete parsed.name;
        delete parsed.path;
        cleanContent = JSON.stringify(parsed, null, 2);
      } catch { /* keep raw */ }

      let effectiveUrl = "";
      if (targetLocalPath) {
        try {
          const { writeFile: writeLocal, setServerResourceDir, serverCache } = await import("../../lib/tauri");
          await writeLocal(targetLocalPath, cleanContent);
          const dir = targetLocalPath.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
          if (dir && dir !== targetLocalPath) {
            await setServerResourceDir(dir).catch(() => {});
          }
          await serverCache("tvbox.json", cleanContent).catch(() => {});
          effectiveUrl = `file://${targetLocalPath}`;
        } catch (err) {
          console.error("创建本地配置文件失败:", err);
        }
      }
      loadFromText(cleanContent, effectiveUrl);
      if (targetLocalPath) {
        useTvBoxStore.getState().setSourcePath(targetLocalPath);
        if (customName) {
          useTvBoxStore.getState().updateSource({ name: customName, path: targetLocalPath });
        }
      }
      if (cardId) setActiveConfigId(cardId);
      setActiveTab(tab ?? "basic");
      return;
    }

    // 正常加载
    try {
      if (url.startsWith("file://")) {
        const localPath = decodeURIComponent(url.slice(7));
        const content = await readFile(localPath);
        loadFromText(content, url);
        useTvBoxStore.getState().setSourcePath(localPath);
        const { setServerResourceDir, serverCache } = await import("../../lib/tauri");
        const dir = localPath.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
        if (dir && dir !== localPath) {
          await setServerResourceDir(dir).catch(() => {});
        }
        await serverCache("tvbox.json", content).catch(() => {});
      } else {
        await loadFromUrl(url, getContent);
        // 网络配置且指定了本地落盘路径
        if (targetLocalPath) {
          try {
            const { writeFile: writeLocal, setServerResourceDir, serverCache } = await import("../../lib/tauri");
            const loaded = useTvBoxStore.getState().source;
            if (loaded && customName) loaded.name = customName;
            const jsonText = useTvBoxStore.getState().getJson();
            await writeLocal(targetLocalPath, jsonText);
            const dir = targetLocalPath.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
            if (dir && dir !== targetLocalPath) {
              await setServerResourceDir(dir).catch(() => {});
            }
            await serverCache("tvbox.json", jsonText).catch(() => {});
            useTvBoxStore.getState().setSourcePath(targetLocalPath);
            url = `file://${targetLocalPath}`;
            addToast({ type: "success", message: `已拉取网络配置并保存至 ${targetLocalPath}` });
          } catch (err) {
            console.error("网络配置保存到本地路径失败:", err);
          }
        }
      }
      setSourceUrl(url);
      const loaded = useTvBoxStore.getState().source;

      let targetId = cardId;
      if (!targetId) {
        const cards = useConfigCardsStore.getState().cards;
        const matched = cards.find(c => url.includes("/" + c.projectName + "/"));
        if (matched) targetId = matched.id;
      }

      
      // Sync project via scan
      import("../../lib/configRecords").then(({ scanAndSyncConfigsRecord }) => {
         const rootSaveDir = useSettingsStore.getState().settings.saveDir || "./box";
         scanAndSyncConfigsRecord(rootSaveDir, useConfigCardsStore.getState().cards).then(synced => {
             useConfigCardsStore.getState().importCards(synced);
         });
      });

      if (targetId) setActiveConfigId(targetId);
      setActiveTab(tab ?? "basic");
    } catch (e) {
      addToast({ type: "error", message: `加载失败: ${e}` });
    }
  }, [loadFromText, loadFromUrl, setSourceUrl, upsertConfigCard, addToast, setActiveConfigId, getContent]);

  // ── 侧边栏自定义事件监听 ──
  useEffect(() => {
    const handleSidebarOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.projectName && detail?.defaultConfig) {
        const rootSaveDir = (useSettingsStore.getState().settings.saveDir || "./box").replace(/\/+$/, "");
        const targetPath = `${rootSaveDir}/${detail.projectName}/${detail.defaultConfig}`;
        handleCardSelect(`file://${targetPath}`, "basic", detail.id);
      }
    };
    const handleSidebarNew = () => {
      const { isDirty } = useTvBoxStore.getState();
      if (isDirty) {
        const ok = window.confirm("当前配置有未保存的修改，确认要放弃修改吗？");
        if (!ok) return;
      }
      clearSource();
    };
    window.addEventListener("sidebar:openConfig", handleSidebarOpen);
    window.addEventListener("sidebar:newConfig", handleSidebarNew);
    return () => {
      window.removeEventListener("sidebar:openConfig", handleSidebarOpen);
      window.removeEventListener("sidebar:newConfig", handleSidebarNew);
    };
  }, [handleCardSelect, clearSource]);

  // ── 本地文件打开 ──
  const handleOpenLocalFile = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        filters: [{ name: "JSON / TXT", extensions: ["json", "txt"] }],
        multiple: false,
      });
      if (selected && typeof selected === "string") {
        handleCardSelect(`file://${selected}`, "basic");
      }
    } catch (err) {
      console.error("打开本地文件失败:", err);
    }
  }, [handleCardSelect]);

  // ── 保存 ──
  const handleSave = useCallback(async () => {
    try {
      let path = sourcePath || source?.path || "";
      if (path.startsWith("file://")) path = decodeURIComponent(path.slice(7));
      if (!path) {
        addToast({ type: "warning", message: "请先通过「另存为」指定保存路径" });
        setShowSaveAs(true);
        return;
      }
      const { setServerResourceDir, serverCache } = await import("../../lib/tauri");
      const updatedJson = useTvBoxStore.getState().getJson();
      await tauriWriteFile(path, updatedJson);
      const dir = path.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
      if (dir && dir !== path) {
        await setServerResourceDir(dir).catch(() => {});
      }
      await serverCache("tvbox.json", updatedJson).catch(() => {});
      const saved = useTvBoxStore.getState().source;
      
      import("../../lib/configRecords").then(({ scanAndSyncConfigsRecord }) => {
         const rootSaveDir = useSettingsStore.getState().settings.saveDir || "./box";
         scanAndSyncConfigsRecord(rootSaveDir, useConfigCardsStore.getState().cards).then(synced => {
             useConfigCardsStore.getState().importCards(synced);
         });
      });

      const rootSaveDir = useSettingsStore.getState().settings.saveDir || "./box";
      const { writeConfigsRecord } = await import("../../lib/configRecords");
      await writeConfigsRecord(rootSaveDir, useConfigCardsStore.getState().cards).catch(() => {});
      addToast({ type: "success", message: `已保存到 ${path}` });
      useTvBoxStore.getState().setDirty(false);
      useTvBoxStore.getState().setSourcePath(path);
    } catch (e) {
      addToast({ type: "error", message: `保存失败: ${e}` });
    }
  }, [sourcePath, source?.path, upsertConfigCard, addToast]);

  // ── 另存为 ──
  const handleSaveAs = useCallback(async () => {
    const subDir = getSubDir();
    const rawName = saveAsName.trim().replace(/\.json$/i, "");
    if (!rawName) {
      addToast({ type: "warning", message: "请输入文件名" });
      return;
    }

    let targetDir = subDir;
    if (!targetDir) {
      // 没有已知子目录，弹出系统文件保存框
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const chosen = await save({
          filters: [{ name: "JSON", extensions: ["json"] }],
          defaultPath: `${rawName}.json`,
        });
        if (!chosen) return;
        targetDir = chosen.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
        const newPath = chosen;
        const json = getJson();
        await tauriWriteFile(newPath, json);
        
      import("../../lib/configRecords").then(({ scanAndSyncConfigsRecord }) => {
         const rootSaveDir = useSettingsStore.getState().settings.saveDir || "./box";
         scanAndSyncConfigsRecord(rootSaveDir, useConfigCardsStore.getState().cards).then(synced => {
             useConfigCardsStore.getState().importCards(synced);
         });
      });

        setShowSaveAs(false);
        setSaveAsName("");
        addToast({ type: "success", message: `已另存为 ${newPath}` });
        useTvBoxStore.getState().setSourcePath(newPath);
        useTvBoxStore.getState().setDirty(false);
        return;
      } catch (e) {
        addToast({ type: "error", message: `另存为失败: ${e}` });
        return;
      }
    }

    const newPath = `${targetDir}/${rawName}.json`;
    const json = getJson();
    try {
      const { setServerResourceDir, serverCache } = await import("../../lib/tauri");
      await tauriWriteFile(newPath, json);
      await setServerResourceDir(targetDir).catch(() => {});
      await serverCache("tvbox.json", json).catch(() => {});
      
      import("../../lib/configRecords").then(({ scanAndSyncConfigsRecord }) => {
         const rootSaveDir = useSettingsStore.getState().settings.saveDir || "./box";
         scanAndSyncConfigsRecord(rootSaveDir, useConfigCardsStore.getState().cards).then(synced => {
             useConfigCardsStore.getState().importCards(synced);
         });
      });

      const rootSaveDir = useSettingsStore.getState().settings.saveDir || "./box";
      const { writeConfigsRecord } = await import("../../lib/configRecords");
      await writeConfigsRecord(rootSaveDir, useConfigCardsStore.getState().cards).catch(() => {});
      setShowSaveAs(false);
      setSaveAsName("");
      addToast({ type: "success", message: `已另存为 ${rawName}.json` });
      useTvBoxStore.getState().setSourcePath(newPath);
      useTvBoxStore.getState().setDirty(false);
    } catch (e) {
      addToast({ type: "error", message: `另存为失败: ${e}` });
    }
  }, [saveAsName, getJson, getSubDir, source, upsertConfigCard, addToast]);

  // ── 统计数 ──
  const sourceCounts = source ? {
    sites: source.sites.length,
    lives: source.lives.length,
    parses: source.parses?.length ?? 0,
    doh: (source.doh?.length ?? 0) + (source.hosts?.length ?? 0),
    ads: source.ads?.length ?? 0,
    flags: source.flags?.length ?? 0,
    ijk: source.ijk?.length ?? 0,
    rules: source.rules?.length ?? 0,
  } : null;

  const isCurrentLocal = sourceUrl.startsWith("file://") ||
    (!sourceUrl.startsWith("http://") && !sourceUrl.startsWith("https://"));

  // ── 渲染 ──
  return (
    <div className="flex flex-col h-full">

      {/* 未加载状态：配置管理中心 */}
      {!source && !loading && (
        <ConfigManagerView
          onSelect={handleCardSelect}
          onOpenLocalFileDialog={handleOpenLocalFile}
        />
      )}

      {/* 加载中 */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">正在加载配置...</p>
          </div>
        </div>
      )}

      {/* 工作区 */}
      {source && !loading && (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* 工作区顶部状态栏 */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card flex-shrink-0">
            {/* 配置名称 + 类型徽章 */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {isCurrentLocal
                ? <HardDrive className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                : <Globe className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
              }
              {isCurrentLocal && siblingConfigs.length > 1 ? (
                <select
                  className="text-sm font-semibold text-foreground bg-transparent border-none outline-none focus:ring-0 cursor-pointer max-w-[200px] truncate pr-4 appearance-none hover:text-primary transition-colors"
                  style={{ background: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E") no-repeat right center / 1.25rem 1.25rem` }}
                  value={sourceUrl.split(/[\\/]/).pop()}
                  onChange={(e) => {
                    const fileName = e.target.value;
                    const subDir = getSubDir();
                    const targetPath = `${subDir}/${fileName}`;
                    handleCardSelect(`file://${targetPath}`, activeTab, activeProject?.id, targetPath);
                  }}
                  title="切换同目录下的配置"
                >
                  {siblingConfigs.map((c: string) => (
                    <option key={c} value={c} className="text-foreground bg-background">
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm font-semibold truncate text-foreground">
                  {source.name || sourceUrl.split(/[\\/]/).pop() || "未命名配置"}
                </span>
              )}
              <Badge
                variant={isCurrentLocal ? "warning" : "default"}
                className="text-[10px] px-1.5 py-0 flex-shrink-0"
              >
                {isCurrentLocal ? "本地" : "网络"}
              </Badge>
              {isDirty && (
                <span
                  className="flex items-center gap-1 text-[11px] text-yellow-600 dark:text-yellow-400 flex-shrink-0"
                  title="有未保存修改"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                  未保存
                </span>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button variant="outline" size="sm"
                onClick={() => setShowMerge(true)}
                icon={<Merge className="h-3.5 w-3.5" />}>
                合并
              </Button>
              <Button variant="outline" size="sm"
                onClick={handleSave}
                icon={<Download className="h-3.5 w-3.5" />}
                title="保存">
                保存
              </Button>
              <Button variant="ghost" size="sm"
                onClick={() => { setSaveAsName(""); setShowSaveAs(true); }}
                title="另存为">
                另存为
              </Button>
              {!isCurrentLocal && (
                <Button variant="outline" size="sm"
                  onClick={() => setShowLocalize(true)}
                  icon={<HardDrive className="h-3.5 w-3.5" />}
                  title="资源本地化">
                  本地化
                </Button>
              )}
              <Button
                variant={isDirty ? "primary" : "outline"}
                size="sm"
                onClick={() => setShowPublish(true)}
                icon={<Shield className="h-3.5 w-3.5" />}>
                发布
              </Button>
            </div>
          </div>

          {/* Tab 标签栏 */}
          <div className="flex items-center gap-0.5 px-2 pt-1.5 border-b border-border bg-card flex-shrink-0 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => {
              const count = sourceCounts?.[id as keyof typeof sourceCounts];
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-t-md transition-colors whitespace-nowrap",
                    "border-b-2 -mb-px",
                    activeTab === id
                      ? "border-primary text-primary bg-background font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {count !== undefined && count > 0 && (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                      activeTab === id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab 内容 */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "basic"  && <BasicTab />}
            {activeTab === "sites"  && <SitesTab />}
            {activeTab === "lives"  && <LivesTab />}
            {activeTab === "parses" && <ParsesTab />}
            {activeTab === "doh"    && <DohTab />}
            {activeTab === "ads"    && <AdsTab />}
            {activeTab === "flags"  && <FlagsTab />}
            {activeTab === "ijk"    && <IjkTab />}
            {activeTab === "rules"  && <RulesTab />}
          </div>
        </div>
      )}

      {/* 弹窗 */}
      <MergeDialog open={showMerge} onClose={() => setShowMerge(false)} />
      <PublishDialog open={showPublish} onClose={() => setShowPublish(false)} />
      <LocalizeDialog open={showLocalize} onClose={() => setShowLocalize(false)} sourceUrl={sourceUrl} />

      {/* 另存为弹窗 */}
      <Dialog open={showSaveAs} onClose={() => setShowSaveAs(false)} title="另存为" size="sm">
        <div className="space-y-4 p-1">
          <div className="text-xs text-muted-foreground">
            将保存到配置的同级目录：
            <span className="font-mono ml-1 text-foreground">
              {getSubDir() || "（未知，将弹出系统保存框）"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={saveAsName}
              onChange={(e) => setSaveAsName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveAs()}
              placeholder="输入文件名（不含 .json）"
              autoFocus
            />
            <span className="text-sm text-muted-foreground flex-shrink-0">.json</span>
          </div>
          <div className="flex justify-end gap-2 pt-1 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setShowSaveAs(false)}>取消</Button>
            <Button variant="primary" size="sm" onClick={handleSaveAs}>保存</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
