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
  Wifi, CheckSquare, Square, ExternalLink,
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState({ done: 0, total: 0 });
  const [editSite, setEditSite] = useState<{ site: TvBoxVod; index: number } | null>(null);
  const [ruleEditorSite, setRuleEditorSite] = useState<TvBoxVod | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const sites = source?.sites ?? [];

  const siteCategory = (site: TvBoxVod) => {
    const api = site.api.toLowerCase();
    if (site.type === 0) return "xml";
    if (site.type === 1) return "json";
    if (site.type === 4) return "base64";
    if (api.endsWith(".js") || api.includes(".js?")) return "js";
    if (api.endsWith(".py") || api.includes(".py?")) return "py";
    if (api.startsWith("csp_")) return "jar";
    return "spider";
  };

  const categoryOptions = [
    { id: "all", label: "全部" }, { id: "xml", label: "XML" },
    { id: "json", label: "JSON" }, { id: "base64", label: "Base64" },
    { id: "jar", label: "JAR" }, { id: "js", label: "JavaScript" },
    { id: "py", label: "Python" }, { id: "spider", label: "其他 Spider" },
  ];

  const filtered = useMemo(() => {
    const byCategory = category === "all" ? sites : sites.filter((site) => siteCategory(site) === category);
    if (!search.trim()) return byCategory;
    const q = search.toLowerCase();
    return byCategory.filter(
      (s) => s.name.toLowerCase().includes(q) || s.key.toLowerCase().includes(q) || s.api.toLowerCase().includes(q)
    );
  }, [sites, search, category]);

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

  const apiTypeBadge = (api: string) => {
    if (api.includes("csp_XYQHiker")) return <Badge variant="default">XYQHiker</Badge>;
    if (api.includes("csp_XBPQ"))    return <Badge variant="warning">XBPQ</Badge>;
    if (api.includes("csp_XPath"))   return <Badge variant="success">XPath</Badge>;
    if (api.includes("csp_"))        return <Badge variant="outline">CSP</Badge>;
    return <Badge variant="outline">普通</Badge>;
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
          <Button
            variant="outline" size="sm"
            loading={checking}
            onClick={handleCheckAll}
            icon={<Wifi className="h-3.5 w-3.5" />}
          >
            {selected.size > 0 ? `检测选中(${selected.size})` : "检测全部"}
          </Button>
          <Button variant="outline" size="sm" icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setShowAdd(true)}>
            新增
          </Button>
          {selected.size > 0 && (
            <Button variant="danger" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={handleDelete}>
              删除({selected.size})
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
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{site.name}</span>
                        {apiTypeBadge(site.api)}
                        <Badge variant="outline" className="text-[10px]">{categoryOptions.find((x) => x.id === siteCategory(site))?.label}</Badge>
                        {site.searchable ? <Badge variant="outline" className="text-[10px]">可搜索</Badge> : null}
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
                      {site.ext != null && (
                        <DetailRow label="Ext"
                          value={typeof site.ext === "string" ? site.ext : JSON.stringify(site.ext)} mono />
                      )}
                      {site.jar && <DetailRow label="JAR" value={site.jar} mono />}
                      <DetailRow label="可搜索" value={site.searchable ? "是" : "否"} />
                      <DetailRow label="快速搜索" value={site.quickSearch ? "是" : "否"} />
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
