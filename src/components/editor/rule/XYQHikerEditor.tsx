import React, { useState, useCallback } from "react";
import { FieldRow } from "./FieldEditor";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { useTvBoxStore, useUIStore } from "../../../store";
import type { TvBoxVod } from "../../../types/tvbox";
import { Save, Globe, ChevronDown, ChevronUp } from "lucide-react";
import { getContent, writeFile } from "../../../lib/tauri";
import { parseJsonc, formatJson } from "../../../lib/utils";
import type { FieldDef, VarGroup } from "../../../types/tvbox";

// ============================================================
// XYQHiker 字段 Schema（来自原 el.js）
// ============================================================
const HTTP_HEADER_VARS: VarGroup = {
  vars: ["User-Agent", "手机", "MOBILE_UA", "Referer", "$", "#", "电脑", "PC_UA"],
  tips: ["User-Agent$手机#Referer$http://v.qq.com/"],
};
const CATEGORY_URL_VARS: VarGroup = {
  vars: ["{cateId}", "{class}", "{area}", "{year}", "{lang}", "{by}", "{catePg}", "[firstPage=]"],
  tips: ["http://v.qq.com/{cateId}/index{catePg}.html[firstPage=http://v.qq.com/{cateId}/index.html]"],
};
const SEARCH_URL_VARS: VarGroup = {
  vars: [";post", "{wd}", "{SearchPg}"],
  tips: ["POST请求:http://v.qq.com/search.php;post", "GET请求:https://www.00000.me/vodsearch/{wd}/page/{SearchPg}.html"],
};

const SECTIONS: { id: string; label: string; fields: FieldDef[] }[] = [
  {
    id: "basic", label: "基础信息",
    fields: [
      { key: "规则名", id: "规则名", type: "text" },
      { key: "规则作者", id: "规则作者", type: "text" },
      { key: "请求头参数", id: "请求头参数", type: "text", var_btn: HTTP_HEADER_VARS },
      { key: "网页编码格式", id: "网页编码格式", type: "text", var_btn: { vars: ["UTF-8", "GBK", "GB2312"] } },
      { key: "图片是否需要代理", id: "图片是否需要代理", type: "text" },
      { key: "是否开启获取首页数据", id: "是否开启获取首页数据", type: "text" },
      { key: "首页推荐链接", id: "首页推荐链接", type: "text" },
    ],
  },
  {
    id: "home", label: "首页规则",
    fields: [
      { key: "首页列表数组规则", id: "首页列表数组规则", type: "text", test_btn: true },
      { key: "首页片单列表数组规则", id: "首页片单列表数组规则", type: "text", test_btn: true },
    ],
  },
  {
    id: "category", label: "分类规则",
    fields: [
      { key: "分类起始页码", id: "分类起始页码", type: "text" },
      { key: "分类链接", id: "分类链接", type: "text", var_btn: CATEGORY_URL_VARS },
      { key: "分类名称", id: "分类名称", type: "text" },
      { key: "分类列表数组规则", id: "分类列表数组规则", type: "text", test_btn: true },
      { key: "分类片单标题", id: "分类片单标题", type: "text", test_btn: true },
      { key: "分类片单链接", id: "分类片单链接", type: "text", test_btn: true },
      { key: "分类片单图片", id: "分类片单图片", type: "text", test_btn: true },
    ],
  },
  {
    id: "detail", label: "详情规则",
    fields: [
      { key: "演员详情", id: "演员详情", type: "text", test_btn: true },
      { key: "简介详情", id: "简介详情", type: "text", test_btn: true },
      { key: "类型详情", id: "类型详情", type: "text", test_btn: true },
      { key: "年代详情", id: "年代详情", type: "text", test_btn: true },
      { key: "地区详情", id: "地区详情", type: "text", test_btn: true },
    ],
  },
  {
    id: "play", label: "播放规则",
    fields: [
      { key: "线路列表数组规则", id: "线路列表数组规则", type: "text", test_btn: true },
      { key: "线路标题", id: "线路标题", type: "text", test_btn: true },
      { key: "播放列表数组规则", id: "播放列表数组规则", type: "text", test_btn: true },
      { key: "选集列表数组规则", id: "选集列表数组规则", type: "text", test_btn: true },
      { key: "选集标题", id: "选集标题", type: "text", test_btn: true },
      { key: "选集链接", id: "选集链接", type: "text", test_btn: true },
      { key: "直接播放链接加前缀", id: "直接播放链接加前缀", type: "text" },
      { key: "直接播放直链视频请求头", id: "直接播放直链视频请求头", type: "text", var_btn: HTTP_HEADER_VARS },
    ],
  },
  {
    id: "search", label: "搜索规则",
    fields: [
      { key: "搜索请求头参数", id: "搜索请求头参数", type: "text", var_btn: HTTP_HEADER_VARS },
      { key: "搜索链接", id: "搜索链接", type: "text", var_btn: SEARCH_URL_VARS },
      { key: "搜索列表数组规则", id: "搜索列表数组规则", type: "text", test_btn: true },
      { key: "搜索片单标题", id: "搜索片单标题", type: "text", test_btn: true },
      { key: "搜索片单链接", id: "搜索片单链接", type: "text", test_btn: true },
      { key: "搜索片单图片", id: "搜索片单图片", type: "text", test_btn: true },
    ],
  },
];

interface Props { site: TvBoxVod; onClose: () => void; }

export function XYQHikerEditor({ site, onClose }: Props) {
  const { updateSite, source } = useTvBoxStore();
  const { addToast } = useUIStore();

  const [testUrl, setTestUrl] = useState("");
  const [activeSection, setActiveSection] = useState("basic");
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // 规则数据（key-value object）
  const [ruleData, setRuleData] = useState<Record<string, string>>(() => {
    if (!site.ext) return {};
    try {
      const data = typeof site.ext === "string" ? parseJsonc(site.ext) : site.ext;
      return Object.fromEntries(
        Object.entries(data as Record<string, unknown>).map(([k, v]) => [k, String(v ?? "")])
      );
    } catch {
      return {};
    }
  });

  const setField = useCallback((id: string, val: string) => {
    setRuleData((prev) => ({ ...prev, [id]: val }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries(ruleData)) {
        if (v.trim()) cleaned[k] = v;
      }
      const json = formatJson(cleaned);

      // 如果 ext 是文件路径，写入文件
      const extPath = typeof site.ext === "string" && !site.ext.startsWith("http") ? site.ext : null;
      if (extPath) {
        await writeFile(extPath, json);
      }

      // 同时更新 store 中的 ext
      const idx = source?.sites.findIndex((s) => s.key === site.key) ?? -1;
      if (idx >= 0) {
        updateSite(idx, { ...site, ext: extPath || json });
      }

      addToast({ type: "success", message: "规则已保存" });
    } catch (e) {
      addToast({ type: "error", message: `保存失败: ${e}` });
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (id: string) =>
    setCollapsed((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const section = SECTIONS.find((s) => s.id === activeSection);

  return (
    <div className="flex h-full overflow-hidden">
      {/* 左侧 Section 导航 */}
      <div className="w-32 border-r border-border flex flex-col flex-shrink-0 bg-muted/20">
        <div className="p-2 space-y-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors ${
                activeSection === s.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 右侧字段编辑区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 工具栏 */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <Input
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="输入测试页面 URL（用于规则测试）..."
            className="flex-1 h-7 text-xs"
          />
          <Button variant="primary" size="sm" loading={saving}
            onClick={handleSave} icon={<Save className="h-3.5 w-3.5" />}>
            保存
          </Button>
        </div>

        {/* 字段列表 */}
        <div className="flex-1 overflow-auto px-3 py-2">
          {section && (
            <div className="space-y-0">
              {section.fields.map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  value={ruleData[field.id] ?? ""}
                  onChange={(v) => setField(field.id, v)}
                  testUrl={testUrl}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
