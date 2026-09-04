import { useState, useMemo, useEffect, useCallback } from "react";
import {
  useConfigCardsStore,
  useUIStore,
  useSettingsStore,
  type ConfigCard,
} from "../../../store";
import {
  scanAndSyncConfigsRecord,
  writeConfigsRecord,
} from "../../../lib/configRecords";
import { serializeTvBoxSource } from "../../../lib/localize";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { cn } from "../../../lib/utils";
import {
  Search, Plus, FolderOpen, Star, Globe, HardDrive,
  LayoutGrid, List, Layers, Trash2, ArrowUpDown, RefreshCw,
  Film, Radio, Download,
} from "lucide-react";
import { ConfigCardItem } from "./ConfigCardItem";
import { ConfigListItem } from "./ConfigListItem";
import { ConfigEditModal } from "./ConfigEditModal";
import { ConfigPreviewModal } from "./ConfigPreviewModal";
import { ConfigCreateModal } from "./ConfigCreateModal";
import { ConfigBackupModal } from "./ConfigBackupModal";

interface Props {
  onSelect: (
    url: string,
    tab?: "sites" | "lives" | "parses" | "basic",
    cardId?: string,
    targetPath?: string,
    customName?: string
  ) => void;
  onOpenLocalFileDialog: () => void;
}

type ScopeFilter = "all" | "favorite";
type SortOption = "updated" | "name" | "sites" | "lives";

export function ConfigManagerView({ onSelect, onOpenLocalFileDialog }: Props) {
  const { cards, upsert, update, remove, removeBatch, toggleFavorite, duplicateCard, importCards } = useConfigCardsStore();
  const { addToast } = useUIStore();
  const { settings } = useSettingsStore();
  const rootSaveDir = (settings.saveDir || "./box").replace(/\/+$/, "");
  const [syncing, setSyncing] = useState(false);

  // 状态控制
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("updated");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 模态弹窗状态
  const [editingCard, setEditingCard] = useState<ConfigCard | null>(null);
  const [previewingCard, setPreviewingCard] = useState<ConfigCard | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);

  // 自动从根目录 configs.json 及子目录加载/同步
  const handleSyncDisk = useCallback(async () => {
    setSyncing(true);
    try {
      const synced = await scanAndSyncConfigsRecord(rootSaveDir, useConfigCardsStore.getState().cards);
      if (synced && synced.length > 0) {
        importCards(synced);
      }
      addToast({ type: "success", message: `已从根目录同步 ${synced.length} 个配置` });
    } catch (e) {
      addToast({ type: "error", message: `同步根目录记录失败: ${e}` });
    } finally {
      setSyncing(false);
    }
  }, [rootSaveDir, importCards, addToast]);

  useEffect(() => {
    scanAndSyncConfigsRecord(rootSaveDir, useConfigCardsStore.getState().cards).then((synced) => {
      if (synced && synced.length > 0) {
        importCards(synced);
      }
    }).catch(() => {});
  }, [rootSaveDir]);

  // 收集所有可用标签
  const allTags = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => c.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [cards]);

  // 统计概览数据
  const stats = useMemo(() => {
    const total = cards.length;
    
    let favoriteCount = 0;
    let totalSites = 0;
    let totalLives = 0;

    cards.forEach((c) => {
      
      
      if (c.favorite) favoriteCount++;
      totalSites += c.sites ?? 0;
      totalLives += c.lives ?? 0;
    });

    return { total,  favoriteCount, totalSites, totalLives };
  }, [cards]);

  // 过滤与排序结果
  const filteredCards = useMemo(() => {
    return cards
      .filter((card) => {
        // 搜索过滤
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName = card.projectName.toLowerCase().includes(q);
          
          const matchDesc = card.description?.toLowerCase().includes(q) ?? false;
          const matchTags = card.tags?.some((t) => t.toLowerCase().includes(q)) ?? false;
          if (!matchName && !matchDesc && !matchTags) return false;
        }

        // 范围分类过滤
        
        if (scope === "favorite" && !card.favorite) return false;
        

        // 标签过滤
        if (selectedTag && (!card.tags || !card.tags.includes(selectedTag))) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "updated") return b.updatedAt - a.updatedAt;
        if (sortBy === "name") return a.projectName.localeCompare(b.projectName, "zh-CN");
        if (sortBy === "sites") return (b.sites ?? 0) - (a.sites ?? 0);
        if (sortBy === "lives") return (b.lives ?? 0) - (a.lives ?? 0);
        return 0;
      });
  }, [cards, search, scope, selectedTag, sortBy]);

  // 多选切换
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredCards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCards.map((c) => c.id)));
    }
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const ids = Array.from(selectedIds);
    removeBatch(ids);
    setSelectedIds(new Set());
    const idSet = new Set(ids);
    writeConfigsRecord(rootSaveDir, cards.filter(c => !idSet.has(c.id))).catch(() => {});
    addToast({ type: "success", message: `已批量移除 ${count} 个配置卡片` });
  };

  // 批量导出
  const handleBatchExport = () => {
    const targets = cards.filter((c) => selectedIds.has(c.id));
    if (targets.length === 0) return;
    const blob = new Blob([JSON.stringify(targets, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tvbox-selected-configs-${targets.length}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: "success", message: `已成功导出 ${targets.length} 个配置` });
  };

  // 克隆单个配置
  const handleDuplicate = (id: string) => {
    const cloned = duplicateCard(id);
    if (cloned) {
      writeConfigsRecord(rootSaveDir, [cloned, ...cards]).catch(() => {});
      addToast({ type: "success", message: `已成功创建配置副本: ${cloned.projectName}` });
    }
  };

  // 模板创建处理
  const handleCreateFromTemplate = () => {};

  return (
    <div className="flex-1 overflow-auto bg-background/50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* 顶部标题与主要操作按钮栏 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              多配置管理中心
            </h1>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground font-mono">
              <HardDrive className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{rootSaveDir}</span>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              loading={syncing}
              onClick={handleSyncDisk}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              title="扫描数据根目录并重新同步 configs.json"
            >
              同步根目录记录
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBackupModal(true)}
              icon={<Download className="h-3.5 w-3.5" />}
            >
              备份与恢复
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenLocalFileDialog}
              icon={<FolderOpen className="h-3.5 w-3.5" />}
            >
              打开本地文件
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              icon={<Plus className="h-3.5 w-3.5" />}
            >
              新建 / 导入配置
            </Button>
          </div>
        </div>

        {/* 统计概览 */}
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { label: "全部配置", value: stats.total, color: "text-primary", bg: "bg-primary/10" },
            
            
            { label: "收藏", value: stats.favoriteCount, color: "text-yellow-500", bg: "bg-yellow-400/10" },
            { label: "点播源", value: stats.totalSites, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
            { label: "直播源", value: stats.totalLives, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/50", bg)}>
              <span className={cn("text-base font-bold leading-none", color)}>{value}</span>
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* 筛选、搜索与视图切换控制栏 */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card/80">
          {/* 左侧搜索与范围 */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            {/* 搜索框 */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索配置名称、URL、标签或备注..."
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            {/* 范围选项 */}
            <div className="flex items-center p-0.5 rounded-lg bg-muted border border-border/50 text-xs">
              <button
                onClick={() => setScope("all")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  scope === "all" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                全部 ({cards.length})
              </button>
              <button
                onClick={() => setScope("favorite")}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  scope === "favorite" ? "bg-background font-medium text-yellow-600 shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Star className="h-3 w-3" /> 收藏
              </button>
              
            </div>

            {/* 标签过滤 Chips */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-sm">
                {selectedTag && (
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-medium whitespace-nowrap"
                  >
                    全部标签 ✕
                  </button>
                )}
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
                      selectedTag === tag
                        ? "bg-primary text-primary-foreground border-primary font-medium"
                        : "bg-muted/60 text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 右侧排序与视图模式切换 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 排序方式 */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="updated">最近使用更新</option>
                <option value="name">名称 (A-Z)</option>
                <option value="sites">点播爬虫最多</option>
                <option value="lives">直播源最多</option>
              </select>
            </div>

            {/* 视图模式 */}
            <div className="flex items-center p-0.5 rounded-lg bg-muted border border-border/50">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                title="网格卡片视图"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                title="紧凑列表视图"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 批量操作工具条 */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/[0.04] text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-primary">已选择 {selectedIds.size} 项配置</span>
              <button
                onClick={handleSelectAll}
                className="text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                {selectedIds.size === filteredCards.length ? "取消全选" : "选择全部"}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleBatchExport}
                icon={<Download className="h-3 w-3" />}
              >
                批量导出
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="h-7 text-xs"
                onClick={handleBatchDelete}
                icon={<Trash2 className="h-3 w-3" />}
              >
                批量删除
              </Button>
            </div>
          </div>
        )}

        {/* 内容展示区 */}
        {filteredCards.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-card/30 flex flex-col items-center justify-center gap-3">
            <div className="p-3 rounded-full bg-muted text-muted-foreground">
              <Search className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">
                {cards.length === 0 ? "暂无 TVBox 配置文件" : "未找到匹配的配置文件"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {cards.length === 0
                  ? "您可以新建空白配置、从网络链接导入或选择本地 JSON 规则文件"
                  : "尝试清空关键词或重置分类筛选条件"}
              </p>
            </div>
            {cards.length === 0 ? (
              <div className="flex gap-2 mt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                  icon={<Plus className="h-3.5 w-3.5" />}
                >
                  新建 / 导入配置
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenLocalFileDialog}
                  icon={<FolderOpen className="h-3.5 w-3.5" />}
                >
                  打开本地文件
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSearch(""); setScope("all"); setSelectedTag(null); }}
              >
                清空过滤条件
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* 网格卡片视图 */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCards.map((card) => (
              <ConfigCardItem
                key={card.id}
                card={card}
                selected={selectedIds.has(card.id)}
                onToggleSelect={handleToggleSelect}
                onOpen={(url, tab, cardId) => onSelect(url, tab, cardId)}
                onPreview={(c) => setPreviewingCard(c)}
                onEdit={(c) => setEditingCard(c)}
                onDuplicate={handleDuplicate}
                onToggleFavorite={toggleFavorite}
                onDelete={(id) => {
                  remove(id);
                  writeConfigsRecord(rootSaveDir, cards.filter(c => c.id !== id)).catch(() => {});
                  addToast({ type: "success", message: `已移除配置: ${card.projectName}` });
                }}
              />
            ))}
          </div>
        ) : (
          /* 紧凑列表视图 */
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground">
              <input
                type="checkbox"
                checked={filteredCards.length > 0 && selectedIds.size === filteredCards.length}
                onChange={handleSelectAll}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer flex-shrink-0"
                aria-label="全选"
              />
              <span className="w-5 flex-shrink-0" />
              <span className="flex-1 min-w-0">配置名称与路径</span>
              <span className="w-40 hidden sm:block">统计指标</span>
              <span className="w-24 hidden md:block">更新时间</span>
              <span className="w-24 text-right">操作</span>
            </div>
            <div className="divide-y divide-border">
              {filteredCards.map((card) => (
                <ConfigListItem
                  key={card.id}
                  card={card}
                  selected={selectedIds.has(card.id)}
                  onToggleSelect={handleToggleSelect}
                  onOpen={(url, tab, cardId) => onSelect(url, tab, cardId)}
                  onPreview={(c) => setPreviewingCard(c)}
                  onEdit={(c) => setEditingCard(c)}
                  onDuplicate={handleDuplicate}
                  onToggleFavorite={toggleFavorite}
                  onDelete={(id) => {
                    remove(id);
                    writeConfigsRecord(rootSaveDir, cards.filter(c => c.id !== id)).catch(() => {});
                    addToast({ type: "success", message: `已移除配置: ${card.projectName}` });
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 编辑模态框 */}
      <ConfigEditModal
        open={Boolean(editingCard)}
        card={editingCard}
        onClose={() => setEditingCard(null)}
        onSave={(id, patch) => {
          update(id, patch);
          writeConfigsRecord(rootSaveDir, cards.map(c => c.id === id ? { ...c, ...patch } : c)).catch(() => {});
          addToast({ type: "success", message: "配置信息已更新" });
        }}
      />

      {/* 快速预览模态框 */}
      <ConfigPreviewModal
        open={Boolean(previewingCard)}
        card={previewingCard}
        onClose={() => setPreviewingCard(null)}
        onOpenInEditor={(target) => {
          setPreviewingCard(null);
          onSelect(target, "basic");
        }}
      />

      {/* 新建/导入向导模态框 */}
      <ConfigCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateBlank={async (projectName, targetPath, template) => {
          try {
            const { writeFile: writeLocal, setServerResourceDir, serverCache } = await import("../../../lib/tauri");
            let initialJson = JSON.stringify({ sites: [], lives: [] }, null, 2);
            if (template && template !== "empty") {
              try {
                const res = await fetch(`/templates/${template}.json`);
                if (res.ok) initialJson = await res.text();
              } catch {}
            }
            await writeLocal(targetPath, initialJson);
            const dir = targetPath.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
            await setServerResourceDir(dir).catch(() => {});
            await serverCache("tvbox.json", initialJson).catch(() => {});
            
            const { scanAndSyncConfigsRecord } = await import("../../../lib/configRecords");
            const synced = await scanAndSyncConfigsRecord(rootSaveDir, useConfigCardsStore.getState().cards);
            if (synced && synced.length > 0) useConfigCardsStore.getState().importCards(synced);
            
            const newCard = synced.find(c => c.projectName === projectName);
            if (newCard) onSelect(`file://${targetPath}`, "basic", newCard.id, targetPath);
            addToast({ type: "success", message: `成功创建配置项目: ${projectName}` });
          } catch (e) {
            addToast({ type: "error", message: `创建失败: ${e}` });
          }
        }}
        onImportUrl={async (url, projectName, targetPath) => {
          try {
            // Because handleCardSelect uses loadFromUrl which fetches and saves to targetPath
            // We just need to trigger the selection! ConfigPage handles it.
            // Wait, ConfigPage's handleCardSelect has a targetLocalPath argument.
            // onSelect is onSelect(url, "basic", undefined, targetLocalPath, customName)
            onSelect(url, "basic", undefined, targetPath, projectName);
            addToast({ type: "success", message: `开始导入网络配置: ${url}` });
          } catch (e) {
            addToast({ type: "error", message: `导入启动失败: ${e}` });
          }
        }}
                        onOpenLocalFile={onOpenLocalFileDialog}
      />

      {/* 备份与恢复模态框 */}
      <ConfigBackupModal
        open={showBackupModal}
        cards={cards}
        onClose={() => setShowBackupModal(false)}
        onImport={(imported) => {
          importCards(imported);
          addToast({ type: "success", message: `成功导入 ${imported.length} 个配置卡片` });
        }}
      />
    </div>
  );
}
