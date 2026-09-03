import React, { useState, useCallback } from "react";
import { FieldRow } from "./FieldEditor";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { useTvBoxStore, useUIStore } from "../../../store";
import type { TvBoxVod } from "../../../types/tvbox";
import { Save, Globe } from "lucide-react";
import { writeFile } from "../../../lib/tauri";
import { parseJsonc, formatJson } from "../../../lib/utils";
import type { FieldDef, VarGroup } from "../../../types/tvbox";

const HTTP_VARS: VarGroup = { vars: ["User-Agent", "手机", "MOBILE_UA", "Referer", "$", "#", "电脑", "PC_UA"] };
const CATEGORY_VARS: VarGroup = { vars: ["{cateId}", "{class}", "{area}", "{year}", "{lang}", "{by}", "{catePg}"] };
const SEARCH_VARS: VarGroup = { vars: [";post", "{wd}", "{SearchPg}"] };
const COMMON_VARS: VarGroup = {
  vars: ["[包含:关键字]","[不包含:关键字]","[过滤:正则]","[替换:文本=>文本]","[截取:前&&后]","[前缀:文本]","[后缀:文本]","[去重]","[倒序]"],
};
const TEXT_VARS: VarGroup = {
  vars: ["[替换:文本=>文本]","[截取:前&&后]","[前缀:文本]","[后缀:文本]","[移除:文本]"],
};

const SECTIONS: { id: string; label: string; fields: FieldDef[] }[] = [
  {
    id: "basic", label: "基础",
    fields: [
      { key: "规则站名", id: "站名", type: "text" },
      { key: "主页URL", id: "主页url", type: "text" },
      { key: "网页编码", id: "编码", type: "text" },
      { key: "全局请求头", id: "请求头", type: "textarea", var_btn: HTTP_VARS },
    ],
  },
  {
    id: "common", label: "通用",
    fields: [
      { key: "是否免嗅", id: "免嗅", type: "text", placeholder: "1或0" },
      { key: "嗅探词", id: "嗅探词", type: "text", placeholder: ".m3u8#.mp4" },
      { key: "过滤词", id: "过滤词", type: "text" },
      { key: "直接播放", id: "直接播放", type: "text" },
    ],
  },
  {
    id: "category", label: "分类",
    fields: [
      { key: "分类URL", id: "分类url", type: "text", var_btn: CATEGORY_VARS },
      { key: "分类名", id: "分类", type: "text" },
      { key: "分类二次截取", id: "分类二次截取", type: "text", test_btn: true, var_btn: COMMON_VARS },
      { key: "分类数组", id: "分类数组", type: "text", test_btn: true, var_btn: COMMON_VARS },
      { key: "分类标题", id: "分类标题", type: "text", test_btn: true, var_btn: TEXT_VARS },
      { key: "分类ID", id: "分类ID", type: "text", test_btn: true, var_btn: TEXT_VARS },
    ],
  },
  {
    id: "list", label: "列表",
    fields: [
      { key: "列表二次截取", id: "二次截取", type: "text", test_btn: true, var_btn: COMMON_VARS },
      { key: "列表数组规则", id: "数组", type: "text", test_btn: true, var_btn: COMMON_VARS },
      { key: "图片规则", id: "图片", type: "text", test_btn: true, var_btn: TEXT_VARS },
      { key: "标题规则", id: "标题", type: "text", test_btn: true, var_btn: TEXT_VARS },
      { key: "副标题规则", id: "副标题", type: "text", test_btn: true, var_btn: TEXT_VARS },
      { key: "链接规则", id: "链接", type: "text", test_btn: true, var_btn: TEXT_VARS },
    ],
  },
  {
    id: "detail", label: "详情",
    fields: [
      { key: "类型", id: "影片类型", type: "text", test_btn: true, var_btn: TEXT_VARS },
      { key: "年代", id: "影片年代", type: "text", test_btn: true, var_btn: TEXT_VARS },
      { key: "导演", id: "导演", type: "text", test_btn: true, var_btn: TEXT_VARS },
      { key: "主演", id: "主演", type: "text", test_btn: true, var_btn: TEXT_VARS },
      { key: "简介", id: "简介", type: "text", test_btn: true, var_btn: TEXT_VARS },
    ],
  },
  {
    id: "play", label: "播放",
    fields: [
      { key: "线路二次截取", id: "线路二次截取", type: "text", test_btn: true, var_btn: COMMON_VARS },
      { key: "线路数组", id: "线路数组", type: "text", test_btn: true, var_btn: COMMON_VARS },
      { key: "线路标题", id: "线路标题", type: "text", test_btn: true, var_btn: TEXT_VARS },
      { key: "播放数组", id: "播放数组", type: "text", test_btn: true, var_btn: COMMON_VARS },
      { key: "播放标题", id: "播放标题", type: "text", test_btn: true, var_btn: TEXT_VARS },
      { key: "播放链接", id: "播放链接", type: "text", test_btn: true, var_btn: TEXT_VARS },
    ],
  },
  {
    id: "search", label: "搜索",
    fields: [
      { key: "搜索URL模板", id: "搜索url", type: "text", var_btn: SEARCH_VARS },
      { key: "搜索数组", id: "搜索数组", type: "text", test_btn: true, var_btn: COMMON_VARS },
      { key: "搜索标题", id: "搜索标题", type: "text", test_btn: true, var_btn: TEXT_VARS },
      { key: "搜索链接", id: "搜索链接", type: "text", test_btn: true, var_btn: TEXT_VARS },
    ],
  },
];

interface Props { site: TvBoxVod; onClose: () => void; }

export function XBPQEditor({ site, onClose }: Props) {
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
      const cleaned: Record<string, string> = {};
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
