import React, { useState } from "react";
import { useTvBoxStore, useUIStore } from "../../../store";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Textarea } from "../../ui/Input";
import { Plus, Trash2, Copy } from "lucide-react";

export function AdsTab() {
  const { source, updateSource } = useTvBoxStore();
  const { addToast } = useUIStore();
  const [newAd, setNewAd] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const ads = source?.ads ?? [];

  const handleAdd = () => {
    const v = newAd.trim();
    if (!v) return;
    updateSource({ ads: [...ads, v] });
    setNewAd("");
  };

  const handleRemove = (i: number) => {
    updateSource({ ads: ads.filter((_, idx) => idx !== i) });
  };

  const handleBulkSave = () => {
    const items = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
    updateSource({ ads: items });
    setBulkMode(false);
    addToast({ type: "success", message: `已保存 ${items.length} 条规则` });
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(ads.join("\n"));
    addToast({ type: "info", message: "已复制到剪贴板" });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0 bg-background">
        <span className="text-sm text-muted-foreground">{ads.length} 条广告过滤规则</span>
        <div className="flex gap-1 ml-auto">
          <Button variant="outline" size="sm" onClick={() => { setBulkMode(!bulkMode); setBulkText(ads.join("\n")); }}>
            {bulkMode ? "取消批量" : "批量编辑"}
          </Button>
          {ads.length > 0 && (
            <Button variant="outline" size="sm" icon={<Copy className="h-3.5 w-3.5" />} onClick={handleCopyAll}>
              复制全部
            </Button>
          )}
        </div>
      </div>

      {bulkMode ? (
        <div className="flex-1 flex flex-col p-4 gap-3">
          <p className="text-xs text-muted-foreground">每行一条规则，支持正则表达式</p>
          <Textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="flex-1 font-mono text-xs"
            placeholder="每行一条广告过滤规则..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBulkMode(false)}>取消</Button>
            <Button variant="primary" onClick={handleBulkSave}>保存</Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="p-3 space-y-2">
            {/* 添加新规则 */}
            <div className="flex gap-2">
              <Input
                value={newAd}
                onChange={(e) => setNewAd(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="输入广告过滤规则（正则），回车添加..."
                className="flex-1"
              />
              <Button variant="primary" size="icon" onClick={handleAdd} icon={<Plus className="h-4 w-4" />} />
            </div>

            {ads.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                暂无广告过滤规则
              </div>
            ) : (
              <div className="space-y-1">
                {ads.map((ad, i) => (
                  <div key={i} className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50">
                    <span className="flex-1 text-sm font-mono truncate">{ad}</span>
                    <button
                      onClick={() => handleRemove(i)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
