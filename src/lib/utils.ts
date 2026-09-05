import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================
// JSONC 解析（支持 // # /* */ 注释和尾逗号）
// ============================================================
export function parseJsonc(text: string): unknown {
  // 移除 # 行注释
  let s = text.replace(/^#.*$/gm, "");
  // 移除 // 行注释（注意不要误删 URL 中的 //）
  s = s.replace(/([^:])\/\/[^\n]*/g, "$1");
  // 移除 /* */ 块注释
  s = s.replace(/\/\*[\s\S]*?\*\//g, "");
  // 移除尾随逗号
  s = s.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(s);
}

// ============================================================
// 格式化 JSON
// ============================================================
export function formatJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

// ============================================================
// 配置隐写加密 (PNG 尾部附加 base64(JSON))
// ============================================================
const BUILT_IN_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export function encodeConfig(jsonContent: string): Uint8Array {
  const imgData = Uint8Array.from(atob(BUILT_IN_PNG_B64), (c) =>
    c.charCodeAt(0)
  );
  const prefix = randomAlpha(8) + "**";
  const encoded = btoa(unescape(encodeURIComponent(jsonContent)));
  const suffix = prefix + encoded;
  const suffixBytes = new TextEncoder().encode(suffix);
  const result = new Uint8Array(imgData.length + suffixBytes.length);
  result.set(imgData);
  result.set(suffixBytes, imgData.length);
  return result;
}

export function decodeConfig(content: string | ArrayBuffer): string | null {
  let text: string;
  if (content instanceof ArrayBuffer) {
    text = new TextDecoder("utf-8").decode(content);
  } else {
    text = content;
  }
  const match = text.match(/[a-zA-Z]{8}\*\*([\s\S]+)$/);
  if (!match) return null;
  try {
    return decodeURIComponent(escape(atob(match[1])));
  } catch {
    return null;
  }
}

function randomAlpha(len: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ============================================================
// GitHub 代理替换
// ============================================================
export function applyGithubProxy(url: string, proxy: string): string {
  if (!proxy) return url;
  if (
    url.includes("raw.githubusercontent.com") ||
    url.includes("raw.github.com")
  ) {
    return proxy.replace(/\/$/, "") + "/" + url;
  }
  return url;
}

// ============================================================
// 文件大小格式化
// ============================================================
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

// ============================================================
// 时间格式化
// ============================================================
export function formatTime(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================
// URL 验证
// ============================================================
export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// ============================================================
// 从 URL 推断文件名
// ============================================================
export function urlToFilename(url: string, fallback = "config.json"): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || fallback;
  } catch {
    return fallback;
  }
}

// ============================================================
// 防抖
// ============================================================
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ============================================================
// 深拷贝
// ============================================================
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ============================================================
// 生成唯一 ID
// ============================================================
export function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ============================================================
// 截取字符串规则解析 (前缀&&后缀)
// ============================================================
export function extractByRule(html: string, rule: string): string {
  if (!rule || !html) return "";
  const parts = rule.split("&&");
  if (parts.length === 2) {
    const [before, after] = parts;
    const start = before ? html.indexOf(before) : 0;
    if (start === -1) return "";
    const content = before ? html.slice(start + before.length) : html;
    if (!after) return content;
    const end = content.indexOf(after);
    return end === -1 ? content : content.slice(0, end);
  }
  return html;
}

// ============================================================
// TvBox JSON 智能合并（去重）
// ============================================================
import type { TvBoxSource, TvBoxVod, TvBoxLive, TvBoxParse, TvBoxRule, TvBoxDoh } from "../types/tvbox";

export function mergeTvBoxSources(base: TvBoxSource, incoming: TvBoxSource): TvBoxSource {
  const result = deepClone(base);
  const inc = deepClone(incoming);

  // 将全局 spider 下放到没有明确指定 jar 的 Java 自定义爬虫源中
  // 仅 type === 3 且 api 以 csp_ 开头（代表 Java 类）的才需要 jar，cms/js/py 等不需要
  if (result.spider) {
    result.sites.forEach(s => {
      if (!s.jar && s.type === 3 && s.api?.startsWith("csp_")) {
        s.jar = result.spider;
      }
    });
  }
  if (inc.spider) {
    inc.sites.forEach(s => {
      if (!s.jar && s.type === 3 && s.api?.startsWith("csp_")) {
        s.jar = inc.spider;
      }
    });
  }

  // 合并 sites（优先以 key 为主，次之以 api+ext+jar 拼合为唯一键，防止 object ext 发生 [object Object] 碰撞覆盖）
  const siteMap = new Map<string, TvBoxVod>();
  const siteKey = (s: TvBoxVod) => {
    if (s.key) return `key:${s.key}`;
    const extStr = typeof s.ext === "object" ? JSON.stringify(s.ext) : String(s.ext ?? "");
    const jarStr = s.jar ?? "";
    return `api:${s.api}_ext:${extStr}_jar:${jarStr}`;
  };

  result.sites.forEach((s) => siteMap.set(siteKey(s), s));
  inc.sites.forEach((s) => {
    const k = siteKey(s);
    if (!siteMap.has(k)) siteMap.set(k, s);
  });
  result.sites = Array.from(siteMap.values());

  // 合并 lives（以 url 或 channels 拼合为键）
  const liveMap = new Map<string, TvBoxLive>();
  const liveKey = (l: TvBoxLive) =>
    l.url ?? (l.channels ?? []).map((c) => c.urls.join(",")).join("|");
  result.lives.forEach((l) => liveMap.set(liveKey(l), l));
  incoming.lives.forEach((l) => {
    const k = liveKey(l);
    if (!liveMap.has(k)) liveMap.set(k, l);
  });
  result.lives = Array.from(liveMap.values());

  // 合并 parses（以 url 为键）
  if (incoming.parses?.length) {
    const parseMap = new Map<string, TvBoxParse>();
    (result.parses ?? []).forEach((p) => parseMap.set(p.url, p));
    incoming.parses.forEach((p) => {
      if (!parseMap.has(p.url)) parseMap.set(p.url, p);
    });
    result.parses = Array.from(parseMap.values());
  }

  // 合并 flags（Set 去重）
  if (incoming.flags?.length) {
    result.flags = Array.from(new Set([...(result.flags ?? []), ...incoming.flags]));
  }

  // 合并 ads（Set 去重）
  if (incoming.ads?.length) {
    result.ads = Array.from(new Set([...(result.ads ?? []), ...incoming.ads]));
  }

  // 合并 rules（以 host+hosts+regex 拼合为键）
  if (incoming.rules?.length) {
    const ruleKey = (r: TvBoxRule) =>
      (r.host ?? "") + (r.hosts ?? []).join(",") + (r.regex ?? []).join(",");
    const ruleMap = new Map<string, TvBoxRule>();
    (result.rules ?? []).forEach((r) => ruleMap.set(ruleKey(r), r));
    incoming.rules.forEach((r) => {
      const k = ruleKey(r);
      if (!ruleMap.has(k)) ruleMap.set(k, r);
    });
    result.rules = Array.from(ruleMap.values());
  }

  // 合并 doh（以 url 或 name 为键）
  if (incoming.doh?.length) {
    const dohMap = new Map<string, TvBoxDoh>();
    (result.doh ?? []).forEach((d) => dohMap.set(d.url || d.name, d));
    incoming.doh.forEach((d) => {
      const k = d.url || d.name;
      if (!dohMap.has(k)) dohMap.set(k, d);
    });
    result.doh = Array.from(dohMap.values());
  }

  // 合并 hosts（Set 去重）
  if (incoming.hosts?.length) {
    result.hosts = Array.from(new Set([...(result.hosts ?? []), ...incoming.hosts]));
  }

  // spider / wallpaper / warningText / danmaku / logo：incoming 不为空时覆盖
  if (incoming.spider) result.spider = incoming.spider;
  if (incoming.wallpaper) result.wallpaper = incoming.wallpaper;
  if (incoming.warningText) result.warningText = incoming.warningText;
  if (incoming.danmaku) result.danmaku = incoming.danmaku;
  if (incoming.logo) result.logo = incoming.logo;

  return result;
}
