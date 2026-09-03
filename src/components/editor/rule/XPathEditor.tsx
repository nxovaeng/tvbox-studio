import React, { useState, useCallback } from "react";
import { FieldRow } from "./FieldEditor";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { useTvBoxStore, useUIStore } from "../../../store";
import type { TvBoxVod } from "../../../types/tvbox";
import { Save, Globe } from "lucide-react";
import { writeFile } from "../../../lib/tauri";
import { parseJsonc, formatJson } from "../../../lib/utils";
import type { FieldDef } from "../../../types/tvbox";

const SECTIONS: { id: string; label: string; fields: FieldDef[] }[] = [
  {
    id: "basic", label: "基础",
    fields: [
      { key: "作者", id: "author", type: "text" },
      { key: "UA", id: "ua", type: "text" },
      { key: "主页URL", id: "homeUrl", type: "text" },
      { key: "嗅探播放", id: "dcPlayUrl", type: "text", placeholder: "true 或 false" },
    ],
  },
  {
    id: "home", label: "首页",
    fields: [
      { key: "列表节点", id: "homeVodNode", type: "text", test_btn: true },
      { key: "名称", id: "homeVodName", type: "text", test_btn: true },
      { key: "ID", id: "homeVodId", type: "text", test_btn: true },
      { key: "图片", id: "homeVodImg", type: "text", test_btn: true },
      { key: "角标", id: "homeVodMark", type: "text", test_btn: true },
    ],
  },
  {
    id: "category", label: "分类",
    fields: [
      { key: "分类URL", id: "cateUrl", type: "text", var_btn: { vars: ["{cateId}", "{area}", "{year}", "{catePg}"] } },
      { key: "列表节点", id: "cateVodNode", type: "text", test_btn: true },
      { key: "名称", id: "cateVodName", type: "text", test_btn: true },
      { key: "ID", id: "cateVodId", type: "text", test_btn: true },
      { key: "图片", id: "cateVodImg", type: "text", test_btn: true },
    ],
  },
  {
    id: "detail", label: "详情",
    fields: [
      { key: "详情URL", id: "dtUrl", type: "text" },
      { key: "主节点", id: "dtNode", type: "text", test_btn: true },
      { key: "名称", id: "dtName", type: "text", test_btn: true },
      { key: "图片", id: "dtImg", type: "text", test_btn: true },
      { key: "分类", id: "dtCate", type: "text", test_btn: true },
      { key: "年份", id: "dtYear", type: "text", test_btn: true },
      { key: "导演", id: "dtDirector", type: "text", test_btn: true },
      { key: "主演", id: "dtActor", type: "text", test_btn: true },
      { key: "简介", id: "dtDesc", type: "text", test_btn: true },
      { key: "线路节点", id: "dtFromNode", type: "text", test_btn: true },
      { key: "播放列表节点", id: "dtUrlNode", type: "text", test_btn: true },
      { key: "播放ID", id: "dtUrlId", type: "text", test_btn: true },
      { key: "播放名称", id: "dtUrlName", type: "text", test_btn: true },
    ],
  },
  {
    id: "search", label: "搜索",
    fields: [
      { key: "搜索URL", id: "searchUrl", type: "text", var_btn: { vars: ["{wd}"] } },
      { key: "列表节点", id: "scVodNode", type: "text", test_btn: true },
      { key: "名称", id: "scVodName", type: "text", test_btn: true },
      { key: "ID", id: "scVodId", type: "text", test_btn: true },
      { key: "图片", id: "scVodImg", type: "text", test_btn: true },
    ],
  },
  {
    id: "play", label: "播放",
    fields: [
      { key: "播放URL", id: "playUrl", type: "text" },
      { key: "播放UA", id: "playUa", type: "text" },
    ],
  },
  {
    id: "filter", label: "筛选",
    fields: [
      { key: "筛选数据", id: "filter", type: "textarea", rows: 10, placeholder: '{"电影":{"类型":[...]},...}' },
    ],
  },
];

interface Props { site: TvBoxVod; onClose: () => void; }

export function XPathEditor({ site, onClose }: Props) {
  const { updateSite, source } = useTvBoxStore();
  const { addToast } = useUIStore();
  const [testUrl, setTestUrl] = useState("");
  const [activeSection, setActiveSection] = useState("basic");
  const [saving, setSaving] = useState(false);

  const [ruleData, setRuleData] = useState<Record<string, string>>(() => {
    if (!site.ext) return {};
    try {
      const data = typeof site.ext === "string" ? parseJsonc(site.ext) : site.ext;
      return Object.fromEntries(Object.entries(data as Record<string, unknown>).map(([k, v]) => [k, String(v ?? "")]));
    } catch { return {}; }
  });

  const setField = useCallback((id: string, val: string) => setRuleData((p) => ({ ...p, [id]: val })), []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(ruleData)) { if (v.trim()) cleaned[k] = v; }
      const json = formatJson(cleaned);
      const extPath = typeof site.ext === "string" && !site.ext.startsWith("http") ? site.ext : null;
      if (extPath) await writeFile(extPath, json);
      const idx = source?.sites.findIndex((s) => s.key === site.key) ?? -1;
      if (idx >= 0) updateSite(idx, { ...site, ext: extPath || json });
      addToast({ type: "success", message: "规则已保存" });
    } catch (e) { addToast({ type: "error", message: `保存失败: ${e}` }); }
    finally { setSaving(false); }
  };

  const section = SECTIONS.find((s) => s.id === activeSection);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-20 border-r border-border flex flex-col flex-shrink-0 bg-muted/20">
        <div className="p-1.5 space-y-0.5">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                activeSection === s.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <Input value={testUrl} onChange={(e) => setTestUrl(e.target.value)}
            placeholder="测试页面 URL..." className="flex-1 h-7 text-xs" />
          <Button variant="primary" size="sm" loading={saving}
            onClick={handleSave} icon={<Save className="h-3.5 w-3.5" />}>保存</Button>
        </div>
        <div className="flex-1 overflow-auto px-3 py-2">
          {section?.fields.map((field) => (
            <FieldRow key={field.id} field={field}
              value={ruleData[field.id] ?? ""}
              onChange={(v) => setField(field.id, v)} testUrl={testUrl} />
          ))}
        </div>
      </div>
    </div>
  );
}
