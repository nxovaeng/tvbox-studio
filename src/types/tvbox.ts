// ============================================================
// TVBox 核心数据类型定义
// ============================================================

export interface TvBoxSource {
  sites: TvBoxVod[];
  lives: TvBoxLive[];
  parses?: TvBoxParse[];
  flags?: string[];
  ijk?: TvBoxIjk[];
  rules?: TvBoxRule[];
  ads?: string[];
  wallpaper?: string;
  spider?: string;
  warningText?: string;
}

export interface TvBoxVod {
  key: string;
  name: string;
  type: number;
  api: string;
  searchable?: number;
  quickSearch?: number;
  filterable?: number;
  ext?: string | Record<string, unknown>;
  jar?: string;
  playerType?: number;
  categories?: string[];
  click?: string;
  hide?: number;
  playerUrl?: string;
  // 前端扩展字段
  _status?: "unknown" | "online" | "offline" | "checking";
  _features?: string;
}

export interface TvBoxLive {
  name?: string;
  group?: string;
  channels?: LiveChannel[];
  epg?: string;
  type?: number;
  url?: string;
  // 前端扩展字段
  _status?: "unknown" | "online" | "offline" | "checking";
}

export interface LiveChannel {
  name: string;
  urls: string[];
}

export interface TvBoxParse {
  name: string;
  type: number;
  url: string;
  ext?: Record<string, unknown>;
  // 前端扩展字段
  _status?: "unknown" | "online" | "offline" | "checking";
}

export interface TvBoxIjk {
  group: string;
  options: IjkOption[];
}

export interface IjkOption {
  category: number;
  name: string;
  value: string;
}

export interface TvBoxRule {
  hosts?: string[];
  name?: string;
  regex?: string[];
  host?: string;
  rule?: string[];
}

// ============================================================
// 直播源播放列表类型
// ============================================================

export interface TxtPlaylist {
  name: string;
  url: string;
  online?: "unknown" | "online" | "offline" | "checking";
  http?: boolean;
  isGroup?: boolean;
  raw: string;
  hash: string;
}

export interface TxtPlaylistGroup {
  group: string;
  items: TxtPlaylist[];
}

// ============================================================
// 连通性检测类型
// ============================================================

export interface ConnectionStatus<T = unknown> {
  connectable: boolean;
  extra: T;
}

export interface CheckProgress {
  progress: number;
  total: number;
}

// ============================================================
// 文件管理类型
// ============================================================

export type FileTreeItem = FileItem | DirectoryItem;

export interface FileItem {
  kind: "file";
  name: string;
  path: string;
  size?: number;
  modified?: number;
  extension?: string;
}

export interface DirectoryItem {
  kind: "directory";
  name: string;
  path: string;
  children: FileTreeItem[];
}

// ============================================================
// Cloudflare R2 发布类型
// ============================================================

// 前端统一用 snake_case 字段名（与 Rust 命令保持一致）
export interface R2Config {
  account_id: string;
  access_key_id: string;
  secret_access_key: string;
  bucket_name: string;
  public_domain?: string;
}

export interface PublishResult {
  success: boolean;
  url?: string;
  message?: string;
  files?: string[];
}

// ============================================================
// 应用配置类型
// ============================================================

export interface AppSettings {
  theme: "light" | "dark" | "system";
  language: "zh" | "en";
  proxyUrl?: string;
  r2Config?: R2Config;
  editorTheme: string;
  editorFontSize: number;
  checkTimeout: number;
  checkConcurrency: number;
  saveDir: string;
  githubProxy: string;
  serverPort: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  language: "zh",
  editorTheme: "vs-dark",
  editorFontSize: 14,
  checkTimeout: 10,
  checkConcurrency: 20,
  saveDir: "",
  githubProxy: "https://mirror.ghproxy.com/",
  serverPort: 8090,
};

// ============================================================
// 历史记录类型
// ============================================================

export interface HistoryItem {
  id: string;
  url: string;
  title?: string;
  timestamp: number;
  type: "tvbox" | "playlist";
}

// ============================================================
// 编辑器字段 Schema 类型（图形化规则编辑器）
// ============================================================

export interface VarGroup {
  vars: string[];
  tips?: string[];
}

export interface FieldDef {
  key: string;
  id: string;
  type: "text" | "textarea" | "select";
  placeholder?: string;
  options?: string[];
  rows?: number;
  var_btn?: VarGroup;
  test_btn?: boolean;
  dependsOn?: string;
  isAdvanced?: boolean;
}

export interface FieldSection {
  title: string;
  fields: FieldDef[];
}

// ============================================================
// 本地内嵌 HTTP Server 状态
// ============================================================

export interface ServerStatus {
  running: boolean;
  port: number;
  lanIps: string[];
  tvboxUrl?: string;
  playlistUrl?: string;
}
