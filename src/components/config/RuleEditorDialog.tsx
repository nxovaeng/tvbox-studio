import React, { Suspense, lazy } from "react";
import { Dialog } from "../ui/Dialog";
import type { TvBoxVod } from "../../types/tvbox";

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
  const api = site.api ?? "";

  const getTitle = () => {
    if (api.includes("csp_XYQHiker")) return `XYQHiker 编辑器 - ${site.name}`;
    if (api.includes("csp_XBPQ"))    return `XBPQ 编辑器 - ${site.name}`;
    if (api.includes("csp_XPath"))   return `XPath 编辑器 - ${site.name}`;
    return `代码编辑器 - ${site.name}`;
  };

  return (
    <Dialog open onClose={onClose} title={getTitle()} size="full">
      <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">加载编辑器...</div>}>
        {api.includes("csp_XYQHiker") && <XYQHikerEditor site={site} onClose={onClose} />}
        {api.includes("csp_XBPQ")    && <XBPQEditor site={site} onClose={onClose} />}
        {api.includes("csp_XPath")   && <XPathEditor site={site} onClose={onClose} />}
        {!api.includes("csp_XYQHiker") && !api.includes("csp_XBPQ") && !api.includes("csp_XPath") && (
          <CodeEditor site={site} onClose={onClose} />
        )}
      </Suspense>
    </Dialog>
  );
}
