import React, { useState } from "react";
import type { ConfigCard } from "../../../store";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import {
  Globe, HardDrive, Star, Copy, ExternalLink, Film, Radio,
  Puzzle, Eye, Pencil, Trash2, Check, MoreVertical, Layers,
} from "lucide-react";
import { cn } from "../../../lib/utils";

interface Props {
  card: ConfigCard;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (target: string, tab?: "sites" | "lives" | "parses" | "basic") => void;
  onPreview: (card: ConfigCard) => void;
  onEdit: (card: ConfigCard) => void;
  onDuplicate: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ConfigListItem({
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
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isLocal = card.url.startsWith("file://") || (!card.url.startsWith("http://") && !card.url.startsWith("https://"));
  const targetPath = card.url || card.path;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(targetPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors border-b border-border/40 text-sm",
        selected && "bg-primary/[0.03]"
      )}
    >
      {/* 勾选框 */}
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(card.id)}
        className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer flex-shrink-0"
        aria-label="选择"
      />

      {/* 收藏星标 */}
      <button
        onClick={() => onToggleFavorite(card.id)}
        className={cn(
          "p-1 rounded-md transition-colors flex-shrink-0",
          card.favorite
            ? "text-yellow-500"
            : "text-muted-foreground/40 hover:text-yellow-500"
        )}
        title={card.favorite ? "取消收藏" : "加入收藏"}
      >
        <Star className={cn("h-4 w-4", card.favorite && "fill-yellow-500")} />
      </button>

      {/* 来源类型徽标 */}
      <Badge
        variant={isLocal ? "warning" : "default"}
        className="text-[10px] px-1.5 py-0.5 gap-1 flex-shrink-0"
      >
        {isLocal ? <HardDrive className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
        {isLocal ? "本地" : "网络"}
      </Badge>

      {/* 名称与路径 */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-2">
          <span
            onClick={() => onOpen(targetPath, "basic")}
            className="font-medium text-foreground hover:text-primary cursor-pointer truncate"
            title={card.name}
          >
            {card.name}
          </span>
          {card.tags?.map((t) => (
            <span
              key={t}
              className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground hidden sm:inline-block truncate max-w-[70px]"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 group/path">
          <span className="font-mono truncate max-w-md" title={targetPath}>
            {targetPath || "(无路径)"}
          </span>
          <button
            onClick={handleCopy}
            className="p-0.5 rounded hover:bg-accent text-muted-foreground opacity-0 group-hover/path:opacity-100 transition-opacity"
            title="复制路径"
          >
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* 统计指标 */}
      <div className="hidden md:flex items-center gap-4 text-xs flex-shrink-0">
        <div
          onClick={() => onOpen(targetPath, "sites")}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
          title="点播爬虫源"
        >
          <Film className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium">{card.sites ?? 0}</span>
        </div>
        <div
          onClick={() => onOpen(targetPath, "lives")}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
          title="直播源"
        >
          <Radio className="h-3.5 w-3.5 text-green-500" />
          <span className="font-medium">{card.lives ?? 0}</span>
        </div>
        <div
          onClick={() => onOpen(targetPath, "parses")}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
          title="解析接口"
        >
          <Puzzle className="h-3.5 w-3.5 text-yellow-500" />
          <span className="font-medium">{card.parses ?? 0}</span>
        </div>
      </div>

      {/* 更新时间 */}
      <div className="hidden lg:block text-xs text-muted-foreground flex-shrink-0 w-24 text-right">
        {new Date(card.updatedAt).toLocaleDateString()}
      </div>

      {/* 操作按钮组 */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onPreview(card)}
          icon={<Eye className="h-3.5 w-3.5" />}
          title="快速预览"
        >
          <span className="hidden sm:inline">预览</span>
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="h-7 px-2.5 text-xs font-medium"
          onClick={() => onOpen(targetPath, "basic")}
          icon={<ExternalLink className="h-3.5 w-3.5" />}
        >
          <span className="hidden sm:inline">打开</span>
        </Button>

        {/* 更多菜单 */}
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
  );
}

