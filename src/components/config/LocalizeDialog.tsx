import React, { useState, useCallback } from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { ProgressBar } from "../ui/Progress";
import { Badge } from "../ui/Badge";
import { useTvBoxStore, useUIStore } from "../../store";
import { copyLocalFile, downloadFile } from "../../lib/tauri";
import { isValidUrl } from "../../lib/utils";
import type { TvBoxSource } from "../../types/tvbox";
import { Download, Check, X, AlertCircle, RefreshCw, HardDrive } from "lucide-react";

interface ResourceItem {
  id: string;
  type: "spider" | "jar" | "js" | "py" | "ext";
  url: string;
  sourcePath?: string;
  siteName?: string;
  localPath: string;
  status: "pending" | "downloading" | "done" | "error" | "skipped";
  error?: string;
}

interface Props { open: boolean; onClose: () => void; sourceUrl: string; }

function extractResources(source: TvBoxSource, saveDir: string, sourceUrl: string): ResourceItem[] {
  const items: ResourceItem[] = [];
  const root = saveDir.replace(/\/+$/, "");
  const allowed = new Set(["jar", "js", "py", "json", "txt"]);
  const isRemoteConfig = sourceUrl.startsWith("http://") || sourceUrl.startsWith("https://");
  const localBase = sourceUrl.startsWith("file://")
    ? decodeURIComponent(sourceUrl.slice(7)).replace(/\\/g, "/").replace(/\/[^/]*$/, "")
    : "";

  const add = (value: string, id: string, type: ResourceItem["type"], dir: string, siteName?: string) => {
    const raw = value.split(";")[0].trim();
    if (!raw) return;
    // 忽略内置的 CSP 引擎类（如 csp_XYQHiker, csp_XBPQ 等，它们存在于 spider.jar 内部）
    if (raw.startsWith("csp_")) return;

    let url = raw;
    let sourcePath: string | undefined;
    if (isValidUrl(raw)) {
      url = raw;
    } else if (localBase && !raw.startsWith("/")) {
      sourcePath = `${localBase}/${raw.replace(/^\.\//, "")}`;
    } else if (isRemoteConfig) {
      try { url = new URL(raw, sourceUrl).toString(); } catch { return; }
    } else {
      return;
    }
    const resourceUrl = isValidUrl(url) ? new URL(url) : null;
    const encodedFilename = resourceUrl
      ? resourceUrl.pathname.split("/").filter(Boolean).pop() || "resource"
      : raw.split(/[\\/]/).pop()?.split("?")[0] || "resource";
    let filename = encodedFilename;
    try {
      filename = decodeURIComponent(encodedFilename);
    } catch {
      filename = encodedFilename;
    }
    filename = filename.replace(/[\\/]/g, "_");
    const extension = filename.toLowerCase().split(".").pop() ?? "";
    if (!allowed.has(extension)) return;

    const isLibraryScript = resourceUrl?.pathname.toLowerCase().includes("/lib/") ?? false;
    let resourceDir = dir;
    if (type === "spider" || extension === "jar") resourceDir = "jar";
    else if (isLibraryScript) resourceDir = "lib";
    else if (extension === "js") resourceDir = "js";
    else if (extension === "py") resourceDir = "py";
    else if (extension === "json") resourceDir = "json";
    else if (extension === "txt") resourceDir = "rules";

    items.push({
      id,
      type,
      url,
      sourcePath,
      siteName,
      localPath: `${root}/${resourceDir}/${filename}`,
      status: "pending",
    });
  };

  if (source.spider) add(source.spider, "spider", "spider", "jar");
  source.sites.forEach((site) => {
    if (site.jar) add(site.jar, `jar_${site.key}`, "jar", "jar", site.name);
    if (typeof site.ext === "string" && site.ext) {
      add(site.ext, `ext_${site.key}`, "ext", "rules", site.name);
    } else if (typeof site.ext === "object" && site.ext !== null) {
      // 扫描 ext 对象中的文件资源（如 cookie: .../bili_cookie.txt 或 site: .../603.txt）
      Object.entries(site.ext).forEach(([k, v]) => {
        if (typeof v === "string" && (v.endsWith(".txt") || v.endsWith(".json") || v.endsWith(".js") || v.endsWith(".py"))) {
          add(v, `ext_prop_${site.key}_${k}`, "ext", "rules", `${site.name} (${k})`);
        }
      });
    }
    if (site.type === 3 && site.api && !site.api.startsWith("csp_")) {
      const apiType = /\.py(?:[?#]|$)/i.test(site.api) ? "py" : "js";
      add(site.api, `api_${site.key}`, apiType, apiType, site.name);
    }
  });
  source.lives.forEach((live, i) => {
    if (live.url && typeof live.url === "string") {
      add(live.url, `live_${i}`, "ext", "lives", live.name);
    }
  });

  const seen = new Set<string>();
  return items.map((item) => {
    if (seen.has(item.url)) return { ...item, status: "skipped" as const };
    seen.add(item.url);
    return item;
  });
}

export function LocalizeDialog({ open, onClose, sourceUrl }: Props) {
  const { source, updateSource } = useTvBoxStore();
  const { addToast } = useUIStore();

  const defaultDir = React.useMemo(() => {
    if (source?.path) {
      return source.path.replace(/[/\\][^/\\]+$/, "");
    }
    const cleanName = source?.name ? source.name.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, "_") : "my_box";
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
    setResources((current) => current?.map((item) => item.id === id ? { ...item, ...patch } : item) ?? null);
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

    const relative = (path: string) => path.replace(saveDir.replace(/\/+$/, ""), ".").replace(/\\/g, "/");
    const updated = JSON.parse(JSON.stringify(source)) as TvBoxSource;
    const spider = resources.find((item) => item.id === "spider" && successful.has(item.id));
    if (spider && updated.spider) {
      const md5Match = updated.spider.match(/;md5;[a-zA-Z0-9_-]+/i);
      const md5Suffix = md5Match ? md5Match[0] : "";
      updated.spider = relative(spider.localPath) + md5Suffix;
    }
    updated.sites = updated.sites.map((site) => {
      const jar = resources.find((item) => item.id === `jar_${site.key}` && successful.has(item.id));
      const extItem = resources.find((item) => item.id === `ext_${site.key}` && successful.has(item.id));
      const api = resources.find((item) => item.id === `api_${site.key}` && successful.has(item.id));

      let nextExt = site.ext;
      if (extItem && typeof site.ext === "string") {
        nextExt = relative(extItem.localPath);
      } else if (typeof site.ext === "object" && site.ext !== null) {
        const objCopy = { ...site.ext };
        Object.keys(objCopy).forEach((k) => {
          const propItem = resources.find((item) => item.id === `ext_prop_${site.key}_${k}` && successful.has(item.id));
          if (propItem) {
            objCopy[k] = relative(propItem.localPath);
          }
        });
        nextExt = objCopy;
      }

      return {
        ...site,
        ...(jar ? { jar: relative(jar.localPath) } : {}),
        ...(nextExt !== undefined ? { ext: nextExt } : {}),
        ...(api ? { api: relative(api.localPath) } : {}),
      };
    });
    updated.lives = updated.lives.map((live, i) => {
      const liveItem = resources.find((item) => item.id === `live_${i}` && successful.has(item.id));
      return liveItem ? { ...live, url: relative(liveItem.localPath) } : live;
    });

    updateSource(updated);
    setRunning(false);

    // 若配置已有本地路径，直接自动写回本地文件并同步服务器资源目录
    if (source.path) {
      try {
        const { writeFile: writeLocal, setServerResourceDir, serverCache: updateCache } = await import("../../lib/tauri");
        const updatedJson = JSON.stringify(updated, null, 2);
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
  const finished = resources?.filter((item) => item.status === "done" || item.status === "error").length ?? 0;
  const typeLabel = (type: ResourceItem["type"]) => ({ spider: "Spider", jar: "JAR", js: "JS", py: "PY", ext: "规则/直播" }[type]);
  const typeVariant = (type: ResourceItem["type"]): "default" | "success" | "warning" => ({ spider: "default", jar: "warning", js: "default", py: "warning", ext: "success" }[type] as "default" | "success" | "warning");

  return <Dialog open={open} onClose={onClose} title="资源本地化" description="下载在线配置中的 JAR、JS、PY、JSON、TXT 资源到本地相对目录（不下载网页内容）" size="lg">
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <HardDrive className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Input value={saveDir} onChange={(event) => setSaveDir(event.target.value)} placeholder="本地保存目录，例如: ./box/my_box" className="flex-1 font-mono text-xs" />
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
        <Button variant="outline" onClick={analyze} icon={<RefreshCw className="h-3.5 w-3.5" />}>分析资源</Button>
      </div>
      {resources === null ? <div className="text-center py-8 text-muted-foreground text-sm">点击「分析资源」扫描资源</div> : resources.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">未发现指定类型的外部资源</div> : <>
        {running && <ProgressBar value={finished} max={total} label="下载进度" variant="default" size="md" />}
        <div className="border border-border rounded-lg overflow-hidden max-h-64 overflow-y-auto"><div className="divide-y divide-border">{resources.map((item) => <div key={item.id} className="flex items-start gap-3 px-3 py-2 text-sm">
          <div className="flex-shrink-0 mt-0.5">{item.status === "pending" && <div className="w-4 h-4 rounded-full border-2 border-border" />}{item.status === "downloading" && <RefreshCw className="w-4 h-4 text-primary animate-spin" />}{item.status === "done" && <Check className="w-4 h-4 text-green-500" />}{item.status === "error" && <X className="w-4 h-4 text-red-500" />}{item.status === "skipped" && <AlertCircle className="w-4 h-4 text-muted-foreground" />}</div>
          <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><Badge variant={typeVariant(item.type)} className="text-[10px]">{typeLabel(item.type)}</Badge>{item.siteName && <span className="text-xs text-muted-foreground truncate">{item.siteName}</span>}</div><div className="text-xs font-mono text-muted-foreground truncate mt-0.5">{item.url}</div><div className="text-xs text-muted-foreground truncate">→ {item.localPath}</div>{item.error && <div className="text-xs text-red-500 mt-0.5">{item.error}</div>}</div>
        </div>)}</div></div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>关闭</Button><Button variant="primary" loading={running} disabled={resources.every((item) => item.status !== "pending")} onClick={downloadAll} icon={<Download className="h-3.5 w-3.5" />}>下载全部 ({resources.filter((item) => item.status === "pending").length})</Button></div>
      </>}
    </div>
  </Dialog>;
}
