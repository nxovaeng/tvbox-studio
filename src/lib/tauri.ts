/**
 * Tauri 命令封装层
 * 统一处理 invoke / event 调用，便于 Web 模式下 mock
 */
import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { listen as tauriListen } from "@tauri-apps/api/event";
import type { TvBoxSource, TvBoxVod, TvBoxLive, TvBoxParse } from "../types/tvbox";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const invoke = <T>(cmd: string, args?: Record<string, any>): Promise<T> =>
  tauriInvoke<T>(cmd, args);

export const listen = tauriListen;

// ============================================================
// TVBox 配置解析
// ============================================================
export const parseTvBox = (uri: string) =>
  invoke<TvBoxSource>("parse_tvbox", { uri });

export const getContent = (uri: string) =>
  invoke<string>("get_content", { uri });

// ============================================================
// 连通性检测
// ============================================================
export interface ConnectionStatus<T> {
  connectable: boolean;
  extra: T;
}

export const checkVods = (items: TvBoxVod[], quickMode = false, skipIpv6 = false) =>
  invoke<ConnectionStatus<TvBoxVod>[]>("check_vods", { items, quickMode, skipIpv6 });

export const checkLives = (items: TvBoxLive[], quickMode = false, skipIpv6 = false) =>
  invoke<ConnectionStatus<TvBoxLive>[]>("check_lives", { items, quickMode, skipIpv6 });

export const checkParses = (items: TvBoxParse[], quickMode = false, skipIpv6 = false) =>
  invoke<ConnectionStatus<TvBoxParse>[]>("check_parses", { items, quickMode, skipIpv6 });

export const checkUrlList = (urls: string[], quickMode = false, skipIpv6 = false, checkM3u8 = false) =>
  invoke<string[]>("check_url_list", { urls, quickMode, skipIpv6, checkM3u8 });

// ============================================================
// 文件操作
// ============================================================
export const readFile = (path: string) => invoke<string>("read_file", { path });
export const writeFile = (path: string, content: string) =>
  invoke<boolean>("write_file", { path, content });
export const writeFileBytes = (path: string, data: number[]) =>
  invoke<boolean>("write_file_bytes", { path, data });
export const deleteFile = (path: string) => invoke<boolean>("delete_file", { path });
export const createDir = (path: string) => invoke<boolean>("create_dir", { path });

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number;
  modified?: number;
}
export const listDir = (path: string) => invoke<FileEntry[]>("list_dir", { path });
export const downloadFile = (url: string, savePath: string) =>
  invoke<boolean>("download_file", { url, savePath });

// ============================================================
// HTTP Server 控制
// ============================================================
export const serverCache = (key: string, value: string) =>
  invoke<void>("server_cache", { key, value });
export const serverGetCache = (key: string) =>
  invoke<string>("server_get_cache", { key });
export const getLanIps = () => invoke<string[]>("get_lan_ips");
export const isAppInstalled = (app: string) =>
  invoke<boolean>("is_app_installed", { app });

// ============================================================
// R2 上传
// ============================================================
export interface R2ConfigDto {
  account_id: string;
  access_key_id: string;
  secret_access_key: string;
  bucket_name: string;
  public_domain?: string;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  key: string;
  message?: string;
}

export const r2Test = (config: R2ConfigDto) =>
  invoke<boolean>("r2_test", { config });
export const r2UploadText = (config: R2ConfigDto, key: string, content: string, contentType: string) =>
  invoke<UploadResult>("r2_upload_text", { config, key, content, contentType });
export const r2UploadFile = (config: R2ConfigDto, key: string, filePath: string) =>
  invoke<UploadResult>("r2_upload_file", { config, key, filePath });
export const r2List = (config: R2ConfigDto, prefix?: string) =>
  invoke<string[]>("r2_list", { config, prefix });
export const r2Delete = (config: R2ConfigDto, key: string) =>
  invoke<boolean>("r2_delete", { config, key });

// ============================================================
// 工具
// ============================================================
export const hashContent = (content: string) =>
  invoke<string>("hash_content", { content });

export interface PushResult { success: boolean; message: string; }
export const pushToTvbox = (tvboxUrl: string, configUrl: string) =>
  invoke<PushResult>("push_to_tvbox", { tvboxUrl, configUrl });
