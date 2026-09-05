import React, { Suspense, lazy } from "react";
import { Dialog } from "../ui/Dialog";
import type { TvBoxVod } from "../../types/tvbox";
import { useTvBoxStore, useUIStore } from "../../store";

// 动态导入图形化编辑器（按需加载）
const XYQHikerEditor = lazy(() => import("../editor/rule/XYQHikerEditor").then((m) => ({ default: m.XYQHikerEditor })));
const XBPQEditor     = lazy(() => import("../editor/rule/XBPQEditor").then((m) => ({ default: m.XBPQEditor })));
const XPathEditor    = lazy(() => import("../editor/rule/XPathEditor").then((m) => ({ default: m.XPathEditor })));
const CodeEditor     = lazy(() => import("../editor/CodeEditorPanel").then((m) => ({ default: m.CodeEditorPanel })));

interface Props {
  site: TvBoxVod;
  onClose: () => void;
}

export function RuleEditorDialog({ site, onClose }: Props) {
  const { sourcePath, source, updateSite } = useTvBoxStore();
  const { addToast } = useUIStore();
  const api = site.api ?? "";

  const getTitle = () => {
    if (api.includes("csp_XYQHiker")) return `XYQHiker 编辑器 - ${site.name}`;
    if (api.includes("csp_XBPQ"))    return `XBPQ 编辑器 - ${site.name}`;
    if (api.includes("csp_XPath"))   return `XPath 编辑器 - ${site.name}`;
    return `代码编辑器 - ${site.name}`;
  };

  let filePath: string | undefined = undefined;
  let initialContent = "";
  let editingExtObj = false;

  if (site.ext && typeof site.ext === "string" && !site.ext.startsWith("http")) {
    const baseDir = sourcePath.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
    filePath = `${baseDir}/${site.ext.replace(/^\.\//, "")}`;
  } else if (site.ext && typeof site.ext === "object") {
    editingExtObj = true;
    initialContent = JSON.stringify(site.ext, null, 2);
  } else {
    // 若没有可编辑的本地文件或对象 ext，则直接编辑整个 site 的 JSON
    initialContent = JSON.stringify(site, null, 2);
  }

  const handleSaveContent = (content: string) => {
    const idx = source?.sites.findIndex(s => s.key === site.key) ?? -1;
    if (idx === -1) return;
    try {
      const parsed = JSON.parse(content);
      if (editingExtObj) {
        updateSite(idx, { ...site, ext: parsed });
      } else {
        updateSite(idx, parsed);
      }
    } catch {
      addToast({ type: "error", message: "非有效JSON，无法保存到配置" });
    }
  };

  return (
    <Dialog open onClose={onClose} title={getTitle()} size="full">
      <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">加载编辑器...</div>}>
        {api.includes("csp_XYQHiker") && <XYQHikerEditor site={site} onClose={onClose} />}
        {api.includes("csp_XBPQ")    && <XBPQEditor site={site} onClose={onClose} />}
        {api.includes("csp_XPath")   && <XPathEditor site={site} onClose={onClose} />}
        {!api.includes("csp_XYQHiker") && !api.includes("csp_XBPQ") && !api.includes("csp_XPath") && (
          <CodeEditor 
            site={site} 
            filePath={filePath} 
            initialContent={initialContent} 
            onSaveContent={handleSaveContent} 
            onClose={onClose} 
          />
        )}
      </Suspense>
    </Dialog>
  );
}
