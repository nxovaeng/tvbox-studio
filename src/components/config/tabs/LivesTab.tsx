import React, { useState, useMemo } from "react";
import { useTvBoxStore, useUIStore } from "../../../store";
import type { TvBoxLive } from "../../../types/tvbox";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Badge, StatusDot } from "../../ui/Badge";
import { Search, Plus, Trash2, Edit3, Wifi, ChevronDown, ChevronUp, CheckSquare, Square, AlertTriangle } from "lucide-react";
import { cn } from "../../../lib/utils";
import { checkLives } from "../../../lib/tauri";
import { listen } from "@tauri-apps/api/event";
import { Dialog } from "../../ui/Dialog";
import { CheckingOverlay } from "../../ui/Progress";

export function LivesTab() {
  const { source, removeLive, setLiveStatus, addLive, updateLive } = useTvBoxStore();
  const { addToast } = useUIStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline" | "unknown">("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [checking, setChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState({ done: 0, total: 0 });
  const [editLive, setEditLive] = useState<{ live: TvBoxLive; index: number } | null>(null);

  const lives = source?.lives ?? [];

  const offlineCount = useMemo(() => lives.filter((l) => l._status === "offline").length, [lives]);
  const onlineCount = useMemo(() => lives.filter((l) => l._status === "online").length, [lives]);
  const unknownCount = useMemo(() => lives.filter((l) => !l._status || l._status === "unknown").length, [lives]);

  const filtered = useMemo(() => {
    return lives
      .map((l, i) => ({ ...l, _origIndex: i }))
      .filter((l) => {
        if (statusFilter !== "all") {
          if (statusFilter === "online" && l._status !== "online") return false;
          if (statusFilter === "offline" && l._status !== "offline") return false;
          if (statusFilter === "unknown" && l._status && l._status !== "unknown") return false;
        }
        if (!search.trim()) return true;
        const q = search.toLowerCase().trim();
        return (
          (l.name ?? "").toLowerCase().includes(q) ||
          (l.url ?? "").toLowerCase().includes(q) ||
          (l.group ?? "").toLowerCase().includes(q)
        );
      });
  }, [lives, search, statusFilter]);

  const toggleSelect = (origIdx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(origIdx) ? next.delete(origIdx) : next.add(origIdx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((l) => l._origIndex)));
    }
  };

  const handleDeleteSelected = () => {
    if (!selected.size) return;
    const count = selected.size;
    const sorted = Array.from(selected).sort((a, b) => b - a);
    sorted.forEach((i) => removeLive(i));
    setSelected(new Set());
    addToast({ type: "success", message: `已删除 ${count} 条直播规则` });
  };

  const handleRemoveOffline = () => {
    const offlineIndices = lives
      .map((l, i) => (l._status === "offline" ? i : -1))
      .filter((i) => i !== -1);
    if (offlineIndices.length === 0) {
      addToast({ type: "info", message: "当前未发现离线失效直播源" });
      return;
    }
    const confirmed = window.confirm(`检测到 ${offlineIndices.length} 个失效离线直播源，确定彻底删除吗？`);
    if (!confirmed) return;
    offlineIndices.sort((a, b) => b - a).forEach((i) => removeLive(i));
    setSelected(new Set());
    addToast({ type: "success", message: `已成功排除并删除 ${offlineIndices.length} 个失效直播源` });
  };

  const handleCheckAll = async () => {
    if (checking) return;
    const targets = selected.size > 0
      ? lives.filter((_, i) => selected.has(i))
      : lives;
    setChecking(true);
    setCheckProgress({ done: 0, total: targets.length });
    targets.forEach((_, i) => setLiveStatus(i, "checking"));
    const unlisten = await listen<{ progress: number; total: number }>("check://progress", (ev) => {
      setCheckProgress({ done: ev.payload.progress, total: ev.payload.total });
    });
    try {
      const results = await checkLives(targets);
      results.forEach((r, i) => setLiveStatus(i, r.connectable ? "online" : "offline"));
      const online = results.filter((r) => r.connectable).length;
      addToast({ type: "success", message: `检测完成: ${online}/${results.length} 可用` });
    } catch (e) {
      addToast({ type: "error", message: `检测失败: ${e}` });
    } finally {
      unlisten();
      setChecking(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* 进度覆盖层 */}
      {checking && (
        <CheckingOverlay
          done={checkProgress.done}
          total={checkProgress.total}
          label="检测直播规则可达性..."
          onCancel={() => setChecking(false)}
        />
      )}

      <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0 bg-background">
        <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground">
          {selected.size === filtered.length && filtered.length > 0
            ? <CheckSquare className="h-4 w-4 text-primary" />
            : <Square className="h-4 w-4" />
          }
        </button>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索直播规则..." className="pl-8 h-7" />
        </div>

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
          {filtered.length}/{lives.length}
          {selected.size > 0 && ` · 已选 ${selected.size}`}
        </span>

        <div className="flex items-center gap-1 ml-auto">
          {checking && (
            <span className="text-xs text-muted-foreground">
              {checkProgress.done}/{checkProgress.total}
            </span>
          )}

          {/* 一键排除失效直播源 */}
          {offlineCount > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleRemoveOffline}
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              title="一键清理所有不可达离线直播源"
            >
              排除失效源 ({offlineCount})
            </Button>
          )}

          <Button variant="outline" size="sm" loading={checking}
            onClick={handleCheckAll} icon={<Wifi className="h-3.5 w-3.5" />}>
            {selected.size > 0 ? `检测选中(${selected.size})` : "检测全部"}
          </Button>

          {selected.size > 0 ? (
            <Button variant="danger" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={handleDeleteSelected}>
              删除({selected.size})
            </Button>
          ) : (
            <Button variant="outline" size="sm" icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setEditLive({ live: { name: "新直播", url: "" }, index: -1 })}>
              新增
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            {search ? "没有匹配的直播规则" : "暂无直播规则"}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((live) => {
              const idx = live._origIndex as number;
              const isExpanded = expanded.has(idx);
              const isSelected = selected.has(idx);
              return (
                <div key={idx} className={cn("group", isSelected && "bg-primary/5")}>
                  <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                    <button onClick={() => toggleSelect(idx)}
                      className="text-muted-foreground hover:text-foreground flex-shrink-0">
                      {isSelected
                        ? <CheckSquare className="h-4 w-4 text-primary" />
                        : <Square className="h-4 w-4" />
                      }
                    </button>
                    <StatusDot status={live._status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-sm truncate">{live.name ?? "(无名)"}</span>
                        {live.group && <Badge variant="outline" className="text-[10px]">{live.group}</Badge>}
                        {live.type !== undefined && (
                          <Badge variant="default" className="text-[10px]">类型 {live.type}</Badge>
                        )}
                        {live.ua && (
                          <Badge variant="outline" className="text-[10px] text-purple-500 border-purple-500/30">UA: {live.ua}</Badge>
                        )}
                        {live.timeout ? (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">{live.timeout}s</Badge>
                        ) : null}
                        {live.epg ? (
                          <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30">EPG</Badge>
                        ) : null}
                        {live.logo ? (
                          <Badge variant="outline" className="text-[10px] text-sky-500 border-sky-500/30">台标</Badge>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate font-mono">
                        {live.url ?? `${live.channels?.length ?? 0} 个频道`}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <Button variant="ghost" size="icon" onClick={() => setEditLive({ live, index: idx })}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeLive(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      {live.channels && (
                        <button onClick={() => setExpanded((s) => {
                          const n = new Set(s);
                          n.has(idx) ? n.delete(idx) : n.add(idx);
                          return n;
                        })} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent">
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                  {isExpanded && live.channels && (
                    <div className="px-8 py-2 bg-muted/20 border-t border-border/50 space-y-1">
                      {live.channels.map((ch, ci) => (
                        <div key={ci} className="text-xs flex gap-2">
                          <span className="font-medium w-24 flex-shrink-0 truncate">{ch.name}</span>
                          <span className="text-muted-foreground font-mono truncate">{ch.urls.join(", ")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editLive && (
        <LiveEditDialog
          live={editLive.live}
          index={editLive.index}
          onClose={() => setEditLive(null)}
        />
      )}
    </div>
  );
}

function LiveEditDialog({ live, index, onClose }: { live: TvBoxLive; index: number; onClose: () => void }) {
  const { addLive, updateLive } = useTvBoxStore();
  const { addToast } = useUIStore();
  const [form, setForm] = useState({
    ...live,
    timeoutStr: live.timeout !== undefined ? String(live.timeout) : "",
  });

  const save = () => {
    const updated: TvBoxLive = {
      ...form,
      name: form.name?.trim() || undefined,
      group: form.group?.trim() || undefined,
      url: form.url?.trim() || undefined,
      epg: form.epg?.trim() || undefined,
      logo: form.logo?.trim() || undefined,
      ua: form.ua?.trim() || undefined,
      timeout: form.timeoutStr.trim() && !isNaN(Number(form.timeoutStr)) ? Number(form.timeoutStr) : undefined,
    };
    delete (updated as any).timeoutStr;

    if (index === -1) addLive(updated);
    else updateLive(index, updated);
    addToast({ type: "success", message: index === -1 ? "已新增直播规则" : "已保存" });
    onClose();
  };

  return (
    <Dialog open title={index === -1 ? "新增直播规则" : "编辑直播规则"} onClose={onClose} size="md">
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">名称</label>
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例如：migu" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">分组</label>
            <Input value={form.group ?? ""} onChange={(e) => setForm({ ...form, group: e.target.value })} placeholder="例如：央视" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium">URL（M3U / TXT 直播源地址）*</label>
          <Input
            value={form.url ?? ""}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="如: https://.../live.txt 或 ./tvboxtv.txt"
            className="font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium">EPG 节目单地址</label>
          <Input
            value={form.epg ?? ""}
            onChange={(e) => setForm({ ...form, epg: e.target.value })}
            placeholder="如: https://epg.cdn.loc.cc/?ch={name}&date={date}"
            className="font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium">台标地址模板 (logo)</label>
          <Input
            value={form.logo ?? ""}
            onChange={(e) => setForm({ ...form, logo: e.target.value })}
            placeholder="如: https://logo.wyfc.qzz.io/{name}.png"
            className="font-mono text-xs"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">自定义 UA</label>
            <Input
              value={form.ua ?? ""}
              onChange={(e) => setForm({ ...form, ua: e.target.value })}
              placeholder="如: okhttp/3.8.1"
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">超时秒数 (timeout)</label>
            <Input
              value={form.timeoutStr}
              onChange={(e) => setForm({ ...form, timeoutStr: e.target.value })}
              placeholder="如: 20"
              type="number"
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">播放器核心</label>
            <select
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
              value={form.playerType ?? 0}
              onChange={(e) => setForm({ ...form, playerType: Number(e.target.value) })}
            >
              <option value={0}>0 - 自动</option>
              <option value={1}>1 - IJK 播放器</option>
              <option value={2}>2 - Exo 播放器</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={save}>保存</Button>
        </div>
      </div>
    </Dialog>
  );
}
