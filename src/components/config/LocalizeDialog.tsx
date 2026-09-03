/**
 * 资源本地化对话框
 * 分析当前配置中的所有外部资源（spider/jar/ext），下载到本地并替换路径
 */
import React, { useState, useCallback } from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { ProgressBar } from "../ui/Progress";
import { Badge } from "../ui/Badge";
import { useTvBoxStore, useUIStore } from "../../store";
import { downloadFile } from "../../lib/tauri";
import { isValidUrl, formatFileSize } from "../../lib/utils";
import type { TvBoxSource } from "../../types/tvbox";
import {
  Download, Check, X, AlertCircle, FolderOpen, RefreshCw, HardDrive,
} from "lucide-react";

interface ResourceItem {
  id: string;
  type: "spider" | "jar" | "ext" | "live";
  url: string;
  siteName?: string;
  localPath: string;
  status: "pending" | "downloading" | "done" | "error" | "skipped";
  error?: string;
  size?: number;
}

interface Props { open: boolean; onClose: () => void; }

function extractResources(source: TvBoxSource, saveDir: string): ResourceItem[] {
  const items: ResourceItem[] = [];
  const safeDir = saveDir.replace(/\/+$/, "");

  // spider JAR
  if (source.spider && isValidUrl(source.spider.split(";")[0])) {
    const url = source.spider.split(";")[0];
    const filename = url.split("/").pop() ?? "spider.jar";
    items.push({
      id: "spider",
      type: "spider",
      url,
      localPath: `${safeDir}/jar/${filename}`,
      status: "pending",
    });
  }

  // sites: jar + ext
  source.sites.forEach((site) => {
    if (site.jar && isValidUrl(site.jar)) {
      const filename = site.jar.split("/").pop() ?? `${site.key}.jar`;
      items.push({
        id: `jar_${site.key}`,
        type: "jar",
        url: site.jar,
        siteName: site.name,
        localPath: `${safeDir}/jar/${filename}`,
        status: "pending",
      });
    }
    if (site.ext && typeof site.ext === "string" && isValidUrl(site.ext)) {
      const ext = site.ext.split(";")[0];
      const filename = ext.split("/").pop() ?? `${site.key}.json`;
      items.push({
        id: `ext_${site.key}`,
        type: "ext",
        url: ext,
        siteName: site.name,
        localPath: `${safeDir}/rules/${filename}`,
        status: "pending",
      });
    }
  });

  // lives: url
  source.lives.forEach((live, i) => {
    if (live.url && isValidUrl(live.url)) {
      const filename = live.url.split("/").pop()?.split("?")[0] ?? `live_${i}.m3u`;
      items.push({
        id: `live_${i}`,
        type: "live",
        url: live.url,
        siteName: live.name,
        localPath: `${safeDir}/lives/${filename}`,
        status: "pending",
      });
    }
  });

  // dedupe by url
  const seen = new Set<string>();
  return items.filter((x) => {
    if (seen.has(x.url)) { x.status = "skipped"; return true; }
    seen.add(x.url);
    return true;
  });
}

export function LocalizeDialog({ open, onClose }: Props) {
  const { source, updateSource } = useTvBoxStore();
  const { addToast } = useUIStore();
  const [saveDir, setSaveDir] = useState("./box");
  const [resources, setResources] = useState<ResourceItem[] | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);

  const handleAnalyze = useCallback(() => {
    if (!source) return;
    const items = extractResources(source, saveDir);
    setResources(items);
    setDone(0);
  }, [source, saveDir]);

  const updateItem = (id: string, patch: Partial<ResourceItem>) => {
    setResources((prev) => prev?.map((x) => x.id === id ? { ...x, ...patch } : x) ?? null);
  };

  const handleDownloadAll = async () => {
    if (!resources || !source) return;
    const pending = resources.filter((r) => r.status === "pending");
    if (!pending.length) return;

    setRunning(true);
    setDone(0);
    let completed = 0;

    // 逐个下载
    for (const item of pending) {
      updateItem(item.id, { status: "downloading" });
      try {
        await downloadFile(item.url, item.localPath);
        updateItem(item.id, { status: "done" });
        completed++;
        setDone(completed);
      } catch (e) {
        updateItem(item.id, { status: "error", error: String(e) });
        completed++;
        setDone(completed);
      }
    }

    // 更新配置中的路径为相对路径
    const relPath = (abs: string) => abs.replace(saveDir.replace(/\/+$/, ""), ".").replace(/\\/g, "/");

    const updatedSource = JSON.parse(JSON.stringify(source)) as TvBoxSource;

    // 替换 spider
    const spiderItem = resources.find((r) => r.type === "spider" && r.status === "done");
    if (spiderItem && updatedSource.spider) {
      const parts = updatedSource.spider.split(";");
      parts[0] = relPath(spiderItem.localPath);
      updatedSource.spider = parts.join(";");
    }

    // 替换 sites
    updatedSource.sites = updatedSource.sites.map((site) => {
      const jarItem = resources.find((r) => r.id === `jar_${site.key}` && r.status === "done");
      const extItem = resources.find((r) => r.id === `ext_${site.key}` && r.status === "done");
      return {
        ...site,
        ...(jarItem ? { jar: relPath(jarItem.localPath) } : {}),
        ...(extItem && typeof site.ext === "string"
          ? { ext: relPath(extItem.localPath) }
          : {}),
      };
    });

    // 替换 lives
    updatedSource.lives = updatedSource.lives.map((live, i) => {
      const liveItem = resources.find((r) => r.id === `live_${i}` && r.status === "done");
      return liveItem ? { ...live, url: relPath(liveItem.localPath) } : live;
    });

    updateSource(updatedSource);
    setRunning(false);

    const succCount = resources.filter((r) => r.status === "done").length;
    addToast({
      type: succCount > 0 ? "success" : "warning",
      message: `本地化完成：${succCount} 个资源已下载，配置路径已更新`,
    });
  };

  const total = resources?.filter((r) => r.status !== "skipped").length ?? 0;
  const doneCount = resources?.filter((r) => r.status === "done" || r.status === "error").length ?? 0;

  const typeLabel = (t: ResourceItem["type"]) =>
    ({ spider: "Spider", jar: "JAR", ext: "规则", live: "直播" }[t]);

  const typeVariant = (t: ResourceItem["type"]): "default" | "success" | "warning" | "outline" =>
    ({ spider: "default" as const, jar: "warning" as const, ext: "success" as const, live: "outline" as const }[t]);

  return (
    <Dialog open={open} onClose={onClose} title="资源本地化"
      description="下载配置中的外部资源到本地服务器，并自动替换为相对路径" size="lg">
      <div className="flex flex-col gap-4 p-4">
        {/* 保存目录 */}
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            value={saveDir}
            onChange={(e) => setSaveDir(e.target.value)}
            placeholder="本地保存目录，例如: ./box"
            className="flex-1"
          />
          <Button variant="outline" onClick={handleAnalyze}
            icon={<RefreshCw className="h-3.5 w-3.5" />}>
            分析资源
          </Button>
        </div>

        {/* 资源列表 */}
        {resources === null ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            点击「分析资源」扫描配置中的外部链接
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            未发现需要下载的外部资源
          </div>
        ) : (
          <>
            {/* 进度 */}
            {running && (
              <ProgressBar value={doneCount} max={total} label="下载进度" variant="default" size="md" />
            )}

            {/* 列表 */}
            <div className="border border-border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              <div className="divide-y divide-border">
                {resources.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 px-3 py-2 text-sm">
                    {/* 状态图标 */}
                    <div className="flex-shrink-0 mt-0.5">
                      {item.status === "pending"    && <div className="w-4 h-4 rounded-full border-2 border-border" />}
                      {item.status === "downloading" && <RefreshCw className="w-4 h-4 text-primary animate-spin" />}
                      {item.status === "done"       && <Check className="w-4 h-4 text-green-500" />}
                      {item.status === "error"      && <X className="w-4 h-4 text-red-500" />}
                      {item.status === "skipped"    && <AlertCircle className="w-4 h-4 text-muted-foreground" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={typeVariant(item.type)} className="text-[10px]">
                          {typeLabel(item.type)}
                        </Badge>
                        {item.siteName && (
                          <span className="text-xs text-muted-foreground truncate">{item.siteName}</span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground truncate mt-0.5">{item.url}</div>
                      <div className="text-xs text-muted-foreground truncate">→ {item.localPath}</div>
                      {item.error && (
                        <div className="text-xs text-red-500 mt-0.5">{item.error}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 摘要 */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{resources.filter((r) => r.status !== "skipped").length} 个资源</span>
              {resources.filter((r) => r.status === "done").length > 0 && (
                <span className="text-green-600">
                  ✓ {resources.filter((r) => r.status === "done").length} 已完成
                </span>
              )}
              {resources.filter((r) => r.status === "error").length > 0 && (
                <span className="text-red-600">
                  ✗ {resources.filter((r) => r.status === "error").length} 失败
                </span>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>关闭</Button>
              <Button
                variant="primary"
                loading={running}
                disabled={resources.filter((r) => r.status === "pending").length === 0}
                onClick={handleDownloadAll}
                icon={<Download className="h-3.5 w-3.5" />}
              >
                下载全部 ({resources.filter((r) => r.status === "pending").length})
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
