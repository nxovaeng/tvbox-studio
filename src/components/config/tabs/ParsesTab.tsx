import React, { useState, useMemo } from "react";
import { useTvBoxStore, useUIStore } from "../../../store";
import type { TvBoxParse } from "../../../types/tvbox";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { StatusDot, Badge } from "../../ui/Badge";
import { Dialog } from "../../ui/Dialog";
import { CheckingOverlay } from "../../ui/Progress";
import { Search, Plus, Trash2, Edit3, Wifi, Copy, AlertTriangle } from "lucide-react";
import { checkParses } from "../../../lib/tauri";
import { listen } from "@tauri-apps/api/event";

export function ParsesTab() {
  const { source, removeParse, setParseStatus, addParse, updateParse } = useTvBoxStore();
  const { addToast } = useUIStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline" | "unknown">("all");
  const [checking, setChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState({ done: 0, total: 0 });
  const [editParse, setEditParse] = useState<{ parse: TvBoxParse; index: number } | null>(null);

  const parses = source?.parses ?? [];

  const offlineCount = useMemo(() => parses.filter((p) => p._status === "offline").length, [parses]);
  const onlineCount = useMemo(() => parses.filter((p) => p._status === "online").length, [parses]);
  const unknownCount = useMemo(() => parses.filter((p) => !p._status || p._status === "unknown").length, [parses]);

  const filtered = useMemo(() => {
    return parses.filter((p) => {
      if (statusFilter !== "all") {
        if (statusFilter === "online" && p._status !== "online") return false;
        if (statusFilter === "offline" && p._status !== "offline") return false;
        if (statusFilter === "unknown" && p._status && p._status !== "unknown") return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return p.name.toLowerCase().includes(q) || p.url.toLowerCase().includes(q);
    });
  }, [parses, search, statusFilter]);

  const handleRemoveOffline = () => {
    const offlineIndices = parses
      .map((p, i) => (p._status === "offline" ? i : -1))
      .filter((i) => i !== -1);
    if (offlineIndices.length === 0) {
      addToast({ type: "info", message: "当前未发现离线失效解析接口" });
      return;
    }
    const confirmed = window.confirm(`检测到 ${offlineIndices.length} 个失效离线解析接口，确定彻底删除吗？`);
    if (!confirmed) return;
    offlineIndices.sort((a, b) => b - a).forEach((i) => removeParse(i));
    addToast({ type: "success", message: `已成功排除并删除 ${offlineIndices.length} 个失效解析接口` });
  };

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

  const parseTypeName = (t: number | string) => {
    const num = Number(t);
    if (num === 0) return "Web嗅探";
    if (num === 1) return "JSON";
    if (num === 2) return "弹幕";
    if (num === 3) return "聚合解析";
    return String(t);
  };

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

        <span className="text-xs text-muted-foreground">{filtered.length}/{parses.length}</span>
        <div className="flex gap-1 ml-auto">
          {offlineCount > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleRemoveOffline}
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              title="一键清理所有不可达离线解析接口"
            >
              排除失效源 ({offlineCount})
            </Button>
          )}

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
          {filtered.map((p, i) => {
            const extFlags = Array.isArray((p.ext as any)?.flag)
              ? ((p.ext as any).flag as string[])
              : [];

            return (
              <div key={i} className="group flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                <StatusDot status={p._status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-sm">{p.name}</span>
                    <Badge variant={Number(p.type) === 3 ? "default" : "outline"} className="text-[10px]">
                      {parseTypeName(p.type)}
                    </Badge>
                    {extFlags.length > 0 && (
                      <div className="flex items-center gap-1">
                        {extFlags.slice(0, 4).map((f) => (
                          <Badge key={f} variant="outline" className="text-[9px] px-1 py-0 text-amber-500 border-amber-500/30">
                            {f}
                          </Badge>
                        ))}
                        {extFlags.length > 4 && (
                          <span className="text-[9px] text-muted-foreground font-mono">+{extFlags.length - 4}</span>
                        )}
                      </div>
                    )}
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
            );
          })}
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
  const initialExt = typeof parse.ext === "object" && parse.ext !== null ? parse.ext as Record<string, unknown> : {};
  const initialFlags = Array.isArray(initialExt.flag) ? (initialExt.flag as string[]).join(", ") : "";
  const initialHeader = typeof initialExt.header === "object" && initialExt.header !== null
    ? JSON.stringify(initialExt.header, null, 2)
    : "";

  const [form, setForm] = useState({
    name: parse.name,
    type: Number(parse.type ?? 0),
    url: parse.url,
    flagsStr: initialFlags,
    headerStr: initialHeader,
  });

  const save = () => {
    const flags = form.flagsStr
      .split(/[,，]/)
      .map((f) => f.trim())
      .filter(Boolean);

    let parsedHeader: Record<string, string> | undefined;
    if (form.headerStr.trim()) {
      try {
        parsedHeader = JSON.parse(form.headerStr.trim());
      } catch {}
    }

    let extObj: Record<string, unknown> | undefined = initialExt ? { ...initialExt } : {};
    if (flags.length) extObj.flag = flags;
    else delete extObj.flag;

    if (parsedHeader) extObj.header = parsedHeader;
    else if (!form.headerStr.trim()) delete extObj.header;

    if (Object.keys(extObj).length === 0) extObj = undefined;

    const result: TvBoxParse = {
      ...parse,
      name: form.name.trim(),
      type: form.type,
      url: form.url.trim(),
      ...(extObj ? { ext: extObj } : { ext: undefined }),
    };

    onSave(result);
  };

  return (
    <div className="space-y-3 p-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium">解析名称 *</label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例如：Json聚合 或 极速解析" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">接口类型</label>
        <select className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: Number(e.target.value) })}>
          <option value={0}>0 - Web 嗅探解析</option>
          <option value={1}>1 - JSON 接口解析</option>
          <option value={3}>3 - 聚合解析 (Demo)</option>
          <option value={2}>2 - 弹幕解析</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">解析 URL *</label>
        <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="如: https://.../jx.php?url= 或 Demo" className="font-mono text-xs" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">支持的 VIP 标识 (ext.flag)</label>
        <Input
          value={form.flagsStr}
          onChange={(e) => setForm({ ...form, flagsStr: e.target.value })}
          placeholder="逗号分隔，例如：qq, qiyi, youku, mgtv, bnb"
          className="font-mono text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">自定义请求头 (ext.header)</label>
        <Input
          value={form.headerStr}
          onChange={(e) => setForm({ ...form, headerStr: e.target.value })}
          placeholder="JSON 格式，例如：{&quot;User-Agent&quot;: &quot;...&quot;}"
          className="font-mono text-xs"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button variant="primary" onClick={save}>保存</Button>
      </div>
    </div>
  );
}
