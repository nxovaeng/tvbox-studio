import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { useHistoryStore } from "../../store";
import { Clock, Trash2, ExternalLink } from "lucide-react";
import { formatTime } from "../../lib/utils";

interface Props { open: boolean; onClose: () => void; onSelect: (url: string) => void; }

export function HistoryDialog({ open, onClose, onSelect }: Props) {
  const { items, remove, clear } = useHistoryStore();

  return (
    <Dialog open={open} onClose={onClose} title="历史记录" size="md">
      <div className="flex flex-col" style={{ maxHeight: "60vh" }}>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Clock className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">暂无历史记录</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
              <span className="text-xs text-muted-foreground">{items.length} 条记录</span>
              <Button variant="ghost" size="sm" onClick={clear}
                icon={<Trash2 className="h-3.5 w-3.5" />}>清空</Button>
            </div>
            <div className="overflow-auto divide-y divide-border">
              {items.map((item) => (
                <div key={item.id}
                  className="group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 cursor-pointer"
                  onClick={() => onSelect(item.url)}>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{item.url}</div>
                    <div className="text-xs text-muted-foreground">{formatTime(item.timestamp)}</div>
                  </div>
                  <Button variant="ghost" size="icon"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); remove(item.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
