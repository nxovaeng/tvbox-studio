import React, { useState } from "react";
import { useTvBoxStore } from "../../../store";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { TvBoxIjk } from "../../../types/tvbox";

export function IjkTab() {
  const { source, updateSource } = useTvBoxStore();
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  const ijk = source?.ijk ?? [];

  const toggle = (i: number) =>
    setExpanded((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const updateGroup = (i: number, patch: Partial<TvBoxIjk>) => {
    const updated = ijk.map((g, idx) => idx === i ? { ...g, ...patch } : g);
    updateSource({ ijk: updated });
  };

  const removeGroup = (i: number) => {
    updateSource({ ijk: ijk.filter((_, idx) => idx !== i) });
  };

  const addGroup = () => {
    updateSource({ ijk: [...ijk, { group: "新组", options: [] }] });
    setExpanded((s) => new Set([...s, ijk.length]));
  };

  const addOption = (gi: number) => {
    const g = ijk[gi];
    updateGroup(gi, { options: [...g.options, { category: 0, name: "", value: "" }] });
  };

  const updateOption = (gi: number, oi: number, patch: Partial<TvBoxIjk["options"][0]>) => {
    const g = ijk[gi];
    const opts = g.options.map((o, idx) => idx === oi ? { ...o, ...patch } : o);
    updateGroup(gi, { options: opts });
  };

  const removeOption = (gi: number, oi: number) => {
    const g = ijk[gi];
    updateGroup(gi, { options: g.options.filter((_, idx) => idx !== oi) });
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-4 space-y-3 max-w-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">IJK 播放器参数</h3>
          <Button variant="outline" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={addGroup}>
            添加组
          </Button>
        </div>

        {ijk.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            暂无 IJK 参数配置
          </div>
        ) : (
          ijk.map((group, gi) => (
            <div key={gi} className="border border-border rounded-lg overflow-hidden">
              <div
                className="flex items-center gap-2 px-3 py-2 bg-muted/30 cursor-pointer hover:bg-muted/50"
                onClick={() => toggle(gi)}
              >
                <span className="font-medium text-sm flex-1">{group.group}</span>
                <span className="text-xs text-muted-foreground">{group.options.length} 个参数</span>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeGroup(gi); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                {expanded.has(gi) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>

              {expanded.has(gi) && (
                <div className="p-3 space-y-2">
                  <div className="flex gap-2 mb-1">
                    <Input value={group.group} onChange={(e) => updateGroup(gi, { group: e.target.value })}
                      placeholder="组名" className="flex-1" />
                    <Button variant="outline" size="sm" icon={<Plus className="h-3.5 w-3.5" />}
                      onClick={() => addOption(gi)}>添加参数</Button>
                  </div>
                  {group.options.map((opt, oi) => (
                    <div key={oi} className="flex gap-2 items-center">
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm w-20 flex-shrink-0"
                        value={opt.category}
                        onChange={(e) => updateOption(gi, oi, { category: Number(e.target.value) })}
                      >
                        <option value={0}>0</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={4}>4</option>
                      </select>
                      <Input value={opt.name} onChange={(e) => updateOption(gi, oi, { name: e.target.value })}
                        placeholder="参数名" className="flex-1" />
                      <Input value={opt.value} onChange={(e) => updateOption(gi, oi, { value: e.target.value })}
                        placeholder="参数值" className="flex-1" />
                      <Button variant="ghost" size="icon" onClick={() => removeOption(gi, oi)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
