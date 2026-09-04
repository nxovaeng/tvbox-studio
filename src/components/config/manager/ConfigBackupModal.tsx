import { useState } from "react";
import type { ConfigCard } from "../../../store";
import { Dialog } from "../../ui/Dialog";
import { Button } from "../../ui/Button";
import { Download, Upload, Copy, Check, AlertCircle } from "lucide-react";

interface Props {
  open: boolean;
  cards: ConfigCard[];
  onClose: () => void;
  onImport: (cards: ConfigCard[]) => void;
}

export function ConfigBackupModal({ open, cards, onClose, onImport }: Props) {
  const [tab, setTab] = useState<"export" | "import">("export");
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  if (!open) return null;

  const exportJson = JSON.stringify(cards, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportDownload = () => {
    const blob = new Blob([exportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tvbox-configs-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRunImport = () => {
    setImportError(null);
    try {
      const parsed = JSON.parse(importText);
      if (!Array.isArray(parsed)) {
        throw new Error("备份数据格式不正确，应为配置卡片列表数组");
      }
      onImport(parsed as ConfigCard[]);
      onClose();
    } catch (err) {
      setImportError(String(err));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="配置备份与恢复"
      description="导出或导入您的所有 TVBox 配置列表元数据"
      size="md"
    >
      <div className="space-y-4 p-1">
        <div className="flex border-b border-border pb-2 gap-2">
          <button
            type="button"
            onClick={() => setTab("export")}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
              tab === "export" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            导出备份 ({cards.length} 个配置)
          </button>
          <button
            type="button"
            onClick={() => setTab("import")}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
              tab === "import" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            导入恢复配置
          </button>
        </div>

        {tab === "export" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              导出所有配置的名称、链接/路径、标签及分类元数据，方便跨设备同步与迁移。
            </p>
            <textarea
              readOnly
              value={exportJson}
              rows={8}
              className="w-full font-mono text-xs p-2.5 rounded-lg border border-border bg-muted/20"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={handleCopy} icon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}>
                {copied ? "已复制" : "复制 JSON"}
              </Button>
              <Button variant="primary" onClick={handleExportDownload} icon={<Download className="h-3.5 w-3.5" />}>
                下载备份文件
              </Button>
            </div>
          </div>
        )}

        {tab === "import" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              粘贴先前导出的配置卡片 JSON 备份文本（不会删除现有配置，相同路径将智能合并）：
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='[{"id":"...", "name":"...", "path":"...", ...}]'
              rows={8}
              className="w-full font-mono text-xs p-2.5 rounded-lg border border-border bg-background"
            />
            {importError && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
                <AlertCircle className="h-4 w-4" /> {importError}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button
                variant="primary"
                disabled={!importText.trim()}
                onClick={handleRunImport}
                icon={<Upload className="h-3.5 w-3.5" />}
              >
                确认恢复导入
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

