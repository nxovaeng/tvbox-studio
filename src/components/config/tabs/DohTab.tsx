import React, { useState } from "react";
import { useTvBoxStore, useUIStore } from "../../../store";
import { Button } from "../../ui/Button";
import { Input, Textarea } from "../../ui/Input";
import { Dialog } from "../../ui/Dialog";
import { Badge } from "../../ui/Badge";
import type { TvBoxDoh } from "../../../types/tvbox";
import { Globe, Plus, Trash2, Edit3, Server, ShieldCheck, Zap } from "lucide-react";

const PRESET_DOH: TvBoxDoh[] = [
  { name: "Google", url: "https://dns.google/dns-query", ips: ["8.8.8.8", "8.8.4.4"] },
  { name: "Cloudflare", url: "https://cloudflare-dns.com/dns-query", ips: ["1.1.1.1", "1.0.0.1"] },
  { name: "AliDNS (阿里)", url: "https://dns.alidns.com/dns-query", ips: ["223.5.5.5", "223.6.6.6"] },
  { name: "DNSPod (腾讯)", url: "https://doh.pub/dns-query", ips: ["1.12.12.12", "120.53.53.53"] },
  { name: "AdGuard", url: "https://dns.adguard.com/dns-query", ips: ["94.140.14.14", "94.140.14.140"] },
  { name: "Quad9", url: "https://dns.quad9.net/dns-query", ips: ["9.9.9.9", "149.112.112.112"] },
];

export function DohTab() {
  const { source, updateSource } = useTvBoxStore();
  const { addToast } = useUIStore();

  const [editDoh, setEditDoh] = useState<{ doh: TvBoxDoh; index: number } | null>(null);
  const [hostsText, setHostsText] = useState((source?.hosts ?? []).join("\n"));
  const [danmakuInput, setDanmakuInput] = useState(source?.danmaku ?? "");
  const [logoInput, setLogoInput] = useState(source?.logo ?? "");

  const dohList = source?.doh ?? [];

  const handleSaveHosts = () => {
    const lines = hostsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    updateSource({ hosts: lines });
    addToast({ type: "success", message: `已保存 ${lines.length} 条 Hosts 域名映射` });
  };

  const handleSaveDanmakuLogo = () => {
    updateSource({
      danmaku: danmakuInput.trim() || undefined,
      logo: logoInput.trim() || undefined,
    });
    addToast({ type: "success", message: "已保存全局弹幕/Logo配置" });
  };

  const handleRemoveDoh = (idx: number) => {
    const next = dohList.filter((_, i) => i !== idx);
    updateSource({ doh: next });
  };

  const handleSaveDoh = (doh: TvBoxDoh, index: number) => {
    let next: TvBoxDoh[];
    if (index === -1) {
      next = [...dohList, doh];
    } else {
      next = dohList.map((d, i) => (i === index ? doh : d));
    }
    updateSource({ doh: next });
    setEditDoh(null);
    addToast({ type: "success", message: "DoH 节点已保存" });
  };

  const handleAddPreset = (preset: TvBoxDoh) => {
    if (dohList.some((d) => d.url === preset.url)) {
      addToast({ type: "info", message: `${preset.name} 节点已存在` });
      return;
    }
    updateSource({ doh: [...dohList, preset] });
    addToast({ type: "success", message: `已添加 ${preset.name} DoH 预设节点` });
  };

  return (
    <div className="overflow-auto h-full p-4 space-y-6 max-w-4xl">
      {/* 顶部常用预设快捷添加 */}
      <div className="border border-border rounded-xl p-4 bg-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">常用 DoH 节点一键预设</span>
          </div>
          <span className="text-xs text-muted-foreground">支持防污染、加密安全 DNS 解析</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_DOH.map((preset) => {
            const exists = dohList.some((d) => d.url === preset.url);
            return (
              <Button
                key={preset.name}
                variant={exists ? "primary" : "outline"}
                size="sm"
                className="text-xs h-7"
                onClick={() => handleAddPreset(preset)}
                disabled={exists}
              >
                {exists ? `✓ ${preset.name}` : `+ ${preset.name}`}
              </Button>
            );
          })}
        </div>
      </div>

      {/* DoH 节点列表 */}
      <div className="border border-border rounded-xl p-4 bg-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">DoH (DNS-over-HTTPS) 节点列表</span>
            <span className="text-xs text-muted-foreground">({dohList.length})</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setEditDoh({ doh: { name: "", url: "", ips: [] }, index: -1 })}
          >
            自定义 DoH
          </Button>
        </div>

        {dohList.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            暂无 DoH 节点，可通过上方快捷按钮一键添加 Google、Cloudflare、阿里或 AdGuard 节点
          </div>
        ) : (
          <div className="divide-y divide-border border border-border/70 rounded-lg overflow-hidden">
            {dohList.map((item, idx) => (
              <div key={idx} className="group flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-xs">
                <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{item.name}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">{item.url}</Badge>
                  </div>
                  {item.ips && item.ips.length > 0 && (
                    <div className="text-muted-foreground font-mono text-[11px] mt-0.5 truncate">
                      IP: {item.ips.join(", ")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" onClick={() => setEditDoh({ doh: item, index: idx })}>
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveDoh(idx)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hosts 域名解析重定向映射 */}
      <div className="border border-border rounded-xl p-4 bg-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Hosts 域名重定向映射</span>
            <span className="text-xs text-muted-foreground">({source?.hosts?.length ?? 0})</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleSaveHosts}>
            保存 Hosts 映射
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          每行一条，格式为 <code className="font-mono bg-muted px-1 py-0.5 rounded">原始域名=目标CDN域名或IP</code>。常用于咪咕直播、视频防盗链重定向与加速。
        </p>
        <Textarea
          value={hostsText}
          onChange={(e) => setHostsText(e.target.value)}
          rows={5}
          placeholder="例如:&#10;cache.ott.ystenlive.itv.cmvideo.cn=base-v4-free-mghy.e.cdn.chinamobile.com"
          className="font-mono text-xs"
        />
      </div>

      {/* 全局弹幕与全局 Logo */}
      <div className="border border-border rounded-xl p-4 bg-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">全局弹幕引擎 & 全局 Logo</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleSaveDanmakuLogo}>
            保存配置
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">弹幕引擎 URL (danmaku)</label>
            <Input
              value={danmakuInput}
              onChange={(e) => setDanmakuInput(e.target.value)}
              placeholder="如: https://... 或 http://127.0.0.1:9978/danmaku"
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">全局 Logo URL (logo)</label>
            <Input
              value={logoInput}
              onChange={(e) => setLogoInput(e.target.value)}
              placeholder="如: https://.../logo.png"
              className="font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* 编辑 DoH 弹窗框 */}
      {editDoh && (
        <Dialog
          open
          title={editDoh.index === -1 ? "新增 DoH 节点" : "编辑 DoH 节点"}
          onClose={() => setEditDoh(null)}
          size="md"
        >
          <DohForm
            doh={editDoh.doh}
            onSave={(d) => handleSaveDoh(d, editDoh.index)}
            onCancel={() => setEditDoh(null)}
          />
        </Dialog>
      )}
    </div>
  );
}

function DohForm({
  doh,
  onSave,
  onCancel,
}: {
  doh: TvBoxDoh;
  onSave: (d: TvBoxDoh) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: doh.name,
    url: doh.url,
    ipsStr: (doh.ips ?? []).join(", "),
  });

  const save = () => {
    if (!form.name.trim() || !form.url.trim()) return;
    const ips = form.ipsStr
      .split(/[,，\n]/)
      .map((ip) => ip.trim())
      .filter(Boolean);
    onSave({
      name: form.name.trim(),
      url: form.url.trim(),
      ...(ips.length ? { ips } : { ips: undefined }),
    });
  };

  return (
    <div className="space-y-3 p-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium">名称 *</label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="如: Cloudflare 或 AliDNS"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">DoH 请求 URL *</label>
        <Input
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="如: https://dns.google/dns-query"
          className="font-mono text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">直连解析 IP（逗号或换行分隔，可选）</label>
        <Textarea
          value={form.ipsStr}
          onChange={(e) => setForm({ ...form, ipsStr: e.target.value })}
          rows={3}
          placeholder="如: 8.8.8.8, 8.8.4.4"
          className="font-mono text-xs"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button variant="primary" onClick={save}>保存</Button>
      </div>
    </div>
  );
}
