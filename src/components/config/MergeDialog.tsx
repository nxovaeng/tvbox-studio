import React, { useState } from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Input";
import { useTvBoxStore, useUIStore } from "../../store";
import { getContent } from "../../lib/tauri";
import { Merge, Plus } from "lucide-react";

interface Props { open: boolean; onClose: () => void; }

export function MergeDialog({ open, onClose }: Props) {
  const { mergeUrls, setMergeUrls, mergeFromUrl, mergeAll } = useTvBoxStore();
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(false);

  const handleMergeAll = async () => {
    setLoading(true);
    try {
      await mergeAll(getContent);
      addToast({ type: "success", message: "多源合并完成" });
      onClose();
    } catch (e) {
      addToast({ type: "error", message: `合并失败: ${e}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="多源合并" description="将多个 TVBox 配置源合并到当前配置" size="md">
      <div className="space-y-4 p-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">合并源地址</label>
          <p className="text-xs text-muted-foreground">每行一个 URL，或用逗号、分号分隔</p>
          <Textarea
            value={mergeUrls}
            onChange={(e) => setMergeUrls(e.target.value)}
            rows={6}
            placeholder={"https://example.com/tvbox1.json\nhttps://example.com/tvbox2.json\n..."}
            className="font-mono text-xs"
          />
        </div>
        <div className="bg-muted/40 rounded-md p-3 text-xs text-muted-foreground space-y-1">
          <p>合并规则：</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>爬虫规则 (sites)：按 API + Ext 去重</li>
            <li>直播规则 (lives)：按 URL 去重</li>
            <li>解析接口 (parses)：按 URL 去重</li>
            <li>广告/VIP/规则：合并去重</li>
            <li>Spider/壁纸：以最后一个有值的为准</li>
          </ul>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button variant="primary" loading={loading}
            onClick={handleMergeAll}
            icon={<Merge className="h-3.5 w-3.5" />}>
            开始合并
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
