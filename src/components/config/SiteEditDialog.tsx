import React, { useState } from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input, Textarea } from "../ui/Input";
import { useTvBoxStore, useUIStore } from "../../store";
import type { TvBoxVod } from "../../types/tvbox";
import { Sliders, Code, Layout, ShieldAlert } from "lucide-react";
import { cn } from "../../lib/utils";

interface Props {
  site: TvBoxVod;
  index: number;
  onClose: () => void;
  isNew?: boolean;
}

export function SiteEditDialog({ site, index, onClose, isNew }: Props) {
  const { updateSite, addSite } = useTvBoxStore();
  const { addToast } = useUIStore();

  const [activeTab, setActiveTab] = useState<"basic" | "rule" | "style">("basic");

  // Ext 初始解析
  const initialExtIsObject = typeof site.ext === "object" && site.ext !== null;
  const initialExtStr = initialExtIsObject
    ? JSON.stringify(site.ext, null, 2)
    : (site.ext as string ?? "");

  const [form, setForm] = useState({
    ...site,
    searchable: site.searchable ?? 1,
    quickSearch: site.quickSearch ?? 1,
    filterable: site.filterable ?? 1,
    changeable: site.changeable ?? 1,
    hide: site.hide ?? 0,
    genre: site.genre ?? "",
    timeout: site.timeout ? String(site.timeout) : "",
    styleType: site.style?.type ?? "",
    styleRatio: site.style?.ratio !== undefined ? String(site.style.ratio) : "",
    categoriesStr: Array.isArray(site.categories) ? site.categories.join(", ") : "",
    headerStr: typeof site.header === "object" && site.header !== null ? JSON.stringify(site.header, null, 2) : (site.header ?? ""),
  });

  const [extStr, setExtStr] = useState(initialExtStr);
  const [extMode, setExtMode] = useState<"text" | "json">(initialExtIsObject || (initialExtStr.trim().startsWith("{")) ? "json" : "text");

  const handleSave = () => {
    if (!form.key.trim() || !form.name.trim()) {
      addToast({ type: "error", message: "Key 和名称不能为空" });
      return;
    }

    // 解析 ext
    let parsedExt: string | Record<string, unknown> = extStr.trim();
    if (extMode === "json" && extStr.trim()) {
      try {
        parsedExt = JSON.parse(extStr.trim());
      } catch (err) {
        addToast({ type: "error", message: `Ext JSON 格式不正确: ${err}` });
        return;
      }
    }

    // 解析 style
    let styleObj: { type?: string; ratio?: number } | undefined;
    if (form.styleType.trim() || form.styleRatio.trim()) {
      styleObj = {};
      if (form.styleType.trim()) styleObj.type = form.styleType.trim();
      if (form.styleRatio.trim() && !isNaN(Number(form.styleRatio))) {
        styleObj.ratio = Number(form.styleRatio);
      }
    }

    // 解析 header
    let parsedHeader: Record<string, string> | string | undefined;
    if (form.headerStr.trim()) {
      try {
        parsedHeader = JSON.parse(form.headerStr.trim());
      } catch {
        parsedHeader = form.headerStr.trim();
      }
    }

    // 解析 categories
    const categories = form.categoriesStr
      .split(/[,，]/)
      .map((c) => c.trim())
      .filter(Boolean);

    const updatedSite: TvBoxVod = {
      ...site,
      key: form.key.trim(),
      name: form.name.trim(),
      type: Number(form.type),
      api: form.api.trim(),
      searchable: Number(form.searchable),
      quickSearch: Number(form.quickSearch),
      filterable: Number(form.filterable),
      changeable: Number(form.changeable),
      hide: Number(form.hide),
      ext: parsedExt,
      ...(form.jar?.trim() ? { jar: form.jar.trim() } : { jar: undefined }),
      ...(form.genre.trim() ? { genre: form.genre.trim() } : { genre: undefined }),
      ...(form.timeout.trim() && !isNaN(Number(form.timeout)) ? { timeout: Number(form.timeout) } : { timeout: undefined }),
      ...(styleObj ? { style: styleObj } : { style: undefined }),
      ...(categories.length ? { categories } : { categories: undefined }),
      ...(parsedHeader ? { header: parsedHeader } : { header: undefined }),
    };

    if (isNew) addSite(updatedSite);
    else updateSite(index, updatedSite);

    addToast({ type: "success", message: isNew ? "已新增爬虫规则" : "已保存规则" });
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title={isNew ? "新增爬虫规则" : `编辑规则: ${site.name}`} size="lg">
      <div className="flex flex-col h-full max-h-[80vh]">
        {/* 子标签导航 */}
        <div className="flex items-center gap-1 px-4 pt-2 border-b border-border bg-muted/20 flex-shrink-0">
          {[
            { id: "basic", label: "基本信息与开关", icon: Sliders },
            { id: "rule", label: "引擎 API 与 Ext 规则", icon: Code },
            { id: "style", label: "海报样式与高级属性", icon: Layout },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors",
                activeTab === id
                  ? "border-primary text-primary bg-background rounded-t"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {activeTab === "basic" && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">名称 *</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="如：玩偶 • 4K 或 豆瓣"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">唯一标识 Key *</label>
                  <Input
                    value={form.key}
                    onChange={(e) => setForm({ ...form, key: e.target.value })}
                    placeholder="如：wogg 或 douban"
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">爬虫源类型</label>
                  <select
                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: Number(e.target.value) })}
                  >
                    <option value={3}>3 - Spider / CSP 爬虫引擎 (最常用)</option>
                    <option value={0}>0 - XML 格式 CMS 采集站</option>
                    <option value={1}>1 - JSON 格式 CMS 采集站</option>
                    <option value={4}>4 - Base64 编码</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">题材/题材分类 (genre)</label>
                  <Input
                    value={form.genre}
                    onChange={(e) => setForm({ ...form, genre: e.target.value })}
                    placeholder="如：shortdrama (短剧)"
                  />
                </div>
              </div>

              <div className="border border-border/80 rounded-lg p-3 bg-muted/20 space-y-2.5">
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-primary" />
                  <span>核心开关与行为控制</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">可搜索</label>
                    <select
                      className="flex h-7 w-full rounded border border-input bg-background px-2 text-xs"
                      value={form.searchable}
                      onChange={(e) => setForm({ ...form, searchable: Number(e.target.value) })}
                    >
                      <option value={1}>1 (允许搜索)</option>
                      <option value={0}>0 (禁止搜索)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">快速搜索</label>
                    <select
                      className="flex h-7 w-full rounded border border-input bg-background px-2 text-xs"
                      value={form.quickSearch}
                      onChange={(e) => setForm({ ...form, quickSearch: Number(e.target.value) })}
                    >
                      <option value={1}>1 (参与聚合)</option>
                      <option value={0}>0 (不参与)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">可换源</label>
                    <select
                      className="flex h-7 w-full rounded border border-input bg-background px-2 text-xs"
                      value={form.changeable}
                      onChange={(e) => setForm({ ...form, changeable: Number(e.target.value) })}
                    >
                      <option value={1}>1 (允许换源)</option>
                      <option value={0}>0 (禁止换源)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">可筛选</label>
                    <select
                      className="flex h-7 w-full rounded border border-input bg-background px-2 text-xs"
                      value={form.filterable}
                      onChange={(e) => setForm({ ...form, filterable: Number(e.target.value) })}
                    >
                      <option value={1}>1 (显示筛选)</option>
                      <option value={0}>0 (无筛选)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">客户端隐藏</label>
                    <select
                      className="flex h-7 w-full rounded border border-input bg-background px-2 text-xs"
                      value={form.hide}
                      onChange={(e) => setForm({ ...form, hide: Number(e.target.value) })}
                    >
                      <option value={0}>0 (正常显示)</option>
                      <option value={1}>1 (在TVBox隐藏)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "rule" && (
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">API / 爬虫入口 *</label>
                  <span className="text-[11px] text-muted-foreground">
                    如: csp_XYQHiker / ./lib/drpy2.min.js / ./py/xxx.py / https://...
                  </span>
                </div>
                <Input
                  value={form.api}
                  onChange={(e) => setForm({ ...form, api: e.target.value })}
                  placeholder="csp_XYQHiker 或 ./lib/drpy2.min.js"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">专属 Spider JAR (可选)</label>
                <Input
                  value={form.jar ?? ""}
                  onChange={(e) => setForm({ ...form, jar: e.target.value })}
                  placeholder="默认留空沿用全局 spider。可填如: ./jar/tvbox.jar"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-foreground">Ext 扩展配置 / 规则内容</label>
                    <div className="flex rounded border border-border overflow-hidden text-[10px]">
                      <button
                        type="button"
                        onClick={() => setExtMode("text")}
                        className={cn("px-2 py-0.5", extMode === "text" ? "bg-primary text-primary-foreground font-medium" : "bg-muted text-muted-foreground")}
                      >
                        单行路径/文本
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExtMode("json");
                          try {
                            if (extStr.trim().startsWith("{")) {
                              setExtStr(JSON.stringify(JSON.parse(extStr.trim()), null, 2));
                            }
                          } catch {}
                        }}
                        className={cn("px-2 py-0.5", extMode === "json" ? "bg-primary text-primary-foreground font-medium" : "bg-muted text-muted-foreground")}
                      >
                        JSON 格式化对象
                      </button>
                    </div>
                  </div>
                  {extMode === "json" && (
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const parsed = JSON.parse(extStr);
                          setExtStr(JSON.stringify(parsed, null, 2));
                          addToast({ type: "success", message: "JSON 格式化成功" });
                        } catch (e) {
                          addToast({ type: "error", message: `JSON 格式错误: ${e}` });
                        }
                      }}
                      className="text-[11px] text-primary hover:underline"
                    >
                      格式化 JSON
                    </button>
                  )}
                </div>

                {extMode === "text" ? (
                  <Input
                    value={extStr}
                    onChange={(e) => setExtStr(e.target.value)}
                    placeholder="如: ./json/JQYS.json 或 ./js/drpy.js 或 https://..."
                    className="font-mono text-xs"
                  />
                ) : (
                  <Textarea
                    value={extStr}
                    onChange={(e) => setExtStr(e.target.value)}
                    rows={8}
                    placeholder="请输入合法的 JSON 对象，如: { &quot;site&quot;: [&quot;https://...&quot;] }"
                    className="font-mono text-xs"
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === "style" && (
            <div className="space-y-3.5">
              <div className="border border-border/80 rounded-lg p-3 bg-muted/20 space-y-3">
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Layout className="h-3.5 w-3.5 text-primary" />
                  <span>卡片布局与海报比例 (style)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">布局形态 (type)</label>
                    <select
                      className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
                      value={form.styleType}
                      onChange={(e) => setForm({ ...form, styleType: e.target.value })}
                    >
                      <option value="">默认 (不设置)</option>
                      <option value="rect">rect (海报卡片)</option>
                      <option value="list">list (横向列表)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">海报高宽比例 (ratio)</label>
                    <Input
                      value={form.styleRatio}
                      onChange={(e) => setForm({ ...form, styleRatio: e.target.value })}
                      placeholder="如: 1.433 / 1.618 / 1.33"
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  提示: 短剧和某些特定站点常设为 ratio: 1.433 或 1.618，横向列表常设为 list。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">请求超时秒数 (timeout)</label>
                  <Input
                    value={form.timeout}
                    onChange={(e) => setForm({ ...form, timeout: e.target.value })}
                    placeholder="如: 60"
                    type="number"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">分类白名单 (categories)</label>
                  <Input
                    value={form.categoriesStr}
                    onChange={(e) => setForm({ ...form, categoriesStr: e.target.value })}
                    placeholder="逗号分隔，如: 短剧, 电影"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">自定义请求头 (header)</label>
                <Textarea
                  value={form.headerStr}
                  onChange={(e) => setForm({ ...form, headerStr: e.target.value })}
                  rows={3}
                  placeholder="JSON 对象或文本，如: { &quot;User-Agent&quot;: &quot;okhttp/3.15&quot; }"
                  className="font-mono text-xs"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10 flex-shrink-0">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5 text-primary" />
            <span>修改后请及时在主界面点击「保存」或按 Ctrl+S 落盘</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>取消</Button>
            <Button variant="primary" size="sm" onClick={handleSave}>保存规则</Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
