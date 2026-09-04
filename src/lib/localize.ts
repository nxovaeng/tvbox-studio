import type { TvBoxSource } from "../types/tvbox";
import { isValidUrl } from "./utils";
import { copyLocalFile, downloadFile, getContent } from "./tauri";

export interface ResourceItem {
  id: string;
  type: "spider" | "jar" | "js" | "py" | "ext";
  url: string;
  sourcePath?: string;
  siteName?: string;
  localPath: string;
  status: "pending" | "downloading" | "done" | "error" | "skipped";
  error?: string;
}

/**
 * 纯净序列化 TVBox 配置
 * 严格剔除 top-level 的 "name" 与 "path"（这两个为本工具管理元数据，不属于 TVBox 配置规范）
 * 过滤掉以 "_" 开头的前端私有/扩展字段
 * 完美保留 sites、lives、parses 内部的合法 name 与属性
 */
export function serializeTvBoxSource(source: TvBoxSource): string {
  const { name: _name, path: _path, ...tvboxConfig } = source;
  const clean = JSON.parse(
    JSON.stringify(tvboxConfig, (k, v) => (k.startsWith("_") ? undefined : v))
  );
  return JSON.stringify(clean, null, 2);
}

/**
 * 跨环境拉取远程文本内容（Tauri 后端命令优先，浏览器 fetch 兜底）
 */
export async function fetchRemoteText(url: string): Promise<string> {
  try {
    return await getContent(url);
  } catch (err) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.text();
  }
}

/**
 * 从 TVBox 配置中提取可下载的本地化资源
 * 严格限制类型为: jar, js, py, json, txt（绝不下载网页 HTML 内容）
 */
export function extractResources(
  source: TvBoxSource,
  saveDir: string,
  sourceUrl: string
): ResourceItem[] {
  const items: ResourceItem[] = [];
  const root = saveDir.replace(/[/\\]+$/, "");
  const allowed = new Set(["jar", "js", "py", "json", "txt"]);
  const isRemoteConfig = sourceUrl.startsWith("http://") || sourceUrl.startsWith("https://");
  const localBase = sourceUrl.startsWith("file://")
    ? decodeURIComponent(sourceUrl.slice(7)).replace(/\\/g, "/").replace(/\/[^/]*$/, "")
    : "";

  const add = (
    value: string,
    id: string,
    type: ResourceItem["type"],
    dir: string,
    siteName?: string
  ) => {
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
      try {
        url = new URL(raw, sourceUrl).toString();
      } catch {
        return;
      }
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

  if (source.spider) {
    add(source.spider, "spider", "spider", "jar");
  }

  source.sites.forEach((site) => {
    if (site.jar) {
      add(site.jar, `jar_${site.key}`, "jar", "jar", site.name);
    }
    if (typeof site.ext === "string" && site.ext) {
      add(site.ext, `ext_${site.key}`, "ext", "rules", site.name);
    } else if (typeof site.ext === "object" && site.ext !== null) {
      // 扫描 ext 对象中的文件资源（如 cookie: .../bili_cookie.txt 或 site: .../603.txt）
      Object.entries(site.ext).forEach(([k, v]) => {
        if (
          typeof v === "string" &&
          (v.endsWith(".txt") || v.endsWith(".json") || v.endsWith(".js") || v.endsWith(".py"))
        ) {
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

  // 去重
  const seen = new Set<string>();
  return items.map((item) => {
    if (seen.has(item.url)) return { ...item, status: "skipped" as const };
    seen.add(item.url);
    return item;
  });
}

/**
 * 将配置对象中的资源 URL 重写为本地相对路径（如 ./jar/spider.jar 等）
 */
export function rewriteSourcePaths(
  source: TvBoxSource,
  resources: ResourceItem[],
  saveDir: string,
  successfulIds: Set<string>
): TvBoxSource {
  const root = saveDir.replace(/[/\\]+$/, "");
  const relative = (path: string) =>
    path.replace(root, ".").replace(/\\/g, "/");

  const updated = JSON.parse(JSON.stringify(source)) as TvBoxSource;

  const spider = resources.find((item) => item.id === "spider" && successfulIds.has(item.id));
  if (spider && updated.spider) {
    const md5Match = updated.spider.match(/;md5;[a-zA-Z0-9_-]+/i);
    const md5Suffix = md5Match ? md5Match[0] : "";
    updated.spider = relative(spider.localPath) + md5Suffix;
  }

  updated.sites = updated.sites.map((site) => {
    const jar = resources.find((item) => item.id === `jar_${site.key}` && successfulIds.has(item.id));
    const extItem = resources.find((item) => item.id === `ext_${site.key}` && successfulIds.has(item.id));
    const api = resources.find((item) => item.id === `api_${site.key}` && successfulIds.has(item.id));

    let nextExt = site.ext;
    if (extItem && typeof site.ext === "string") {
      nextExt = relative(extItem.localPath);
    } else if (typeof site.ext === "object" && site.ext !== null) {
      const objCopy = { ...site.ext };
      Object.keys(objCopy).forEach((k) => {
        const propItem = resources.find(
          (item) => item.id === `ext_prop_${site.key}_${k}` && successfulIds.has(item.id)
        );
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
    const liveItem = resources.find((item) => item.id === `live_${i}` && successfulIds.has(item.id));
    return liveItem ? { ...live, url: relative(liveItem.localPath) } : live;
  });

  return updated;
}

/**
 * 批量下载指定资源
 */
export async function downloadAllResources(
  resources: ResourceItem[],
  onProgress?: (item: ResourceItem, current: number, total: number) => void
): Promise<{ successfulIds: Set<string>; failedCount: number }> {
  const pending = resources.filter((item) => item.status === "pending");
  const successfulIds = new Set<string>();
  let completed = 0;
  let failed = 0;

  for (const item of pending) {
    item.status = "downloading";
    onProgress?.(item, completed, pending.length);

    try {
      if (item.sourcePath) {
        await copyLocalFile(item.sourcePath, item.localPath);
      } else {
        await downloadFile(item.url, item.localPath);
      }
      item.status = "done";
      successfulIds.add(item.id);
    } catch (err) {
      item.status = "error";
      item.error = String(err);
      failed++;
    }

    completed++;
    onProgress?.(item, completed, pending.length);
  }

  return { successfulIds, failedCount: failed };
}

