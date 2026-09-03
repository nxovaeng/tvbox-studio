import React, { useState, useMemo } from "react";
import { useTvBoxStore, useUIStore } from "../../../store";
import type { TvBoxParse } from "../../../types/tvbox";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { StatusDot, Badge } from "../../ui/Badge";
import { Dialog } from "../../ui/Dialog";
import { CheckingOverlay } from "../../ui/Progress";
import { Search, Plus, Trash2, Edit3, Wifi, Copy } from "lucide-react";
import { checkParses } from "../../../lib/tauri";
import { listen } from "@tauri-apps/api/event";

export function ParsesTab() {
  const { source, removeParse, setParseStatus, addParse, updateParse } = useTvBoxStore();
  const { addToast } = useUIStore();
  const [search, setSearch] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState({ done: 0, total: 0 });
  const [editParse, setEditParse] = useState<{ parse: TvBoxParse; index: number } | null>(null);

  const parses = source?.parses ?? [];
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q ? parses.filter((p) => p.name.toLowerCase().includes(q) || p.url.toLowerCase().includes(q)) : parses;
  }, [parses, search]);

  const handleCheckAll = async () => {
    if (checking || !parses.length) return;
    setChecking(true);
    setCheckProgress({ done: 0, total: parses.length });
    parses.forEach((_, i) => setParseStatus(i, "checking"));
    const unlisten = await listen<{ progress: number; total: number }>("check://progress", (ev) => {
      setCheckProgress({ done: ev.payload.progress, total: ev.payload.total });
    });
    try {
      const results = await checkParses(parses);
      results.forEach((r, i) => setParseStatus(i, r.connectable ? "online" : "offline"));
      const ok = results.filter((r) => r.connectable).length;
      addToast({ type: "success", message: `检测完成: ${ok}/${results.length} 可用` });
    } catch (e) {
      addToast({ type: "error", message: `检测失败: ${e}` });
    } finally {
      unlisten();
      setChecking(false);
    }
  };

  const parseTypeName = (t: number) =>
    t === 0 ? "Web" : t === 1 ? "JSON" : t === 2 ? "弹幕" : String(t);

  return (
    <div className="flex flex-col h-full relative">
      {checking && (
        <CheckingOverlay
          done={checkProgress.done}
          total={checkProgress.total}
          label="检测解析接口可达性..."
          onCancel={() => setChecking(false)}
        />
      )}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0 bg-background">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索解析接口..." className="pl-8 h-7" />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length}/{parses.length}</span>
        <div className="flex gap-1 ml-auto">
          <Button variant="outline" size="sm" loading={checking} onClick={handleCheckAll}
            icon={<Wifi className="h-3.5 w-3.5" />}>检测全部</Button>
          <Button variant="outline" size="sm" icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setEditParse({ parse: { name: "", type: 0, url: "" }, index: -1 })}>
            新增
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="divide-y divide-border">
          {filtered.map((p, i) => (
            <div key={i} className="group flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors">
              <StatusDot status={p._status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{p.name}</span>
                  <Badge variant="outline" className="text-[10px]">{parseTypeName(p.type)}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 font-mono truncate">{p.url}</div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                <Button variant="ghost" size="icon" onClick={() => setEditParse({ parse: p, index: i })}>
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => {
                  addParse({ ...p, name: p.name + " 副本" });
                  addToast({ type: "success", message: "已复制" });
                }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => {
                  const realIdx = parses.indexOf(p);
                  removeParse(realIdx);
                }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              暂无解析接口
            </div>
          )}
        </div>
      </div>

      {editParse && (
        <Dialog open title={editParse.index === -1 ? "新增解析接口" : "编辑解析接口"}
          onClose={() => setEditParse(null)} size="md">
          <ParseForm
            parse={editParse.parse}
            onSave={(p) => {
              if (editParse.index === -1) addParse(p);
              else updateParse(editParse.index, p);
              addToast({ type: "success", message: "已保存" });
              setEditParse(null);
            }}
            onCancel={() => setEditParse(null)}
          />
        </Dialog>
      )}
    </div>
  );
}

function ParseForm({ parse, onSave, onCancel }: {
  parse: TvBoxParse;
  onSave: (p: TvBoxParse) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...parse });
  return (
    <div className="space-y-3 p-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">名称</label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">类型</label>
        <select className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: Number(e.target.value) })}>
          <option value={0}>0 - Web</option>
          <option value={1}>1 - JSON</option>
          <option value={2}>2 - 弹幕</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">URL</label>
        <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="https://example.com/parse" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button variant="primary" onClick={() => onSave(form)}>保存</Button>
      </div>
    </div>
  );
}
