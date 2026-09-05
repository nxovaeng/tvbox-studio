import { useState, useEffect } from "react";
import type { ConfigCard } from "../../../store";
import type { TvBoxSource } from "../../../types/tvbox";
import { Dialog } from "../../ui/Dialog";
import { Button } from "../../ui/Button";
import { Badge } from "../../ui/Badge";
import { getContent, readFile } from "../../../lib/tauri";
import { parseJsonc } from "../../../lib/utils";
import {
  Film, Radio, Puzzle, RefreshCw, ExternalLink, AlertCircle,
  FileCode, Layers, ShieldCheck,
} from "lucide-react";

interface Props {
  open: boolean;
  card: ConfigCard | null;
  onClose: () => void;
  onOpenInEditor: (target: string) => void;
}

import { useSettingsStore } from "../../../store";

export function ConfigPreviewModal({ open, card, onClose, onOpenInEditor }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceData, setSourceData] = useState<TvBoxSource | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "sites" | "lives" | "raw">("summary");
  
  const { settings } = useSettingsStore();
  const rootSaveDir = (settings.saveDir || "./box").replace(/\/+$/, "");

  const targetPath = card ? `${rootSaveDir}/${card.projectName}/${card.defaultConfig}` : "";

  useEffect(() => {
    if (!open || !targetPath) {
      setSourceData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    const loadContent = async () => {
      setLoading(true);
      setError(null);
      try {
        let text = "";
        if (targetPath.startsWith("file://")) {
          const localPath = decodeURIComponent(targetPath.slice(7));
          text = await readFile(localPath);
        } else if (targetPath.startsWith("http://") || targetPath.startsWith("https://")) {
          text = await getContent(targetPath);
        } else {
          text = await readFile(targetPath);
        }

        const data = parseJsonc(text) as TvBoxSource;
        if (isMounted) {
          setSourceData(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(String(err));
          setLoading(false);
        }
      }
    };

    loadContent();
    return () => {
      isMounted = false;
    };
  }, [open, targetPath]);

  if (!card) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`快速预览: ${card.projectName}`}
      description={targetPath}
      size="lg"
    >
      <div className="space-y-4">
        {/* 加载状态 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <RefreshCw className="h-7 w-7 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">正在解析配置内容...</p>
          </div>
        )}

        {/* 错误提示 */}
        {error && !loading && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold">读取配置失败</div>
              <div className="text-xs mt-1 font-mono opacity-90 break-all">{error}</div>
            </div>
          </div>
        )}

        {/* 内容展示区 */}
        {sourceData && !loading && (
          <div className="space-y-3">
            {/* 顶部分类导航 */}
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab("summary")}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    activeTab === "summary" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  概览统计
                </button>
                <button
                  onClick={() => setActiveTab("sites")}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1 ${
                    activeTab === "sites" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Film className="h-3 w-3" /> 点播源 ({sourceData.sites?.length ?? 0})
                </button>
                <button
                  onClick={() => setActiveTab("lives")}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1 ${
                    activeTab === "lives" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Radio className="h-3 w-3" /> 直播源 ({sourceData.lives?.length ?? 0})
                </button>
                <button
                  onClick={() => setActiveTab("raw")}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1 ${
                    activeTab === "raw" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <FileCode className="h-3 w-3" /> 原始 JSON
                </button>
              </div>

              <Badge variant="outline" className="text-xs">
                共 {(sourceData.sites?.length ?? 0) + (sourceData.lives?.length ?? 0)} 条规则
              </Badge>
            </div>

            {/* Tab 1: 概览统计 */}
            {activeTab === "summary" && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-muted/40 border border-border text-center">
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Film className="h-3.5 w-3.5 text-primary" /> 点播爬虫
                    </div>
                    <div className="text-xl font-bold mt-1">{sourceData.sites?.length ?? 0}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border text-center">
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Radio className="h-3.5 w-3.5 text-green-500" /> 直播分组
                    </div>
                    <div className="text-xl font-bold mt-1">{sourceData.lives?.length ?? 0}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border text-center">
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Puzzle className="h-3.5 w-3.5 text-yellow-500" /> 解析接口
                    </div>
                    <div className="text-xl font-bold mt-1">{sourceData.parses?.length ?? 0}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border text-center">
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-500" /> 过滤/规则
                    </div>
                    <div className="text-xl font-bold mt-1">
                      {(sourceData.ads?.length ?? 0) + (sourceData.rules?.length ?? 0)}
                    </div>
                  </div>
                </div>

                {sourceData.spider && (
                  <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">全局 Spider 引擎</div>
                    <div className="text-xs font-mono break-all text-foreground">{sourceData.spider}</div>
                  </div>
                )}

                {sourceData.wallpaper && (
                  <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">首页壁纸 URL</div>
                    <div className="text-xs font-mono break-all text-muted-foreground truncate">{sourceData.wallpaper}</div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: 点播源前列展示 */}
            {activeTab === "sites" && (
              <div className="max-h-64 overflow-y-auto border border-border rounded-lg">
                <div className="divide-y divide-border text-xs">
                  {sourceData.sites?.slice(0, 30).map((site, index) => (
                    <div key={site.key || index} className="p-2 flex items-center justify-between gap-2 hover:bg-muted/30">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate text-foreground">{site.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate">{site.api}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px] flex-shrink-0">
                        Type {site.type}
                      </Badge>
                    </div>
                  ))}
                  {(sourceData.sites?.length ?? 0) > 30 && (
                    <div className="p-2 text-center text-muted-foreground text-xs bg-muted/20">
                      以及更多 {(sourceData.sites?.length ?? 0) - 30} 个点播爬虫...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: 直播源列表 */}
            {activeTab === "lives" && (
              <div className="max-h-64 overflow-y-auto border border-border rounded-lg">
                <div className="divide-y divide-border text-xs">
                  {sourceData.lives?.map((live, index) => (
                    <div key={index} className="p-2 flex items-center justify-between gap-2 hover:bg-muted/30">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground">{live.name || live.group || `直播分组 ${index + 1}`}</div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate">{live.url || `${live.channels?.length ?? 0} 个频道`}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {live.channels ? `${live.channels.length} 频道` : "链接源"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 4: 原始 JSON 片段 */}
            {activeTab === "raw" && (
              <div className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/30 p-2.5 font-mono text-[11px]">
                <pre>{JSON.stringify(sourceData, null, 2).slice(0, 2000)}</pre>
                {JSON.stringify(sourceData, null, 2).length > 2000 && (
                  <div className="text-muted-foreground text-center py-1 mt-2 border-t border-border/50">
                    (仅展示前 2000 字符预览)
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 底部按钮 */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              onOpenInEditor(targetPath);
            }}
            icon={<ExternalLink className="h-3.5 w-3.5" />}
          >
            加载并进入工作区编辑
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

