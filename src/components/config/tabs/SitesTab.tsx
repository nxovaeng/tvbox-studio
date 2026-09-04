import React, { useState, useMemo, useCallback } from "react";
import { useTvBoxStore, useUIStore } from "../../../store";
import type { TvBoxVod } from "../../../types/tvbox";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Badge, StatusDot } from "../../ui/Badge";
import { Dialog } from "../../ui/Dialog";
import { CheckingOverlay } from "../../ui/Progress";
import {
  Search, Plus, Trash2, Edit3, Copy, ChevronDown, ChevronUp,
  Wifi, CheckSquare, Square, ExternalLink, Eye, EyeOff, AlertTriangle,
} from "lucide-react";
import { cn, genId } from "../../../lib/utils";
import { checkVods } from "../../../lib/tauri";
import { listen } from "@tauri-apps/api/event";
import { SiteEditDialog } from "../SiteEditDialog";
import { RuleEditorDialog } from "../RuleEditorDialog";

export function SitesTab() {
  const { source, removeSite, setSiteStatus, addSite } = useTvBoxStore();
  const { addToast } = useUIStore();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline" | "unknown">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState({ done: 0, total: 0 });
  const [editSite, setEditSite] = useState<{ site: TvBoxVod; index: number } | null>(null);
  const [ruleEditorSite, setRuleEditorSite] = useState<TvBoxVod | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const sites = source?.sites ?? [];

  const offlineCount = useMemo(() => sites.filter((s) => s._status === "offline").length, [sites]);
  const onlineCount = useMemo(() => sites.filter((s) => s._status === "online").length, [sites]);
  const unknownCount = useMemo(() => sites.filter((s) => !s._status || s._status === "unknown").length, [sites]);

  const siteCategory = (site: TvBoxVod) => {
    const api = (site.api || "").toLowerCase();
    const name = (site.name || "").toLowerCase();
    const key = (site.key || "").toLowerCase();
    const extStr = typeof site.ext === "string" ? site.ext.toLowerCase() : "";

    // 1. 短剧 (Shortdrama)
    if (site.genre === "shortdrama" || name.includes("短剧") || key.includes("short") || api.includes("short")) {
      return "shortdrama";
    }

    // 2. 网盘/4K (Pan / Cloud Drive / Magnet)
    if (
      api.includes("csp_pan") ||
      api.includes("csp_wogg") ||
      api.includes("csp_seedhub") ||
      api.includes("csp_jike") ||
      api.includes("csp_shuangxing") ||
      api.includes("csp_4k") ||
      name.includes("4k") ||
      name.includes("网盘") ||
      name.includes("夸克") ||
      name.includes("阿里") ||
      name.includes("玩偶")
    ) {
      return "pan";
    }

    // 3. 原生客户端逆向 APP (AppGet, AppQi, AppDrama, App99, AppSy 等)
    if (api.includes("csp_app")) {
      return "app";
    }

    // 4. DR-PY (JavaScript) 爬虫引擎
    if (
      api.includes("drpy") ||
      api.endsWith(".js") ||
      api.includes(".js?") ||
      extStr.includes("drpy.js") ||
      (extStr.startsWith("./js/") && extStr.endsWith(".js"))
    ) {
      return "drpy";
    }

    // 5. Python 爬虫
    if (api.endsWith(".py") || api.includes(".py?")) {
      return "py";
    }

    // 6. XBPQ 规则引擎
    if (api.includes("csp_xbpq")) {
      return "xbpq";
    }

    // 7. XYQHiker / XPath 规则引擎
    if (api.includes("csp_xyqhiker") || api.includes("csp_xpath")) {
      return "xyq";
    }

    // 8. B站相关
    if (api.includes("csp_bili")) {
      return "bili";
    }

    // 9. CMS (XML / JSON)
    if (site.type === 0) return "xml";
    if (site.type === 1) return "json";
    if (site.type === 4) return "base64";

    // 10. 其他 CSP JAR
    if (api.startsWith("csp_")) return "jar";

    return "spider";
  };

  const categoryOptions = [
    { id: "all", label: "全部类别" },
    { id: "pan", label: "网盘 / 4K" },
    { id: "shortdrama", label: "短剧" },
    { id: "app", label: "原生 APP" },
    { id: "drpy", label: "DR-PY (JS)" },
    { id: "xbpq", label: "XBPQ" },
    { id: "xyq", label: "XYQHiker / XPath" },
    { id: "py", label: "Python" },
    { id: "bili", label: "哔哩哔哩" },
    { id: "xml", label: "XML (CMS)" },
    { id: "json", label: "JSON (CMS)" },
    { id: "jar", label: "其他 CSP" },
    { id: "spider", label: "其他规则" },
  ];

  const filtered = useMemo(() => {
    return sites.filter((site) => {
      // 类别筛选
      if (category !== "all" && siteCategory(site) !== category) return false;

      // 状态筛选
      if (statusFilter !== "all") {
        if (statusFilter === "online" && site._status !== "online") return false;
        if (statusFilter === "offline" && site._status !== "offline") return false;
        if (statusFilter === "unknown" && site._status && site._status !== "unknown") return false;
      }

      // 关键词搜索
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          site.name.toLowerCase().includes(q) ||
          site.key.toLowerCase().includes(q) ||
          site.api.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [sites, search, category, statusFilter]);

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((s) => s.key)));
  };

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleDelete = () => {
    if (!selected.size) return;
    removeSite([...selected]);
    setSelected(new Set());
    addToast({ type: "success", message: `已删除 ${selected.size} 条规则` });
  };

  // 一键排除离线失效源
  const handleRemoveOffline = () => {
    const offlineKeys = sites.filter((s) => s._status === "offline").map((s) => s.key);
    if (offlineKeys.length === 0) {
      addToast({ type: "info", message: "当前未发现离线失效源" });
      return;
    }
    const confirmed = window.confirm(`检测到 ${offlineKeys.length} 个失效离线源，确定将其从配置中彻底删除吗？`);
    if (!confirmed) return;
    removeSite(offlineKeys);
    setSelected((prev) => {
      const next = new Set(prev);
      offlineKeys.forEach((k) => next.delete(k));
      return next;
    });
    addToast({ type: "success", message: `已成功排除并删除 ${offlineKeys.length} 个失效源` });
  };

  // 批量隐藏或显示选中的源（排除不想在 TVBox 上看到的源）
  const handleToggleHideSelected = (hideValue: number) => {
    if (selected.size === 0) return;
    const targets = Array.from(selected);
    targets.forEach((key) => {
      const idx = sites.findIndex((s) => s.key === key);
      if (idx !== -1) {
        useTvBoxStore.getState().updateSite(idx, { ...sites[idx], hide: hideValue });
      }
    });
    addToast({
      type: "success",
      message: `已将选中的 ${targets.length} 个源设为${hideValue ? "隐藏（不在盒子显示）" : "正常显示"}`,
    });
  };

  const handleCheckAll = useCallback(async () => {
    if (checking) return;
    const targets = selected.size > 0
      ? sites.filter((s) => selected.has(s.key))
      : sites;

    setChecking(true);
    setCheckProgress({ done: 0, total: targets.length });
    targets.forEach((s) => setSiteStatus(s.key, "checking"));

    const unlisten = await listen<{ progress: number; total: number }>("check://progress", (ev) => {
      setCheckProgress({ done: ev.payload.progress, total: ev.payload.total });
    });

    try {
      const results = await checkVods(targets, true);
      results.forEach((r) => {
        setSiteStatus(r.extra.key, r.connectable ? "online" : "offline");
      });
      const online = results.filter((r) => r.connectable).length;
      addToast({ type: "success", message: `检测完成: ${online}/${results.length} 可用` });
    } catch (e) {
      addToast({ type: "error", message: `检测失败: ${e}` });
    } finally {
      unlisten();
      setChecking(false);
    }
  }, [checking, sites, selected, setSiteStatus, addToast]);

  const apiTypeBadge = (site: TvBoxVod) => {
    const cat = siteCategory(site);
    if (cat === "shortdrama") return <Badge variant="warning" className="text-[10px]">短剧</Badge>;
    if (cat === "pan") return <Badge variant="default" className="text-[10px] bg-sky-500/20 text-sky-400 border-sky-500/30">网盘4K</Badge>;
    if (cat === "app") return <Badge variant="default" className="text-[10px] bg-purple-500/20 text-purple-400 border-purple-500/30">APP</Badge>;
    if (cat === "drpy") return <Badge variant="default" className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">DR-PY</Badge>;
    if (cat === "xbpq") return <Badge variant="warning" className="text-[10px]">XBPQ</Badge>;
    if (cat === "xyq") return <Badge variant="success" className="text-[10px]">XYQ</Badge>;
    if (cat === "py") return <Badge variant="warning" className="text-[10px]">Python</Badge>;
    if (cat === "bili") return <Badge variant="default" className="text-[10px] bg-pink-500/20 text-pink-400 border-pink-500/30">Bili</Badge>;
    if (cat === "xml") return <Badge variant="outline" className="text-[10px]">XML</Badge>;
    if (cat === "json") return <Badge variant="outline" className="text-[10px]">JSON</Badge>;
    if (site.api.startsWith("csp_")) return <Badge variant="outline" className="text-[10px]">CSP</Badge>;
    return <Badge variant="outline" className="text-[10px]">普通</Badge>;
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0 bg-background">
        <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground">
          {selected.size === filtered.length && filtered.length > 0
            ? <CheckSquare className="h-4 w-4 text-primary" />
            : <Square className="h-4 w-4" />
          }
        </button>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索规则名称、Key、API..."
            className="pl-8 h-7"
          />
        </div>

        <select aria-label="爬虫分类" value={category} onChange={(e) => setCategory(e.target.value)}
          className="h-7 rounded-md border border-input bg-background px-2 text-xs">
          {categoryOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>

        <select
          aria-label="状态筛选"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="h-7 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="all">全部状态</option>
          <option value="online">🟢 在线可用 ({onlineCount})</option>
          <option value="offline">🔴 离线失效 ({offlineCount})</option>
          <option value="unknown">⚪ 未检测 ({unknownCount})</option>
        </select>

        <span className="text-xs text-muted-foreground ml-1">
          {filtered.length}/{sites.length}
          {selected.size > 0 && ` · 已选 ${selected.size}`}
        </span>

        <div className="flex items-center gap-1 ml-auto">
          {checking && (
            <span className="text-xs text-muted-foreground">
              {checkProgress.done}/{checkProgress.total}
            </span>
          )}

          {/* 一键排除离线失效源 */}
          {offlineCount > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleRemoveOffline}
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              title="一键清理所有不可达离线爬虫源"
            >
              排除失效源 ({offlineCount})
            </Button>
          )}

          <Button
            variant="outline" size="sm"
            loading={checking}
            onClick={handleCheckAll}
            icon={<Wifi className="h-3.5 w-3.5" />}
          >
            {selected.size > 0 ? `检测选中(${selected.size})` : "检测全部"}
          </Button>

          {selected.size > 0 ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleHideSelected(1)}
                icon={<EyeOff className="h-3.5 w-3.5" />}
                title="在 TVBox 客户端隐藏选中的源"
              >
                隐藏
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleHideSelected(0)}
                icon={<Eye className="h-3.5 w-3.5" />}
                title="在 TVBox 客户端恢复显示选中的源"
              >
                显示
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={handleDelete}
              >
                删除({selected.size})
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setShowAdd(true)}>
              新增
            </Button>
          )}
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
            {search ? "没有匹配的规则" : "暂无爬虫规则"}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((site) => {
              const isExpanded = expanded.has(site.key);
              const isSelected = selected.has(site.key);

              return (
                <div key={site.key}
                  className={cn("group", isSelected && "bg-primary/5")}
                >
                  {/* 主行 */}
                  <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                    <button onClick={() => toggleSelect(site.key)}
                      className="text-muted-foreground hover:text-foreground flex-shrink-0">
                      {isSelected
                        ? <CheckSquare className="h-4 w-4 text-primary" />
                        : <Square className="h-4 w-4" />
                      }
                    </button>

                    <StatusDot status={site._status} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-sm truncate">{site.name}</span>
                        {apiTypeBadge(site)}
                        {site.changeable === 1 && (
                          <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-500/30">换源</Badge>
                        )}
                        {site.style?.ratio ? (
                          <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                            {site.style.type === "list" ? "列表" : "海报"} {site.style.ratio}
                          </Badge>
                        ) : site.style?.type ? (
                          <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                            {site.style.type === "list" ? "横版列表" : "海报卡片"}
                          </Badge>
                        ) : null}
                        {site.timeout ? (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">{site.timeout}s</Badge>
                        ) : null}
                        {site.searchable ? <Badge variant="outline" className="text-[10px]">可搜</Badge> : null}
                        {site.hide ? <Badge variant="warning" className="text-[10px]">已隐藏</Badge> : null}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        <span className="font-mono">{site.key}</span>
                        <span className="mx-1.5">·</span>
                        <span className="truncate">{site.api}</span>
                      </div>
                    </div>

                    {/* 操作按钮（hover 显示）*/}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon"
                        title="图形化编辑"
                        onClick={() => setRuleEditorSite(site)}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon"
                        title="快速编辑"
                        onClick={() => {
                          const idx = sites.indexOf(site);
                          setEditSite({ site, index: idx });
                        }}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon"
                        title="复制规则"
                        onClick={() => {
                          const copy = { ...site, key: site.key + "_copy", name: site.name + " 副本" };
                          addSite(copy);
                          addToast({ type: "success", message: "已复制" });
                        }}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <button
                        onClick={() => toggleExpand(site.key)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* 展开详情 */}
                  {isExpanded && (
                    <div className="px-10 py-3 bg-muted/20 text-xs space-y-1.5 border-t border-border/50">
                      <DetailRow label="Key" value={site.key} mono />
                      <DetailRow label="API" value={site.api} mono />
                      <DetailRow label="类型" value={String(site.type)} />
                      {site.style && (
                        <DetailRow label="样式" value={`${site.style.type || "默认"} (比例: ${site.style.ratio ?? "自适应"})`} />
                      )}
                      {site.genre && <DetailRow label="题材" value={site.genre} />}
                      {site.timeout && <DetailRow label="超时" value={`${site.timeout} 秒`} />}
                      {site.changeable !== undefined && (
                        <DetailRow label="可换源" value={site.changeable ? "是" : "否"} />
                      )}
                      {site.ext != null && (
                        <DetailRow label="Ext"
                          value={typeof site.ext === "string" ? site.ext : JSON.stringify(site.ext)} mono />
                      )}
                      {site.jar && <DetailRow label="JAR" value={site.jar} mono />}
                      <DetailRow label="可搜索" value={site.searchable ? "是" : "否"} />
                      <DetailRow label="快速搜索" value={site.quickSearch ? "是" : "否"} />
                      {site.header && (
                        <DetailRow label="请求头" value={typeof site.header === "string" ? site.header : JSON.stringify(site.header)} mono />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 进度覆盖层 */}
      {checking && (
        <CheckingOverlay
          done={checkProgress.done}
          total={checkProgress.total}
          label="检测爬虫规则可达性..."
          onCancel={() => setChecking(false)}
        />
      )}

      {/* 编辑弹窗 */}
      {editSite && (
        <SiteEditDialog
          site={editSite.site}
          index={editSite.index}
          onClose={() => setEditSite(null)}
        />
      )}
      {ruleEditorSite && (
        <RuleEditorDialog
          site={ruleEditorSite}
          onClose={() => setRuleEditorSite(null)}
        />
      )}
      {showAdd && (
        <SiteEditDialog
          site={{ key: genId(), name: "", type: 3, api: "csp_XYQHiker", searchable: 1, quickSearch: 1 }}
          index={-1}
          onClose={() => setShowAdd(false)}
          isNew
        />
      )}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <span className="text-muted-foreground w-16 flex-shrink-0">{label}</span>
      <span className={cn("text-foreground flex-1 break-all", mono && "font-mono")}>{value}</span>
    </div>
  );
}
