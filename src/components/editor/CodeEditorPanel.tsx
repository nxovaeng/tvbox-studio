import React, { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "../ui/Button";
import { useTvBoxStore, useUIStore, useSettingsStore } from "../../store";
import type { TvBoxVod } from "../../types/tvbox";
import { Save, Code2, Wand2 } from "lucide-react";
import { readFile, writeFile } from "../../lib/tauri";
import { formatJson, parseJsonc } from "../../lib/utils";

interface Props {
  site?: TvBoxVod;
  filePath?: string;
  initialContent?: string;
  onSaveContent?: (content: string) => void;
  onClose?: () => void;
}

export function CodeEditorPanel({ site, filePath, initialContent, onSaveContent, onClose }: Props) {
  const { settings } = useSettingsStore();
  const { addToast } = useUIStore();
  const [content, setContent] = useState(initialContent ?? "");
  const [language, setLanguage] = useState("json");
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<unknown>(null);

  useEffect(() => {
    if (filePath) {
      readFile(filePath).then((text) => {
        setContent(text);
        const ext = filePath.split(".").pop()?.toLowerCase();
        setLanguage(ext === "js" ? "javascript" : ext === "py" ? "python" : "json");
      }).catch((e) => addToast({ type: "error", message: `读取失败: ${e}` }));
    } else if (initialContent) {
      setContent(initialContent);
    }
  }, [filePath, initialContent]);

  const handleFormat = () => {
    try {
      const parsed = parseJsonc(content);
      setContent(formatJson(parsed));
    } catch {
      addToast({ type: "error", message: "格式化失败：不是有效的 JSON" });
    }
  };

  const handleSave = async () => {
    if (!filePath && !onSaveContent) return;
    setSaving(true);
    try {
      if (filePath) {
        await writeFile(filePath, content);
      } else if (onSaveContent) {
        onSaveContent(content);
      }
      addToast({ type: "success", message: "保存成功" });
    } catch (e) {
      addToast({ type: "error", message: `保存失败: ${e}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0">
        <Code2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium truncate">
          {site?.name ?? filePath?.split("/").pop() ?? "代码编辑器"}
        </span>
        <select
          className="ml-2 h-7 text-xs border border-input rounded px-2 bg-background"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="json">JSON</option>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="plaintext">纯文本</option>
        </select>
        <div className="ml-auto flex gap-1">
          <Button variant="outline" size="sm" icon={<Wand2 className="h-3.5 w-3.5" />} onClick={handleFormat}>
            格式化
          </Button>
          { (filePath || onSaveContent) && (
            <Button variant="primary" size="sm" loading={saving}
              icon={<Save className="h-3.5 w-3.5" />} onClick={handleSave}>
              保存
            </Button>
          )}
        </div>
      </div>

      {/* Monaco 编辑器 */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language}
          value={content}
          onChange={(v) => setContent(v ?? "")}
          theme={settings.editorTheme}
          options={{
            fontSize: settings.editorFontSize,
            minimap: { enabled: false },
            wordWrap: "on",
            tabSize: 2,
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorSmoothCaretAnimation: "on",
            bracketPairColorization: { enabled: true },
            formatOnPaste: true,
            suggest: { showWords: false },
          }}
          onMount={(editor) => { editorRef.current = editor; }}
        />
      </div>
    </div>
  );
}
