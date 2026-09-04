import React, { useState, useCallback } from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { ProgressBar } from "../ui/Progress";
import { Badge } from "../ui/Badge";
import { useTvBoxStore, useUIStore } from "../../store";
import { copyLocalFile, downloadFile } from "../../lib/tauri";
import {
  type ResourceItem,
  extractResources,
  rewriteSourcePaths,
  serializeTvBoxSource,
} from "../../lib/localize";
import { Download, Check, X, AlertCircle, RefreshCw, HardDrive } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  sourceUrl: string;
}

export function LocalizeDialog({ open, onClose, sourceUrl }: Props) {
  const { source, updateSource } = useTvBoxStore();
  const { addToast } = useUIStore();

  const defaultDir = React.useMemo(() => {
    if (source?.path) {
      return source.path.replace(/[/\\][^/\\]+$/, "");
    }
    const cleanName = source?.name
      ? source.name.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, "_")
      : "my_box";
    return `./box/${cleanName}`;
  }, [source]);

  const [saveDir, setSaveDir] = useState(defaultDir);
  const [resources, setResources] = useState<ResourceItem[] | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);

  React.useEffect(() => {
    setSaveDir(defaultDir);
  }, [defaultDir]);

  const analyze = useCallback(() => {
    if (source) setResources(extractResources(source, saveDir, sourceUrl));
    setDone(0);
  }, [source, saveDir, sourceUrl]);

  const updateItem = (id: string, patch: Partial<ResourceItem>) => {
    setResources((current) =>
      current?.map((item) => (item.id === id ? { ...item, ...patch } : item)) ?? null
    );
  };

  const downloadAll = async () => {
    if (!resources || !source) return;
    const pending = resources.filter((item) => item.status === "pending");
    if (!pending.length) return;
    setRunning(true);
    setDone(0);
    let completed = 0;
    const successful = new Set<string>();

    for (const item of pending) {
      updateItem(item.id, { status: "downloading" });
      try {
        if (item.sourcePath) await copyLocalFile(item.sourcePath, item.localPath);
        else await downloadFile(item.url, item.localPath);
        updateItem(item.id, { status: "done" });
        successful.add(item.id);
      } catch (error) {
        updateItem(item.id, { status: "error", error: String(error) });
      }
      completed++;
      setDone(completed);
    }

    const updated = rewriteSourcePaths(source, resources, saveDir, successful);
    updateSource(updated);
    setRunning(false);

    // 若配置已有本地路径，直接自动写回本地文件并同步服务器资源目录（纯净序列化，不带 name 和 path）
    if (source.path) {
      try {
        const { writeFile: writeLocal, setServerResourceDir, serverCache: updateCache } = await import(
          "../../lib/tauri"
        );
        const updatedJson = serializeTvBoxSource(updated);
        await writeLocal(source.path, updatedJson);
        useTvBoxStore.getState().setDirty(false);
        await setServerResourceDir(saveDir).catch(() => null);
        await updateCache("tvbox", updatedJson).catch(() => null);
        addToast({
          type: successful.size ? "success" : "warning",
          message: `本地化完成：${successful.size} 个资源已下载，已直接写回 ${source.path}`,
        });
        return;
      } catch {}
    }

    addToast({
      type: successful.size ? "success" : "warning",
      message: `本地化完成：${successful.size} 个资源已下载，配置路径已更新，请保存配置`,
    });
  };

  const total = resources?.filter((item) => item.status !== "skipped").length ?? 0;
  const finished =
    resources?.filter((item) => item.status === "done" || item.status === "error").length ?? 0;
  const typeLabel = (type: ResourceItem["type"]) =>
    ({ spider: "Spider", jar: "JAR", js: "JS", py: "PY", ext: "规则/直播" }[type]);
  const typeVariant = (type: ResourceItem["type"]): "default" | "success" | "warning" =>
    ({ spider: "default", jar: "warning", js: "default", py: "warning", ext: "success" }[
      type
    ] as "default" | "success" | "warning");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="资源本地化"
      description="下载配置中的 JAR、JS、PY、JSON、TXT 资源到本地相对目录（不下载网页内容）"
      size="lg"
    >
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            value={saveDir}
            onChange={(event) => setSaveDir(event.target.value)}
            placeholder="本地保存目录，例如: ./box/my_box"
            className="flex-1 font-mono text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const { open: openDir } = await import("@tauri-apps/plugin-dialog");
                const selected = await openDir({ directory: true, multiple: false });
                if (selected && typeof selected === "string") setSaveDir(selected);
              } catch {}
            }}
          >
            浏览
          </Button>
          <Button variant="outline" onClick={analyze} icon={<RefreshCw className="h-3.5 w-3.5" />}>
            分析资源
          </Button>
        </div>

        {resources === null ? (
          <div className="text-center py-8 text-muted-foreground text-sm">点击「分析资源」扫描资源</div>
        ) : resources.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">未发现指定类型的外部资源</div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                共发现 {resources.length} 个资源，需处理 {total} 个
              </span>
              {running && (
                <span>
                  进度: {finished} / {total}
                </span>
              )}
            </div>
            {running && <ProgressBar value={total ? (finished / total) * 100 : 0} />}
            <div className="max-h-64 overflow-y-auto space-y-1.5 border border-border rounded-lg p-2">
              {resources.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-accent/40 font-mono"
                >
                  <Badge variant={typeVariant(item.type)} className="text-[10px] flex-shrink-0">
                    {typeLabel(item.type)}
                  </Badge>
                  <span className="flex-1 truncate text-foreground" title={item.url}>
                    {item.siteName && (
                      <span className="text-muted-foreground mr-1">[{item.siteName}]</span>
                    )}
                    {item.localPath.split(/[/\\]/).pop()}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 max-w-[200px] truncate" title={item.localPath}>
                    {item.localPath}
                  </span>
                  <span className="flex-shrink-0">
                    {item.status === "pending" && <span className="text-muted-foreground">待下载</span>}
                    {item.status === "downloading" && (
                      <RefreshCw className="h-3.5 w-3.5 text-primary animate-spin" />
                    )}
                    {item.status === "done" && <Check className="h-3.5 w-3.5 text-green-500" />}
                    {item.status === "error" && (
                      <span title={item.error}>
                        <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                      </span>
                    )}
                    {item.status === "skipped" && (
                      <span className="text-[10px] text-muted-foreground">复用</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={running}>
            {finished > 0 && !running ? "完成" : "取消"}
          </Button>
          <Button
            variant="primary"
            onClick={downloadAll}
            disabled={running || !resources || total === 0 || finished === total}
            icon={<Download className="h-3.5 w-3.5" />}
          >
            {running ? "下载中..." : "全部下载"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
