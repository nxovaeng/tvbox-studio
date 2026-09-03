import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  TvBoxSource,
  TxtPlaylist,
  AppSettings,
  HistoryItem,
  ServerStatus,
  R2Config,
} from "../types/tvbox";
import { DEFAULT_SETTINGS, type TvBoxVod, type TvBoxLive, type TvBoxParse } from "../types/tvbox";
import { deepClone, mergeTvBoxSources, genId, parseJsonc } from "../lib/utils";

// ============================================================
// 应用全局 UI 状态
// ============================================================
interface UIState {
  activeNav: "config" | "playlist" | "editor" | "settings";
  theme: "light" | "dark" | "system";
  sidebarCollapsed: boolean;
  toasts: ToastItem[];
  setActiveNav: (nav: UIState["activeNav"]) => void;
  setTheme: (theme: UIState["theme"]) => void;
  setSidebarCollapsed: (v: boolean) => void;
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
}

export interface ToastItem {
  id: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
  duration?: number;
}

export const useUIStore = create<UIState>((set) => ({
  activeNav: "config",
  theme: "system",
  sidebarCollapsed: false,
  toasts: [],
  setActiveNav: (nav) => set({ activeNav: nav }),
  setTheme: (theme) => set({ theme }),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  addToast: (toast) => {
    const id = genId();
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    const duration = toast.duration ?? 3000;
    if (duration > 0) setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), duration);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// ============================================================
// TVBox 配置管理状态
// ============================================================
interface TvBoxState {
  source: TvBoxSource | null;
  sourceUrl: string;
  sourcePath: string; // 已保存到本地的路径
  loading: boolean;
  mergeUrls: string;
  isDirty: boolean;
  // actions
  setLoading: (v: boolean) => void;
  setSourceUrl: (url: string) => void;
  setMergeUrls: (v: string) => void;
  loadFromText: (text: string, url?: string) => void;
  loadFromUrl: (url: string, fetchFn: (url: string) => Promise<string>) => Promise<void>;
  mergeFromUrl: (url: string, fetchFn: (url: string) => Promise<string>) => Promise<void>;
  mergeAll: (fetchFn: (url: string) => Promise<string>) => Promise<void>;
  updateSource: (patch: Partial<TvBoxSource>) => void;
  updateSite: (index: number, site: TvBoxVod) => void;
  addSite: (site: TvBoxVod) => void;
  removeSite: (keys: string[]) => void;
  updateLive: (index: number, live: TvBoxLive) => void;
  addLive: (live: TvBoxLive) => void;
  removeLive: (index: number) => void;
  updateParse: (index: number, parse: TvBoxParse) => void;
  addParse: (parse: TvBoxParse) => void;
  removeParse: (index: number) => void;
  setSiteStatus: (key: string, status: TvBoxVod["_status"]) => void;
  setLiveStatus: (index: number, status: TvBoxLive["_status"]) => void;
  setParseStatus: (index: number, status: TvBoxParse["_status"]) => void;
  setSourcePath: (path: string) => void;
  setDirty: (v: boolean) => void;
  clearSource: () => void;
  getJson: () => string;
}

export const useTvBoxStore = create<TvBoxState>((set, get) => ({
  source: null,
  sourceUrl: "",
  sourcePath: "",
  loading: false,
  mergeUrls: "",
  isDirty: false,

  setLoading: (v) => set({ loading: v }),
  setSourceUrl: (url) => set({ sourceUrl: url }),
  setMergeUrls: (v) => set({ mergeUrls: v }),
  setSourcePath: (path) => set({ sourcePath: path }),
  setDirty: (v) => set({ isDirty: v }),
  clearSource: () => set({ source: null, sourceUrl: "", sourcePath: "", isDirty: false }),

  loadFromText: (text, url) => {
    try {
      const data = parseJsonc(text) as TvBoxSource;
      set({ source: data, sourceUrl: url ?? "", isDirty: false });
    } catch (e) {
      throw new Error("JSON 解析失败: " + String(e));
    }
  },

  loadFromUrl: async (url, fetchFn) => {
    set({ loading: true });
    try {
      const text = await fetchFn(url);
      const data = parseJsonc(text) as TvBoxSource;
      set({ source: data, sourceUrl: url, isDirty: false, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  mergeFromUrl: async (url, fetchFn) => {
    set({ loading: true });
    try {
      const text = await fetchFn(url);
      const incoming = parseJsonc(text) as TvBoxSource;
      const current = get().source;
      if (!current) {
        set({ source: incoming, sourceUrl: url, loading: false, isDirty: true });
      } else {
        const merged = mergeTvBoxSources(current, incoming);
        set({ source: merged, loading: false, isDirty: true });
      }
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  mergeAll: async (fetchFn) => {
    const urls = get()
      .mergeUrls.split(/[,;，；\n]/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith("http"));
    for (const url of urls) {
      await get().mergeFromUrl(url, fetchFn).catch(() => null);
    }
  },

  updateSource: (patch) =>
    set((s) => ({ source: s.source ? { ...s.source, ...patch } : null, isDirty: true })),

  updateSite: (index, site) =>
    set((s) => {
      if (!s.source) return {};
      const sites = [...s.source.sites];
      sites[index] = site;
      return { source: { ...s.source, sites }, isDirty: true };
    }),

  addSite: (site) =>
    set((s) => ({
      source: s.source ? { ...s.source, sites: [...s.source.sites, site] } : null,
      isDirty: true,
    })),

  removeSite: (keys) =>
    set((s) => ({
      source: s.source
        ? { ...s.source, sites: s.source.sites.filter((x) => !keys.includes(x.key)) }
        : null,
      isDirty: true,
    })),

  updateLive: (index, live) =>
    set((s) => {
      if (!s.source) return {};
      const lives = [...s.source.lives];
      lives[index] = live;
      return { source: { ...s.source, lives }, isDirty: true };
    }),

  addLive: (live) =>
    set((s) => ({
      source: s.source ? { ...s.source, lives: [...s.source.lives, live] } : null,
      isDirty: true,
    })),

  removeLive: (index) =>
    set((s) => ({
      source: s.source
        ? { ...s.source, lives: s.source.lives.filter((_, i) => i !== index) }
        : null,
      isDirty: true,
    })),

  updateParse: (index, parse) =>
    set((s) => {
      if (!s.source) return {};
      const parses = [...(s.source.parses ?? [])];
      parses[index] = parse;
      return { source: { ...s.source, parses }, isDirty: true };
    }),

  addParse: (parse) =>
    set((s) => ({
      source: s.source
        ? { ...s.source, parses: [...(s.source.parses ?? []), parse] }
        : null,
      isDirty: true,
    })),

  removeParse: (index) =>
    set((s) => ({
      source: s.source
        ? { ...s.source, parses: (s.source.parses ?? []).filter((_, i) => i !== index) }
        : null,
      isDirty: true,
    })),

  setSiteStatus: (key, status) =>
    set((s) => {
      if (!s.source) return {};
      return {
        source: {
          ...s.source,
          sites: s.source.sites.map((x) => (x.key === key ? { ...x, _status: status } : x)),
        },
      };
    }),

  setLiveStatus: (index, status) =>
    set((s) => {
      if (!s.source) return {};
      const lives = s.source.lives.map((x, i) =>
        i === index ? { ...x, _status: status } : x
      );
      return { source: { ...s.source, lives } };
    }),

  setParseStatus: (index, status) =>
    set((s) => {
      if (!s.source) return {};
      const parses = (s.source.parses ?? []).map((x, i) =>
        i === index ? { ...x, _status: status } : x
      );
      return { source: { ...s.source, parses } };
    }),

  getJson: () => {
    const src = get().source;
    if (!src) return "";
    // 过滤掉以 _ 开头的前端扩展字段
    const clean = JSON.parse(JSON.stringify(src, (k, v) => (k.startsWith("_") ? undefined : v)));
    return JSON.stringify(clean, null, 2);
  },
}));

// ============================================================
// 直播源播放列表状态
// ============================================================
interface PlaylistState {
  items: TxtPlaylist[];
  loading: boolean;
  loadFromText: (text: string) => void;
  mergeFromText: (text: string) => void;
  updateItem: (hash: string, patch: Partial<TxtPlaylist>) => void;
  removeItem: (hash: string) => void;
  setItemStatus: (hash: string, status: TxtPlaylist["online"]) => void;
  clear: () => void;
  getGrouped: () => import("../types/tvbox").TxtPlaylistGroup[];
  getText: () => string;
}

function parsePlaylistText(text: string): TxtPlaylist[] {
  const lines = text.split("\n");
  const items: TxtPlaylist[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const commaIdx = line.lastIndexOf(",");
    if (commaIdx === -1) {
      // 分组标题行
      items.push({
        name: line.replace(/#genre#/i, "").trim(),
        url: "",
        isGroup: true,
        raw: line,
        hash: btoa(encodeURIComponent(line)).slice(0, 16),
        online: "unknown",
      });
    } else {
      const name = line.slice(0, commaIdx).trim();
      const url = line.slice(commaIdx + 1).trim();
      items.push({
        name,
        url,
        isGroup: !url || url === "#genre#",
        http: url.startsWith("http"),
        raw: line,
        hash: btoa(encodeURIComponent(line)).slice(0, 16),
        online: "unknown",
      });
    }
  }
  return items;
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  items: [],
  loading: false,

  loadFromText: (text) => {
    const items = parsePlaylistText(text);
    set({ items });
  },

  mergeFromText: (text) => {
    const incoming = parsePlaylistText(text);
    const existing = get().items;
    const existHashes = new Set(existing.map((x) => x.hash));
    const newItems = incoming.filter((x) => !existHashes.has(x.hash));
    set({ items: [...existing, ...newItems] });
  },

  updateItem: (hash, patch) =>
    set((s) => ({
      items: s.items.map((x) => (x.hash === hash ? { ...x, ...patch } : x)),
    })),

  removeItem: (hash) =>
    set((s) => ({ items: s.items.filter((x) => x.hash !== hash) })),

  setItemStatus: (hash, status) =>
    set((s) => ({
      items: s.items.map((x) => (x.hash === hash ? { ...x, online: status } : x)),
    })),

  clear: () => set({ items: [] }),

  getGrouped: () => {
    const items = get().items;
    const groups: import("../types/tvbox").TxtPlaylistGroup[] = [];
    let current: import("../types/tvbox").TxtPlaylistGroup | null = null;
    for (const item of items) {
      if (item.isGroup) {
        current = { group: item.name, items: [] };
        groups.push(current);
      } else if (current) {
        current.items.push(item);
      } else {
        if (!groups[0]) groups.push({ group: "默认", items: [] });
        groups[0].items.push(item);
      }
    }
    return groups;
  },

  getText: () =>
    get()
      .items.map((x) => x.raw)
      .join("\n"),
}));

// ============================================================
// 应用设置（持久化）
// ============================================================
interface SettingsState {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: "tvbox-studio-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ============================================================
// 历史记录（持久化）
// ============================================================
interface HistoryState {
  items: HistoryItem[];
  add: (item: Omit<HistoryItem, "id" | "timestamp">) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        const id = genId();
        const existing = get().items.filter((x) => x.url !== item.url);
        const newItem: HistoryItem = { ...item, id, timestamp: Date.now() };
        set({ items: [newItem, ...existing].slice(0, 50) });
      },
      remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "tvbox-studio-history",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ============================================================
// 内嵌 HTTP Server 状态
// ============================================================
interface ServerState {
  status: ServerStatus;
  setStatus: (s: Partial<ServerStatus>) => void;
}

export const useServerStore = create<ServerState>((set) => ({
  status: { running: false, port: 8090, lanIps: [] },
  setStatus: (s) => set((cur) => ({ status: { ...cur.status, ...s } })),
}));

// ============================================================
// R2 发布状态
// ============================================================
interface PublishState {
  config: R2Config | null;
  publishing: boolean;
  lastPublish: { url: string; time: number } | null;
  setConfig: (c: R2Config) => void;
  setPublishing: (v: boolean) => void;
  setLastPublish: (url: string) => void;
}

export const usePublishStore = create<PublishState>()(
  persist(
    (set) => ({
      config: null,
      publishing: false,
      lastPublish: null,
      setConfig: (c) => set({ config: c }),
      setPublishing: (v) => set({ publishing: v }),
      setLastPublish: (url) => set({ lastPublish: { url, time: Date.now() } }),
    }),
    {
      name: "tvbox-studio-publish",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
