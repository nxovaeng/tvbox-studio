import React, { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { CodeEditorPanel } from "./CodeEditorPanel";
import { FolderOpen, FileText } from "lucide-react";
import { useUIStore } from "../../store";

export function EditorPage() {
  const { addToast } = useUIStore();
  const [filePath, setFilePath] = useState("");
  const [openPath, setOpenPath] = useState("");

  const handleOpenFile = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const path = await open({
        filters: [{ name: "代码文件", extensions: ["json", "js", "py", "txt", "m3u", "m3u8"] }],
      });
      if (path && typeof path === "string") {
        setOpenPath(path);
        setFilePath(path);
      }
    } catch (e) {
      addToast({ type: "error", message: `打开失败: ${e}` });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 文件路径栏 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card flex-shrink-0">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <Input
          value={filePath}
          onChange={(e) => setFilePath(e.target.value)}
          placeholder="文件路径..."
          className="flex-1"
        />
        <Button variant="outline" onClick={handleOpenFile}
          icon={<FolderOpen className="h-3.5 w-3.5" />}>
          打开
        </Button>
        {filePath && filePath !== openPath && (
          <Button variant="primary" onClick={() => setOpenPath(filePath)}>加载</Button>
        )}
      </div>

      {openPath ? (
        <div className="flex-1 overflow-hidden">
          <CodeEditorPanel filePath={openPath} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-muted-foreground">
          <FileText className="h-12 w-12 opacity-30" />
          <p className="font-medium text-foreground">代码编辑器</p>
          <p className="text-sm">打开一个本地文件开始编辑<br />支持 JSON、JavaScript、Python、M3U 等格式</p>
          <Button variant="outline" onClick={handleOpenFile}
            icon={<FolderOpen className="h-3.5 w-3.5" />}>
            选择文件
          </Button>
        </div>
      )}
    </div>
  );
}
