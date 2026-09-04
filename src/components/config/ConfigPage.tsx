import React, { useState, useCallback, useEffect, useRef } from "react";
import { useTvBoxStore, useUIStore, useHistoryStore, useConfigCardsStore, useSettingsStore } from "../../store";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { cn } from "../../lib/utils";
import { getContent, readFile } from "../../lib/tauri";
import {
  Upload, Download, RefreshCw, Merge, Link, Clock,
  Shield, Radio, Film, Puzzle, Filter, Settings2, Layers, Flag, Volume2, HardDrive,
  Globe, ChevronDown, Check, AlertCircle, Plus, Search,
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
import { HistoryDialog } from "./HistoryDialog";
import { LocalizeDialog } from "./LocalizeDialog";
import { ConfigManagerView } from "./manager/ConfigManagerView";

type TabId = "basic" | "sites" | "lives" | "parses" | "doh" | "ads" | "flags" | "ijk" | "rules";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "basic",  label: "基础信息", icon: Settings2 },
  { id: "sites",  label: "爬虫规则", icon: Film },
  { id: "lives",  label: "直播规则", icon: Radio },
  { id: "parses", label: "解析接口", icon: Puzzle },
  { id: "doh",    label: "网络 / DoH", icon: Globe },
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
  const { addToast } = useUIStore();
  const { add: addHistory } = useHistoryStore();
  const { cards, upsert: upsertConfigCard } = useConfigCardsStore();

  const [activeTab, setActiveTab] = useState<TabId>("basic");
  const [urlInput, setUrlInput] = useState(sourceUrl);
  const [showMerge, setShowMerge] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showLocalize, setShowLocalize] = useState(false);

  // 快速配置切换器下拉
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [switcherSearch, setSwitcherSearch] = useState("");
  const switcherRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭切换器
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setShowSwitcher(false);
      }
    };
    if (showSwitcher) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSwitcher]);

  // 页面级快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (e.shiftKey) handleSaveLocal(true);
        else handleSaveLocal(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "m") {
        e.preventDefault();
        if (source) setShowMerge(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [source]);

  const handleLoad = useCallback(async () => {
    const url = urlInput.trim();
    if (!url) return;
    try {
      await loadFromUrl(url, getContent);
      setSourceUrl(url);
      const loaded = useTvBoxStore.getState().source;
      upsertConfigCard({
        name: loaded?.name || url.split(/[\\/]/).pop() || url,
        path: loaded?.path || url,
        url,
        sites: loaded?.sites.length ?? 0,
        lives: loaded?.lives.length ?? 0,
        parses: loaded?.parses?.length ?? 0,
        spider: loaded?.spider,
      });
      addHistory({ url, type: "tvbox" });
      addToast({ type: "success", message: "配置加载成功" });
      setActiveTab("basic");
    } catch (e) {
      addToast({ type: "error", message: `加载失败: ${e}` });
    }
  }, [urlInput, loadFromUrl, setSourceUrl, upsertConfigCard, addHistory, addToast]);

  const handleCardSelect = useCallback(async (
    url: string,
    tab?: "sites" | "lives" | "parses" | "basic",
    targetLocalPath?: string,
    customName?: string
  ) => {
    if (!url) {
      loadFromText(JSON.stringify({ sites: [], lives: [] }), "");
      setUrlInput("");
      setActiveTab(tab ?? "basic");
      return;
    }

    if (url.startsWith("blank://")) {
      const decoded = decodeURIComponent(url.slice(8));
      let effectiveUrl = "";
      if (targetLocalPath) {
        try {
          const { writeFile: writeLocal, setServerResourceDir, serverCache } = await import("../../lib/tauri");
          await writeLocal(targetLocalPath, decoded);
          const dir = targetLocalPath.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
          if (dir && dir !== targetLocalPath) {
            await setServerResourceDir(dir).catch(() => {});
          }
          await serverCache("tvbox.json", decoded).catch(() => {});
          effectiveUrl = `file://${targetLocalPath}`;
        } catch (err) {
          console.error("创建本地配置文件失败:", err);
        }
      }
      loadFromText(decoded, effectiveUrl);
      if (targetLocalPath) {
        useTvBoxStore.getState().setSourcePath(targetLocalPath);
        if (customName) {
          useTvBoxStore.getState().updateSource({ name: customName, path: targetLocalPath });
        }
      }
      setUrlInput(effectiveUrl);
      setActiveTab(tab ?? "basic");
      return;
    }

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
        // 如果创建向导指定了本地子目录保存路径，则拉取网络配置后立即直接落盘到指定子目录
        if (targetLocalPath) {
          try {
            const { writeFile: writeLocal, setServerResourceDir, serverCache } = await import("../../lib/tauri");
            const loaded = useTvBoxStore.getState().source;
            if (loaded) {
              if (customName) loaded.name = customName;
              loaded.path = targetLocalPath;
            }
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
      upsertConfigCard({
        name: customName || loaded?.name || url.split(/[\\/]/).pop() || url,
        path: targetLocalPath || loaded?.path || url,
        url,
        sites: loaded?.sites.length ?? 0,
        lives: loaded?.lives.length ?? 0,
        parses: loaded?.parses?.length ?? 0,
        spider: loaded?.spider,
      });
      const rootSaveDir = useSettingsStore.getState().settings.saveDir || "./box";
      const { writeConfigsRecord } = await import("../../lib/configRecords");
      await writeConfigsRecord(rootSaveDir, useConfigCardsStore.getState().cards).catch(() => {});

      setUrlInput(url);
      setActiveTab(tab ?? "basic");
    } catch (e) {
      addToast({ type: "error", message: `配置加载失败: ${e}` });
    }
  }, [loadFromUrl, loadFromText, setSourceUrl, upsertConfigCard, addToast]);

  // 安全切换或返回配置库检查
  const handleSafeSwitch = (action: () => void) => {
    if (isDirty) {
      const confirmed = window.confirm("当前配置存在未保存的修改，切换或退出将丢失这些修改。确定继续吗？");
      if (!confirmed) return;
    }
    action();
  };

  const handleLoadFile = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const path = await open({ filters: [{ name: "JSON", extensions: ["json", "txt"] }] });
      if (!path || typeof path !== "string") return;
      const { readFile: readLocal, setServerResourceDir, serverCache } = await import("../../lib/tauri");
      const text = await readLocal(path);
      loadFromText(text, `file://${path}`);
      useTvBoxStore.getState().setSourcePath(path);
      const dir = path.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
      if (dir && dir !== path) {
        await setServerResourceDir(dir).catch(() => {});
      }
      await serverCache("tvbox.json", text).catch(() => {});

      const loaded = useTvBoxStore.getState().source;
      upsertConfigCard({
        name: loaded?.name || path.split(/[\\/]/).pop() || path,
        path: loaded?.path || path,
        url: `file://${path}`,
        sites: loaded?.sites.length ?? 0,
        lives: loaded?.lives.length ?? 0,
        parses: loaded?.parses?.length ?? 0,
        spider: loaded?.spider,
      });
      setUrlInput(`file://${path}`);
      addToast({ type: "success", message: "文件加载成功" });
    } catch (e) {
      addToast({ type: "error", message: `打开文件失败: ${e}` });
    }
  }, [loadFromText, upsertConfigCard, addToast]);

  const handleSaveLocal = useCallback(async (forceDialog = false) => {
    const json = getJson();
    if (!json) return;
    try {
      const currentPath = source?.path || sourcePath;
      let path = (!forceDialog && currentPath) ? currentPath : "";
      if (path.startsWith("file://")) {
        path = decodeURIComponent(path.slice(7));
      }

      if (!path) {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const defaultName = (source?.name || "config").replace(/[^\w\u4e00-\u9fa5]+/g, "_");
        const chosen = await save({
          filters: [{ name: "JSON", extensions: ["json"] }],
          defaultPath: `${defaultName}.json`,
        });
        if (!chosen) return;
        path = chosen;
      }

      const { writeFile: writeLocal, setServerResourceDir, serverCache } = await import("../../lib/tauri");
      const fileName = path.replace(/\\/g, "/").split("/").pop()?.replace(/\.[^.]+$/, "") ?? "TVBox 配置";
      useTvBoxStore.getState().updateSource({
        path,
        name: useTvBoxStore.getState().source?.name || fileName,
      });
      const updatedJson = useTvBoxStore.getState().getJson();
      await writeLocal(path, updatedJson);

      const dir = path.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
      if (dir && dir !== path) {
        await setServerResourceDir(dir).catch(() => {});
      }
      await serverCache("tvbox.json", updatedJson).catch(() => {});

      const saved = useTvBoxStore.getState().source;
      upsertConfigCard({
        name: saved?.name || fileName,
        path,
        url: `file://${path}`,
        sites: saved?.sites.length ?? 0,
        lives: saved?.lives.length ?? 0,
        parses: saved?.parses?.length ?? 0,
        spider: saved?.spider,
      });
      const rootSaveDir = useSettingsStore.getState().settings.saveDir || "./box";
      const { writeConfigsRecord } = await import("../../lib/configRecords");
      await writeConfigsRecord(rootSaveDir, useConfigCardsStore.getState().cards).catch(() => {});

      setUrlInput(`file://${path}`);
      addToast({ type: "success", message: `已保存到 ${path}` });
      useTvBoxStore.getState().setDirty(false);
      useTvBoxStore.getState().setSourcePath(path);
    } catch (e) {
      addToast({ type: "error", message: `保存失败: ${e}` });
    }
  }, [getJson, source?.path, sourcePath, upsertConfigCard, addToast]);

  const sourceCounts = source
    ? {
        sites: source.sites.length,
        lives: source.lives.length,
        parses: source.parses?.length ?? 0,
        doh: (source.doh?.length ?? 0) + (source.hosts?.length ?? 0),
        ads: source.ads?.length ?? 0,
        flags: source.flags?.length ?? 0,
        ijk: source.ijk?.length ?? 0,
        rules: source.rules?.length ?? 0,
      }
    : null;

  // 活跃配置相关信息
  const activeConfigName = source?.name || (urlInput ? urlInput.split(/[\\/]/).pop() : "当前未命名配置");
  const isCurrentLocal = urlInput.startsWith("file://") || (!urlInput.startsWith("http://") && !urlInput.startsWith("https://"));

  // 切换器过滤
  const filteredSwitcherCards = cards.filter((c) => {
    if (!switcherSearch.trim()) return true;
    const q = switcherSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.url || c.path).toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col h-full">
      {/* 顶部综合工具栏 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card flex-shrink-0">
        {/* 如果配置已加载：显示当前配置指示胶囊与快速切换下拉器 */}
        {source ? (
          <div className="relative" ref={switcherRef}>
            <button
              onClick={() => setShowSwitcher(!showSwitcher)}
              className={cn(
                "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted/50 text-xs font-medium transition-colors max-w-xs sm:max-w-sm",
                showSwitcher && "ring-1 ring-primary border-primary"
              )}
              title="点击快速切换配置"
            >
              {isCurrentLocal ? (
                <HardDrive className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
              ) : (
                <Globe className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
              )}
              <span className="truncate text-foreground font-semibold">{activeConfigName}</span>
              <Badge variant={isCurrentLocal ? "warning" : "default"} className="text-[10px] px-1.5 py-0 flex-shrink-0">
                {isCurrentLocal ? "本地" : "网络"}
              </Badge>
              {isDirty && (
                <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0 animate-pulse" title="有未保存修改" />
              )}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto flex-shrink-0" />
            </button>

            {/* 快速切换下拉菜单 */}
            {showSwitcher && (
              <div className="absolute left-0 top-full mt-1.5 w-84 sm:w-96 rounded-xl border border-border bg-card text-card-foreground p-2.5 shadow-2xl z-50 text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    <span>快速切换配置</span>
                    <span className="text-[10px] text-muted-foreground font-normal">({cards.length})</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowSwitcher(false);
                      handleSafeSwitch(clearSource);
                    }}
                    className="text-primary hover:underline text-[11px] flex items-center gap-1 font-medium"
                  >
                    配置中心 &rarr;
                  </button>
                </div>

                {/* 快速搜索 */}
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={switcherSearch}
                    onChange={(e) => setSwitcherSearch(e.target.value)}
                    placeholder="按名称或路径快速检索..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* 配置项列表 */}
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {filteredSwitcherCards.map((card) => {
                    const isPathMatch =
                      (card.url && card.url === urlInput) ||
                      (card.path && (card.path === urlInput || `file://${card.path}` === urlInput));
                    const isTargetActive =
                      isPathMatch &&
                      (card.name === activeConfigName ||
                        !filteredSwitcherCards.some(
                          (c) =>
                            c.name === activeConfigName &&
                            ((c.url && c.url === urlInput) ||
                              (c.path && (c.path === urlInput || `file://${c.path}` === urlInput)))
                        ));
                    return (
                      <button
                        key={card.id}
                        onClick={() => {
                          setShowSwitcher(false);
                          if (!isTargetActive) {
                            handleSafeSwitch(() => handleCardSelect(card.url || card.path));
                          }
                        }}
                        className={cn(
                          "w-full text-left p-2 rounded-lg flex items-center justify-between gap-2 transition-colors border",
                          isTargetActive
                            ? "bg-primary/10 text-primary font-semibold border-primary/30"
                            : "hover:bg-muted text-foreground border-transparent"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs flex items-center gap-1.5">
                            <span className="truncate">{card.name}</span>
                            {card.path && (
                              <span className="text-[9px] px-1 py-0 rounded bg-muted text-muted-foreground flex-shrink-0">本地</span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono truncate">{card.url || card.path}</div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 text-[10px] text-muted-foreground">
                          <span>{card.sites ?? 0}点播</span>
                          {isTargetActive && <Check className="h-3.5 w-3.5 text-primary" />}
                        </div>
                      </button>
                    );
                  })}
                  {filteredSwitcherCards.length === 0 && (
                    <div className="py-5 text-center text-muted-foreground text-xs">
                      无匹配的配置
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* URL 输入区 */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Link className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoad()}
            placeholder="输入TVBox JSON配置链接，或拖入本地文件..."
            className="flex-1 text-xs font-mono"
          />
        </div>

        {/* 操作按钮组 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="primary"
            onClick={handleLoad}
            loading={loading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            加载
          </Button>
          <Button
            variant="outline"
            onClick={handleLoadFile}
            icon={<Upload className="h-3.5 w-3.5" />}
          >
            打开
          </Button>
          <Button
            variant={source ? "outline" : "primary"}
            onClick={() => handleSafeSwitch(clearSource)}
            icon={<Layers className="h-3.5 w-3.5" />}
            title="返回多配置管理中心"
          >
            配置中心
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowHistory(true)}
            icon={<Clock className="h-3.5 w-3.5" />}
            title="历史记录"
          />
          <div className="h-5 w-px bg-border" />
          <Button
            variant="outline"
            onClick={() => setShowMerge(true)}
            disabled={!source}
            icon={<Merge className="h-3.5 w-3.5" />}
          >
            合并
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSaveLocal(false)}
            disabled={!source}
            icon={<Download className="h-3.5 w-3.5" />}
            title="直接保存到当前文件 (Ctrl+S)"
          >
            保存
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSaveLocal(true)}
            disabled={!source}
            className="px-2 text-xs"
            title="另存为新文件 (Ctrl+Shift+S)"
          >
            另存为
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowLocalize(true)}
            disabled={!source}
            title="资源本地化"
            icon={<HardDrive className="h-3.5 w-3.5" />}
          >
            本地化
          </Button>
          <Button
            variant={isDirty ? "primary" : "outline"}
            onClick={() => setShowPublish(true)}
            disabled={!source}
            icon={<Shield className="h-3.5 w-3.5" />}
          >
            发布
          </Button>
        </div>
      </div>

      {/* 未加载状态：多配置管理中心 */}
      {!source && !loading && (
        <ConfigManagerView
          onSelect={handleCardSelect}
          onOpenLocalFileDialog={handleLoadFile}
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

      {/* 主内容区（8 个 Tab 规则编辑） */}
      {source && !loading && (
        <div className="flex-1 flex flex-col overflow-hidden">
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

            {/* 脏标记提示 */}
            {isDirty && (
              <div className="ml-auto flex items-center gap-1.5 pr-2 text-xs text-yellow-600 dark:text-yellow-400">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                未保存的修改
              </div>
            )}
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

      {/* 弹窗组件 */}
      <MergeDialog open={showMerge} onClose={() => setShowMerge(false)} />
      <SaveDialog open={showSave} onClose={() => setShowSave(false)} />
      <PublishDialog open={showPublish} onClose={() => setShowPublish(false)} />
      <LocalizeDialog open={showLocalize} onClose={() => setShowLocalize(false)} sourceUrl={sourceUrl} />
      <HistoryDialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onSelect={(url) => { setUrlInput(url); setShowHistory(false); }}
      />
    </div>
  );
}
