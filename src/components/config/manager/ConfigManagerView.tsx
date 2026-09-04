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
  getConfigsRecordPath,
} from "../../../lib/configRecords";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Badge } from "../../ui/Badge";
import {
  Search, Plus, Upload, FolderOpen, Star, Globe, HardDrive,
  LayoutGrid, List, Layers, Trash2, ArrowUpDown, RefreshCw,
  Film, Radio, Download, Sparkles, Filter,
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
    targetPath?: string,
    customName?: string
  ) => void;
  onOpenLocalFileDialog: () => void;
}

type ScopeFilter = "all" | "favorite" | "local" | "remote";
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
      addToast({ type: "success", message: `已从 ${getConfigsRecordPath(rootSaveDir)} 同步 (${synced.length} 个配置)` });
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
    let localCount = 0;
    let remoteCount = 0;
    let favoriteCount = 0;
    let totalSites = 0;
    let totalLives = 0;

    cards.forEach((c) => {
      const isLocal = c.url.startsWith("file://") || (!c.url.startsWith("http://") && !c.url.startsWith("https://"));
      if (isLocal) localCount++;
      else remoteCount++;
      if (c.favorite) favoriteCount++;
      totalSites += c.sites ?? 0;
      totalLives += c.lives ?? 0;
    });

    return { total, localCount, remoteCount, favoriteCount, totalSites, totalLives };
  }, [cards]);

  // 过滤与排序结果
  const filteredCards = useMemo(() => {
    return cards
      .filter((card) => {
        // 搜索过滤
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName = card.name.toLowerCase().includes(q);
          const matchPath = (card.url || card.path).toLowerCase().includes(q);
          const matchDesc = card.description?.toLowerCase().includes(q) ?? false;
          const matchTags = card.tags?.some((t) => t.toLowerCase().includes(q)) ?? false;
          if (!matchName && !matchPath && !matchDesc && !matchTags) return false;
        }

        // 范围分类过滤
        const isLocal = card.url.startsWith("file://") || (!card.url.startsWith("http://") && !card.url.startsWith("https://"));
        if (scope === "favorite" && !card.favorite) return false;
        if (scope === "local" && !isLocal) return false;
        if (scope === "remote" && isLocal) return false;

        // 标签过滤
        if (selectedTag && (!card.tags || !card.tags.includes(selectedTag))) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "updated") return b.updatedAt - a.updatedAt;
        if (sortBy === "name") return a.name.localeCompare(b.name, "zh-CN");
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
      addToast({ type: "success", message: `已成功创建配置副本: ${cloned.name}` });
    }
  };

  // 模板创建处理
  const handleCreateFromTemplate = (
    templateKey: string,
    name: string,
    targetPath: string,
    _subDir: string
  ) => {
    let tplJson: import("../../../types/tvbox").TvBoxSource = {
      name,
      path: targetPath,
      sites: [],
      lives: [],
    };
    if (templateKey === "standard") {
      tplJson = {
        name,
        path: targetPath,
        spider: "./spider.jar",
        sites: [],
        lives: [
          { name: "国内央卫直播", type: 0, url: "https://live.fanmingming.com/tv/m3u/ipv6.m3u" },
        ],
        flags: ["youku", "qq", "iqiyi", "qiyi", "letv", "sohu", "tudou", "pptv", "mgtv", "wasu"],
        ads: ["mimg.0c1q0l.cn", "c.open.wo.cn"],
      };
    } else if (templateKey === "vod_spider") {
      tplJson = {
        name,
        path: targetPath,
        spider: "./spider.jar",
        sites: [
          { key: "csp_Douban", name: "豆瓣 · 推荐", type: 3, api: "csp_Douban", searchable: 0 },
        ],
        lives: [],
      };
    } else if (templateKey === "live_stream") {
      tplJson = {
        name,
        path: targetPath,
        sites: [],
        lives: [
          { name: "央视频道", type: 0, url: "https://live.fanmingming.com/tv/m3u/ipv6.m3u" },
          { name: "卫视频道", type: 0, url: "https://live.fanmingming.com/tv/m3u/global.m3u" },
        ],
      };
    }

    const jsonStr = JSON.stringify(tplJson, null, 2);
    const cardData = {
      name,
      path: targetPath,
      url: `file://${targetPath}`,
      sites: tplJson.sites.length,
      lives: tplJson.lives.length,
      spider: tplJson.spider,
    };
    upsert(cardData);
    writeConfigsRecord(rootSaveDir, [cardData as ConfigCard, ...cards.filter(c => c.path !== targetPath)]).catch(() => {});
    // 直接进入工作区并绑定本地保存路径
    onSelect(`blank://${encodeURIComponent(jsonStr)}`, "basic", targetPath, name);
    addToast({ type: "success", message: `已基于模板创建并关联保存路径: ${targetPath}` });
  };

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
            <div className="flex items-center flex-wrap gap-2 mt-1.5 text-[11px] font-mono">
              <span className="bg-muted/50 text-muted-foreground px-2 py-0.5 rounded border border-border">
                根目录: <strong className="text-foreground">{rootSaveDir}</strong>
              </span>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                多配置记录文件: <strong>{getConfigsRecordPath(rootSaveDir)}</strong>
              </span>
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

        {/* 统计指标卡片栏 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl border border-border bg-card/60 shadow-sm flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">总配置数</div>
              <div className="text-base font-bold text-foreground">{stats.total}</div>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-border bg-card/60 shadow-sm flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
              <HardDrive className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">本地配置</div>
              <div className="text-base font-bold text-foreground">{stats.localCount}</div>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-border bg-card/60 shadow-sm flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">远程订阅</div>
              <div className="text-base font-bold text-foreground">{stats.remoteCount}</div>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-border bg-card/60 shadow-sm flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-400/10 text-yellow-500">
              <Star className="h-4 w-4 fill-yellow-500" />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">常用收藏</div>
              <div className="text-base font-bold text-foreground">{stats.favoriteCount}</div>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-border bg-card/60 shadow-sm flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Film className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">累计点播源</div>
              <div className="text-base font-bold text-foreground">{stats.totalSites}</div>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-border bg-card/60 shadow-sm flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
              <Radio className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">累计直播源</div>
              <div className="text-base font-bold text-foreground">{stats.totalLives}</div>
            </div>
          </div>
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
              <button
                onClick={() => setScope("local")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  scope === "local" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                本地
              </button>
              <button
                onClick={() => setScope("remote")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  scope === "remote" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                网络
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
                onOpen={onSelect}
                onPreview={(c) => setPreviewingCard(c)}
                onEdit={(c) => setEditingCard(c)}
                onDuplicate={handleDuplicate}
                onToggleFavorite={toggleFavorite}
                onDelete={(id) => {
                  remove(id);
                  writeConfigsRecord(rootSaveDir, cards.filter(c => c.id !== id)).catch(() => {});
                  addToast({ type: "success", message: `已移除配置: ${card.name}` });
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
                  onOpen={onSelect}
                  onPreview={(c) => setPreviewingCard(c)}
                  onEdit={(c) => setEditingCard(c)}
                  onDuplicate={handleDuplicate}
                  onToggleFavorite={toggleFavorite}
                  onDelete={(id) => {
                    remove(id);
                    writeConfigsRecord(rootSaveDir, cards.filter(c => c.id !== id)).catch(() => {});
                    addToast({ type: "success", message: `已移除配置: ${card.name}` });
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
        onCreateBlank={(name, targetPath, _subDir) => {
          const blankJson = JSON.stringify({ name, path: targetPath, sites: [], lives: [] }, null, 2);
          const cardData = { name, path: targetPath, url: `file://${targetPath}`, sites: 0, lives: 0 };
          upsert(cardData);
          writeConfigsRecord(rootSaveDir, [cardData as ConfigCard, ...cards.filter(c => c.path !== targetPath)]).catch(() => {});
          onSelect(`blank://${encodeURIComponent(blankJson)}`, "basic", targetPath, name);
          addToast({ type: "success", message: `已创建独立配置: ${targetPath}` });
        }}
        onCreateFromTemplate={handleCreateFromTemplate}
        onImportUrl={(url, name, targetPath, _subDir) => {
          const cardData = { name, path: targetPath, url: `file://${targetPath}`, sites: 0, lives: 0 };
          upsert(cardData);
          writeConfigsRecord(rootSaveDir, [cardData as ConfigCard, ...cards.filter(c => c.path !== targetPath)]).catch(() => {});
          onSelect(url, "basic", targetPath, name);
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
