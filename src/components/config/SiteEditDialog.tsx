import React, { useState } from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useTvBoxStore, useUIStore } from "../../store";
import type { TvBoxVod } from "../../types/tvbox";

interface Props {
  site: TvBoxVod;
  index: number;
  onClose: () => void;
  isNew?: boolean;
}

export function SiteEditDialog({ site, index, onClose, isNew }: Props) {
  const { updateSite, addSite } = useTvBoxStore();
  const { addToast } = useUIStore();
  const [form, setForm] = useState({ ...site });

  const handleSave = () => {
    if (!form.key.trim() || !form.name.trim()) {
      addToast({ type: "error", message: "Key 和名称不能为空" });
      return;
    }
    if (isNew) addSite(form);
    else updateSite(index, form);
    addToast({ type: "success", message: isNew ? "已新增规则" : "已保存" });
    onClose();
  };

  const field = (label: string, key: keyof TvBoxVod, placeholder?: string) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input
        value={String((form as Record<string, unknown>)[key] ?? "")}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <Dialog open onClose={onClose} title={isNew ? "新增爬虫规则" : `编辑: ${site.name}`} size="md">
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {field("名称 *", "name", "显示名称")}
          {field("Key *", "key", "唯一标识符")}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">类型</label>
          <select
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: Number(e.target.value) })}
          >
            <option value={0}>0 - XML (CMS)</option>
            <option value={1}>1 - JSON (CMS)</option>
            <option value={3}>3 - Spider (CSP)</option>
          </select>
        </div>

        {field("API / 爬虫引擎", "api", "csp_XYQHiker 或 https://api.example.com")}
        {field("Ext (规则文件)", "ext" as keyof TvBoxVod, "./rule.json 或 https://...")}
        {field("JAR (自定义爬虫库)", "jar", "./jar/tvbox.jar")}

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">可搜索</label>
            <select
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={form.searchable ?? 1}
              onChange={(e) => setForm({ ...form, searchable: Number(e.target.value) })}
            >
              <option value={1}>是</option>
              <option value={0}>否</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">快速搜索</label>
            <select
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={form.quickSearch ?? 1}
              onChange={(e) => setForm({ ...form, quickSearch: Number(e.target.value) })}
            >
              <option value={1}>是</option>
              <option value={0}>否</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">隐藏</label>
            <select
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={form.hide ?? 0}
              onChange={(e) => setForm({ ...form, hide: Number(e.target.value) })}
            >
              <option value={0}>否</option>
              <option value={1}>是</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={handleSave}>保存</Button>
        </div>
      </div>
    </Dialog>
  );
}
