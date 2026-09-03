import React, { useState } from "react";
import { usePlaylistStore, useUIStore } from "../../store";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { StatusDot } from "../ui/Badge";
import { Search, Upload, Trash2, Wifi, Download, Copy, Radio } from "lucide-react";
import { checkUrlList } from "../../lib/tauri";
import { listen } from "@tauri-apps/api/event";
import { serverCache } from "../../lib/tauri";
import { cn } from "../../lib/utils";

export function PlaylistPage() {
  const { items, loadFromText, mergeFromText, clear, setItemStatus, getText } = usePlaylistStore();
  const { addToast } = useUIStore();
  const [search, setSearch] = useState("");
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [urlInput, setUrlInput] = useState("");

  const handleLoadFile = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const path = await open({ filters: [{ name: "播放列表", extensions: ["txt", "m3u", "m3u8"] }] });
      if (!path || typeof path !== "string") return;
      const { readFile } = await import("../../lib/tauri");
      const text = await readFile(path);
      loadFromText(text);
      addToast({ type: "success", message: `已加载 ${items.length} 条` });
    } catch (e) {
      addToast({ type: "error", message: `加载失败: ${e}` });
    }
  };

  const handleLoadUrl = async () => {
    if (!urlInput.trim()) return;
    try {
      const { getContent } = await import("../../lib/tauri");
      const text = await getContent(urlInput.trim());
      loadFromText(text);
      addToast({ type: "success", message: "加载成功" });
    } catch (e) {
      addToast({ type: "error", message: `加载失败: ${e}` });
    }
  };

  const handleCheckAll = async () => {
    if (checking) return;
    const urls = items.filter((x) => !x.isGroup && x.http).map((x) => x.url);
    if (!urls.length) return;
    setChecking(true);
    setProgress({ done: 0, total: urls.length });
    items.forEach((x) => { if (!x.isGroup) setItemStatus(x.hash, "checking"); });

    const unlisten = await listen<{ progress: number; total: number }>("check://progress", (ev) => {
      setProgress({ done: ev.payload.progress, total: ev.payload.total });
    });

    try {
      const aliveUrls = await checkUrlList(urls, true, false, true);
      const aliveSet = new Set(aliveUrls);
      items.filter((x) => !x.isGroup).forEach((x) => {
        setItemStatus(x.hash, aliveSet.has(x.url) ? "online" : "offline");
      });
      addToast({ type: "success", message: `检测完成: ${aliveUrls.length}/${urls.length} 可用` });
    } catch (e) {
      addToast({ type: "error", message: `检测失败: ${e}` });
    } finally {
      unlisten();
      setChecking(false);
    }
  };

  const handleShare = async () => {
    const text = getText();
    await serverCache("playlist", text);
    addToast({ type: "success", message: "已推送到本地服务器 :8090/playlist.txt" });
  };

  const filtered = search.trim()
    ? items.filter((x) => x.name.toLowerCase().includes(search.toLowerCase()) ||
        x.url.toLowerCase().includes(search.toLowerCase()))
    : items;

  const stats = items.reduce((acc, x) => {
    if (x.isGroup) acc.groups++;
    else {
      acc.channels++;
      if (x.online === "online") acc.online++;
      if (x.online === "offline") acc.offline++;
    }
    return acc;
  }, { groups: 0, channels: 0, online: 0, offline: 0 });

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex flex-col gap-2 px-3 py-2 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoadUrl()}
            placeholder="M3U/TXT 播放列表 URL..." className="flex-1" />
          <Button variant="primary" onClick={handleLoadUrl}>加载</Button>
          <Button variant="outline" onClick={handleLoadFile}
            icon={<Upload className="h-3.5 w-3.5" />}>打开</Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索频道..." className="pl-8 h-7" />
          </div>

          {/* 统计 */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground ml-1">
            <span>{stats.channels} 频道</span>
            {stats.online > 0 && <span className="text-green-600">{stats.online} 可用</span>}
            {stats.offline > 0 && <span className="text-red-600">{stats.offline} 失效</span>}
          </div>

          <div className="flex gap-1 ml-auto">
            {checking && <span className="text-xs text-muted-foreground">{progress.done}/{progress.total}</span>}
            <Button variant="outline" size="sm" loading={checking}
              onClick={handleCheckAll} icon={<Wifi className="h-3.5 w-3.5" />}>检测</Button>
            <Button variant="outline" size="sm" onClick={handleShare}
              icon={<Download className="h-3.5 w-3.5" />}>共享</Button>
            <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(getText());
              addToast({ type: "success", message: "已复制" });
            }} icon={<Copy className="h-3.5 w-3.5" />} />
            <Button variant="ghost" size="sm" onClick={() => { clear(); addToast({ type: "info", message: "已清空" }); }}
              icon={<Trash2 className="h-3.5 w-3.5" />} />
          </div>
        </div>
      </div>

      {/* 列表 */}
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Radio className="h-12 w-12 opacity-30" />
          <p className="font-medium text-foreground">暂无直播源</p>
          <p className="text-sm">输入 M3U/TXT 播放列表 URL 或打开本地文件</p>
          <Button variant="outline" onClick={handleLoadFile} icon={<Upload className="h-3.5 w-3.5" />}>
            打开文件
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="divide-y divide-border">
            {filtered.map((item) =>
              item.isGroup ? (
                <div key={item.hash}
                  className="px-3 py-1.5 bg-muted/40 text-xs font-semibold text-muted-foreground sticky top-0 z-10">
                  📺 {item.name}
                </div>
              ) : (
                <div key={item.hash}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-muted/30 transition-colors group">
                  <StatusDot status={item.online} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{item.url}</div>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(item.url); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
