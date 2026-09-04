import { useSettingsStore } from "../../../store";
import React, { useState } from "react";
import type { ConfigCard } from "../../../store";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import {
  Globe, HardDrive, Star, Copy, ExternalLink, Film, Radio,
  Puzzle, Eye, Pencil, Trash2, Clock, Check, MoreVertical, Layers,
} from "lucide-react";
import { cn } from "../../../lib/utils";

interface Props {
  card: ConfigCard;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (target: string, tab?: "sites" | "lives" | "parses" | "basic", cardId?: string) => void;
  onPreview: (card: ConfigCard) => void;
  onEdit: (card: ConfigCard) => void;
  onDuplicate: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ConfigCardItem({

  card,
  selected,
  onToggleSelect,
  onOpen,
  onPreview,
  onEdit,
  onDuplicate,
  onToggleFavorite,
  onDelete,
}: Props) {
  const { settings } = useSettingsStore();
  const rootSaveDir = (settings.saveDir || "./box").replace(/\/+$/, "");
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isLocal = true;
  const targetPath = `${rootSaveDir}/${card.projectName}/${card.defaultConfig}`;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(targetPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const spiderName = card.spider
    ? card.spider.split(";")[0].split(/[\\/]/).pop() || "自定义 Spider"
    : undefined;

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-200",
        "hover:shadow-md hover:border-primary/40",
        selected && "border-primary ring-1 ring-primary bg-primary/[0.02]"
      )}
    >
      {/* 顶部指示条与操作栏 */}
      <div className="flex items-center justify-between p-3 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2 min-w-0">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(card.id)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            aria-label="选择卡片"
          />
          <Badge
            variant={isLocal ? "warning" : "default"}
            className="text-[11px] font-normal px-2 py-0.5 gap-1 flex-shrink-0"
          >
            {isLocal ? <HardDrive className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
            {isLocal ? "本地配置" : "网络订阅"}
          </Badge>
          {card.tags && card.tags.length > 0 && (
            <div className="flex items-center gap-1 overflow-hidden">
              {card.tags.slice(0, 2).map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground truncate max-w-[60px]"
                >
                  {t}
                </span>
              ))}
              {card.tags.length > 2 && (
                <span className="text-[10px] text-muted-foreground">+{card.tags.length - 2}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleFavorite(card.id)}
            className={cn(
              "p-1 rounded-md transition-colors",
              card.favorite
                ? "text-yellow-500 hover:bg-yellow-500/10"
                : "text-muted-foreground/50 hover:text-yellow-500 hover:bg-muted"
            )}
            title={card.favorite ? "取消收藏" : "设为常用收藏"}
          >
            <Star className={cn("h-4 w-4", card.favorite && "fill-yellow-500")} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="更多操作"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-36 rounded-lg border border-border bg-popover p-1 shadow-lg z-30 text-xs">
                  <button
                    onClick={() => { setShowMenu(false); onPreview(card); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-left"
                  >
                    <Eye className="h-3.5 w-3.5" /> 快速预览
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onDuplicate(card.id); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-left"
                  >
                    <Layers className="h-3.5 w-3.5" /> 克隆副本
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onEdit(card); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-left"
                  >
                    <Pencil className="h-3.5 w-3.5" /> 编辑信息
                  </button>
                  <div className="my-1 border-t border-border" />
                  <button
                    onClick={() => { setShowMenu(false); onDelete(card.id); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-destructive/10 text-destructive text-left"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> 删除配置
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 主体信息 */}
      <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3
              onClick={() => onOpen(`file://${targetPath}`, "basic", card.id)}
              className="font-semibold text-sm hover:text-primary cursor-pointer transition-colors line-clamp-1 flex-1"
              title={card.projectName}
            >
              {card.projectName}
            </h3>
          </div>

          {/* 路径与复制 */}
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground group/path">
            <span className="font-mono truncate flex-1" title={targetPath}>
              {targetPath || "(空路径)"}
            </span>
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground opacity-0 group-hover/path:opacity-100 transition-opacity"
              title="复制配置路径/链接"
            >
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>

          {/* 备注描述 */}
          {card.description && (
            <p className="mt-1.5 text-xs text-muted-foreground/80 line-clamp-1" title={card.description}>
              {card.description}
            </p>
          )}
        </div>

        {/* 统计指标网格 */}
        <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-muted/40 border border-border/40 text-center">
          <div
            onClick={() => onOpen(`file://${targetPath}`, "sites", card.id)}
            className="cursor-pointer hover:bg-background/80 rounded p-1 transition-colors"
            title="查看点播爬虫"
          >
            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <Film className="h-3 w-3 text-primary" /> 点播源
            </div>
            <div className="text-sm font-semibold text-foreground mt-0.5">{card.sites ?? 0}</div>
          </div>

          <div
            onClick={() => onOpen(`file://${targetPath}`, "lives", card.id)}
            className="cursor-pointer hover:bg-background/80 rounded p-1 transition-colors"
            title="查看直播频道"
          >
            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <Radio className="h-3 w-3 text-green-500" /> 直播源
            </div>
            <div className="text-sm font-semibold text-foreground mt-0.5">{card.lives ?? 0}</div>
          </div>

          <div
            onClick={() => onOpen(`file://${targetPath}`, "parses", card.id)}
            className="cursor-pointer hover:bg-background/80 rounded p-1 transition-colors"
            title="查看解析接口"
          >
            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <Puzzle className="h-3 w-3 text-yellow-500" /> 解析
            </div>
            <div className="text-sm font-semibold text-foreground mt-0.5">{card.parses ?? 0}</div>
          </div>
        </div>

        {/* Spider 提示 */}
        {spiderName && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1 truncate">
            <span className="font-medium text-foreground/70">引擎:</span>
            <span className="truncate font-mono">{spiderName}</span>
          </div>
        )}
      </div>

      {/* 底部操作与快捷入口 */}
      <div className="p-2.5 pt-0 border-t border-border/40 mt-auto flex items-center justify-between gap-2 pt-2 bg-muted/10">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{new Date(card.updatedAt).toLocaleDateString()}</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onPreview(card)}
            icon={<Eye className="h-3 w-3" />}
          >
            预览
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="h-7 px-2.5 text-xs font-medium"
            onClick={() => onOpen(`file://${targetPath}`, "basic", card.id)}
            icon={<ExternalLink className="h-3 w-3" />}
          >
            进入工作区
          </Button>
        </div>
      </div>
    </div>
  );
}

