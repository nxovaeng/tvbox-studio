import React, { useState, useMemo } from "react";
import { useTvBoxStore, useUIStore } from "../../../store";
import type { TvBoxLive } from "../../../types/tvbox";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Badge, StatusDot } from "../../ui/Badge";
import { Search, Plus, Trash2, Edit3, Wifi, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../../../lib/utils";
import { checkLives } from "../../../lib/tauri";
import { listen } from "@tauri-apps/api/event";
import { Dialog } from "../../ui/Dialog";
import { CheckingOverlay } from "../../ui/Progress";

export function LivesTab() {
  const { source, removeLive, setLiveStatus, addLive, updateLive } = useTvBoxStore();
  const { addToast } = useUIStore();

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [checking, setChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState({ done: 0, total: 0 });
  const [editLive, setEditLive] = useState<{ live: TvBoxLive; index: number } | null>(null);

  const lives = source?.lives ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return lives.map((l, i) => ({ ...l, _origIndex: i }));
    return lives
      .map((l, i) => ({ ...l, _origIndex: i }))
      .filter((l) =>
        (l.name ?? "").toLowerCase().includes(q) ||
        (l.url ?? "").toLowerCase().includes(q) ||
        (l.group ?? "").toLowerCase().includes(q)
      );
  }, [lives, search]);

  const handleCheckAll = async () => {
    if (checking) return;
    setChecking(true);
    setCheckProgress({ done: 0, total: lives.length });
    lives.forEach((_, i) => setLiveStatus(i, "checking"));
    const unlisten = await listen<{ progress: number; total: number }>("check://progress", (ev) => {
      setCheckProgress({ done: ev.payload.progress, total: ev.payload.total });
    });
    try {
      const results = await checkLives(lives);
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
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索直播规则..." className="pl-8 h-7" />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length}/{lives.length}</span>
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="outline" size="sm" loading={checking}
            onClick={handleCheckAll} icon={<Wifi className="h-3.5 w-3.5" />}>
            检测全部
          </Button>
          <Button variant="outline" size="sm" icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setEditLive({ live: { name: "新直播", url: "" }, index: -1 })}>
            新增
          </Button>
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
              return (
                <div key={idx} className="group">
                  <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                    <StatusDot status={live._status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{live.name ?? "(无名)"}</span>
                        {live.group && <Badge variant="outline" className="text-[10px]">{live.group}</Badge>}
                        {live.type !== undefined && (
                          <Badge variant="default" className="text-[10px]">类型 {live.type}</Badge>
                        )}
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
  const [form, setForm] = useState({ ...live });

  const save = () => {
    if (index === -1) addLive(form);
    else updateLive(index, form);
    addToast({ type: "success", message: index === -1 ? "已新增直播规则" : "已保存" });
    onClose();
  };

  return (
    <Dialog open title={index === -1 ? "新增直播规则" : "编辑直播规则"} onClose={onClose} size="md">
      <div className="space-y-3 p-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">名称</label>
          <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">分组</label>
          <Input value={form.group ?? ""} onChange={(e) => setForm({ ...form, group: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">URL（M3U/TXT）</label>
          <Input value={form.url ?? ""} onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://example.com/live.m3u" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">EPG 地址</label>
          <Input value={form.epg ?? ""} onChange={(e) => setForm({ ...form, epg: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={save}>保存</Button>
        </div>
      </div>
    </Dialog>
  );
}
