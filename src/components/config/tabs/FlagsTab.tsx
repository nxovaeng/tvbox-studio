import React, { useState } from "react";
import { useTvBoxStore, useUIStore } from "../../../store";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Plus, Trash2, X } from "lucide-react";

const COMMON_FLAGS = ["youku", "qq", "iqiyi", "letv", "sohu", "pptv", "mgtv", "bilibili", "baidu", "wangyi", "1905"];

export function FlagsTab() {
  const { source, updateSource } = useTvBoxStore();
  const { addToast } = useUIStore();
  const [newFlag, setNewFlag] = useState("");

  const flags = source?.flags ?? [];

  const handleAdd = (flag: string) => {
    const v = flag.trim();
    if (!v || flags.includes(v)) return;
    updateSource({ flags: [...flags, v] });
    setNewFlag("");
  };

  const handleRemove = (v: string) => {
    updateSource({ flags: flags.filter((f) => f !== v) });
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-4 space-y-4 max-w-xl">
        <div>
          <h3 className="text-sm font-medium mb-2">VIP 标识列表</h3>
          <p className="text-xs text-muted-foreground">
            识别到这些标识的视频，将自动调用解析接口进行 VIP 解析
          </p>
        </div>

        {/* 已添加的标识 */}
        <div className="flex flex-wrap gap-2">
          {flags.map((f) => (
            <div key={f}
              className="flex items-center gap-1 bg-primary/10 text-primary rounded-full px-3 py-1 text-sm">
              <span>{f}</span>
              <button onClick={() => handleRemove(f)}
                className="hover:text-destructive transition-colors ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {flags.length === 0 && (
            <span className="text-sm text-muted-foreground">暂无 VIP 标识</span>
          )}
        </div>

        {/* 添加新标识 */}
        <div className="flex gap-2">
          <Input
            value={newFlag}
            onChange={(e) => setNewFlag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd(newFlag)}
            placeholder="输入新标识，回车添加..."
            className="flex-1"
          />
          <Button variant="primary" size="icon"
            onClick={() => handleAdd(newFlag)} icon={<Plus className="h-4 w-4" />} />
        </div>

        {/* 常用标识快速添加 */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">常用标识（点击添加）:</p>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_FLAGS.filter((f) => !flags.includes(f)).map((f) => (
              <button
                key={f}
                onClick={() => handleAdd(f)}
                className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-primary hover:text-primary transition-colors"
              >
                + {f}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
