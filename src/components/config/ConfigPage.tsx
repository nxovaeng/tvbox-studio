import React, { useState, useCallback, useEffect } from "react";
import { useTvBoxStore, useUIStore, useHistoryStore } from "../../store";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { cn } from "../../lib/utils";
import { getContent } from "../../lib/tauri";
import {
  Upload, Download, RefreshCw, Merge, Link, Clock,
  Shield, Radio, Film, Puzzle, Filter, Settings2, Layers, Flag, Volume2, HardDrive,
} from "lucide-react";
import { SitesTab } from "./tabs/SitesTab";
import { LivesTab } from "./tabs/LivesTab";
import { ParsesTab } from "./tabs/ParsesTab";
import { BasicTab } from "./tabs/BasicTab";
import { AdsTab } from "./tabs/AdsTab";
import { FlagsTab } from "./tabs/FlagsTab";
import { IjkTab } from "./tabs/IjkTab";
import { RulesTab } from "./tabs/RulesTab";
import { MergeDialog } from "./MergeDialog";
import { SaveDialog } from "./SaveDialog";
import { PublishDialog } from "./PublishDialog";
import { HistoryDialog } from "./HistoryDialog";
import { LocalizeDialog } from "./LocalizeDialog";

type TabId = "basic" | "sites" | "lives" | "parses" | "ads" | "flags" | "ijk" | "rules";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "basic",  label: "基础信息", icon: Settings2 },
  { id: "sites",  label: "爬虫规则", icon: Film },
  { id: "lives",  label: "直播规则", icon: Radio },
  { id: "parses", label: "解析接口", icon: Puzzle },
  { id: "ads",    label: "广告过滤", icon: Filter },
  { id: "flags",  label: "VIP标识",  icon: Flag },
  { id: "ijk",    label: "IJK参数",  icon: Volume2 },
  { id: "rules",  label: "提取规则", icon: Layers },
];

export function ConfigPage() {
  const {
    source, sourceUrl, isDirty, loading,
    setSourceUrl, loadFromUrl, loadFromText, clearSource, getJson,
  } = useTvBoxStore();
  const { addToast } = useUIStore();
  const { add: addHistory } = useHistoryStore();

  const [activeTab, setActiveTab] = useState<TabId>("basic");
  const [urlInput, setUrlInput] = useState(sourceUrl);
  const [showMerge, setShowMerge] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showLocalize, setShowLocalize] = useState(false);

  // 页面级快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (e.shiftKey) setShowPublish(true);
        else handleSaveLocal();
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
      addHistory({ url, type: "tvbox" });
      addToast({ type: "success", message: "配置加载成功" });
      setActiveTab("basic");
    } catch (e) {
      addToast({ type: "error", message: `加载失败: ${e}` });
    }
  }, [urlInput, loadFromUrl, setSourceUrl, addHistory, addToast]);

  const handleLoadFile = useCallback(async () => {
    // 使用 Tauri dialog 选择文件
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const path = await open({ filters: [{ name: "JSON", extensions: ["json", "txt"] }] });
      if (!path || typeof path !== "string") return;
      const { readFile } = await import("../../lib/tauri");
      const text = await readFile(path);
      loadFromText(text, `file://${path}`);
      setUrlInput(`file://${path}`);
      addToast({ type: "success", message: "文件加载成功" });
    } catch (e) {
      addToast({ type: "error", message: `打开文件失败: ${e}` });
    }
  }, [loadFromText, addToast]);

  const handleSaveLocal = useCallback(async () => {
    const json = getJson();
    if (!json) return;
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const path = await save({
        filters: [{ name: "JSON", extensions: ["json"] }],
        defaultPath: "tvbox.json",
      });
      if (!path) return;
      const { writeFile } = await import("../../lib/tauri");
      await writeFile(path, json);
      addToast({ type: "success", message: `已保存到 ${path}` });
      useTvBoxStore.getState().setDirty(false);
      useTvBoxStore.getState().setSourcePath(path);
    } catch (e) {
      addToast({ type: "error", message: `保存失败: ${e}` });
    }
  }, [getJson, addToast]);

  const sourceCounts = source
    ? {
        sites: source.sites.length,
        lives: source.lives.length,
        parses: source.parses?.length ?? 0,
        ads: source.ads?.length ?? 0,
        flags: source.flags?.length ?? 0,
        ijk: source.ijk?.length ?? 0,
        rules: source.rules?.length ?? 0,
      }
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* 顶部工具栏 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card flex-shrink-0">
        {/* URL 输入区 */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Link className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoad()}
            placeholder="输入TVBox JSON配置链接，或拖入本地文件..."
            className="flex-1"
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
            onClick={handleSaveLocal}
            disabled={!source}
            icon={<Download className="h-3.5 w-3.5" />}
          >
            保存
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

      {/* 未加载状态 */}
      {!source && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Link className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">暂无配置</p>
            <p className="text-sm text-muted-foreground mt-1">
              输入 TVBox JSON 链接并点击「加载」，或点击「打开」选择本地文件
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => setUrlInput("")} icon={<Link className="h-3.5 w-3.5" />}>
              输入链接
            </Button>
            <Button variant="outline" onClick={handleLoadFile} icon={<Upload className="h-3.5 w-3.5" />}>
              打开文件
            </Button>
            <Button variant="outline" onClick={() => setShowHistory(true)} icon={<Clock className="h-3.5 w-3.5" />}>
              历史记录
            </Button>
          </div>
        </div>
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

      {/* 主内容区 */}
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
            {activeTab === "ads"    && <AdsTab />}
            {activeTab === "flags"  && <FlagsTab />}
            {activeTab === "ijk"    && <IjkTab />}
            {activeTab === "rules"  && <RulesTab />}
          </div>
        </div>
      )}

      {/* 弹窗 */}
      <MergeDialog open={showMerge} onClose={() => setShowMerge(false)} />
      <SaveDialog open={showSave} onClose={() => setShowSave(false)} />
      <PublishDialog open={showPublish} onClose={() => setShowPublish(false)} />
      <LocalizeDialog open={showLocalize} onClose={() => setShowLocalize(false)} />
      <HistoryDialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onSelect={(url) => { setUrlInput(url); setShowHistory(false); }}
      />
    </div>
  );
}
