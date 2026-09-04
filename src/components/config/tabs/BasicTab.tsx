import { useTvBoxStore } from "../../../store";
import { Input } from "../../ui/Input";
import { Textarea } from "../../ui/Input";
import { Button } from "../../ui/Button";
import { Copy, Image } from "lucide-react";

export function BasicTab() {
  const { source, updateSource } = useTvBoxStore();
  if (!source) return null;

  const copyJson = () => {
    const json = useTvBoxStore.getState().getJson();
    navigator.clipboard.writeText(json);
  };

  return (
    <div className="overflow-auto h-full">
      <div className="p-4 max-w-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">基础信息</h3>
          <Button variant="outline" size="sm" icon={<Copy className="h-3.5 w-3.5" />} onClick={copyJson}>
            复制 JSON
          </Button>
        </div>

        <FieldGroup label="Spider JAR">
          <Input
            value={source.spider ?? ""}
            onChange={(e) => updateSource({ spider: e.target.value })}
            placeholder="爬虫引擎 JAR 路径或链接（含 ;md5; 可自动计算）"
          />
          <p className="text-xs text-muted-foreground mt-1">
            示例: ./jar/tvbox.jar;md5;abc123 或 https://example.com/spider.jar
          </p>
        </FieldGroup>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldGroup label="配置名称">
            <Input value={source.name ?? ""} onChange={(e) => updateSource({ name: e.target.value })} placeholder="例如：家庭影视配置" />
          </FieldGroup>
          <FieldGroup label="配置路径">
            <Input value={source.path ?? ""} onChange={(e) => updateSource({ path: e.target.value })} placeholder="例如：./box/xiaosa/xiaosa.json" />
          </FieldGroup>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldGroup label="壁纸 URL">
            <div className="flex gap-2">
              <Input
                value={source.wallpaper ?? ""}
                onChange={(e) => updateSource({ wallpaper: e.target.value })}
                placeholder="可选，首页壁纸图片链接"
                className="flex-1"
              />
              {source.wallpaper && (
                <a href={source.wallpaper} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="icon" icon={<Image className="h-4 w-4" />} />
                </a>
              )}
            </div>
          </FieldGroup>
          <FieldGroup label="全局 Logo">
            <div className="flex gap-2">
              <Input
                value={source.logo ?? ""}
                onChange={(e) => updateSource({ logo: e.target.value })}
                placeholder="可选，首页全局台标/Logo图片链接"
                className="flex-1"
              />
              {source.logo && (
                <a href={source.logo} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="icon" icon={<Image className="h-4 w-4" />} />
                </a>
              )}
            </div>
          </FieldGroup>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldGroup label="弹幕引擎 URL">
            <Input
              value={source.danmaku ?? ""}
              onChange={(e) => updateSource({ danmaku: e.target.value })}
              placeholder="可选，如: http://127.0.0.1:9978/danmaku"
            />
          </FieldGroup>
          <FieldGroup label="提示文字">
            <Input
              value={source.warningText ?? ""}
              onChange={(e) => updateSource({ warningText: e.target.value })}
              placeholder="可选，TVBox 启动时显示的提示文字"
            />
          </FieldGroup>
        </div>

        {/* 统计信息卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
          {[
            { label: "爬虫规则", value: source.sites.length },
            { label: "直播规则", value: source.lives.length },
            { label: "解析接口", value: source.parses?.length ?? 0 },
            { label: "VIP 标识", value: source.flags?.length ?? 0 },
            { label: "DoH 节点", value: source.doh?.length ?? 0 },
            { label: "Hosts 映射", value: source.hosts?.length ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="bg-muted/50 rounded-lg p-2.5 text-center">
              <div className="text-xl font-bold text-primary">{value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* JSON 预览 */}
        <FieldGroup label="原始 JSON 预览（只读）">
          <Textarea
            readOnly
            value={useTvBoxStore.getState().getJson()}
            rows={12}
            className="font-mono text-xs bg-muted/30"
          />
        </FieldGroup>
      </div>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}
