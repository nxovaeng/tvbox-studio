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

        <FieldGroup label="提示文字">
          <Input
            value={source.warningText ?? ""}
            onChange={(e) => updateSource({ warningText: e.target.value })}
            placeholder="可选，TVBox 启动时显示的提示文字"
          />
        </FieldGroup>

        {/* 统计信息卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "爬虫规则", value: source.sites.length },
            { label: "直播规则", value: source.lives.length },
            { label: "解析接口", value: source.parses?.length ?? 0 },
            { label: "VIP 标识", value: source.flags?.length ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
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
