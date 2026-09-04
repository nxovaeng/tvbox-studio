import React from "react";
import { useSettingsStore, useUIStore } from "../../store";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Settings, Sun, Moon, Monitor, RotateCcw, FolderOpen } from "lucide-react";
import { cn } from "../../lib/utils";

export function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const { addToast } = useUIStore();

  const THEMES = [
    { id: "light", label: "浅色", icon: Sun },
    { id: "dark",  label: "深色", icon: Moon },
    { id: "system", label: "跟随系统", icon: Monitor },
  ] as const;

  const EDITOR_THEMES = ["vs-dark", "vs", "hc-black", "hc-light"];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h1 className="text-lg font-semibold">设置</h1>
        </div>
      </div>

      <div className="p-6 space-y-8 max-w-2xl">
        {/* 外观 */}
        <Section title="外观">
          <Field label="主题">
            <div className="flex gap-2">
              {THEMES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => updateSettings({ theme: id })}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm transition-colors",
                    settings.theme === id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        {/* 编辑器 */}
        <Section title="代码编辑器">
          <Field label="编辑器主题">
            <div className="flex gap-2 flex-wrap">
              {EDITOR_THEMES.map((t) => (
                <button
                  key={t}
                  onClick={() => updateSettings({ editorTheme: t })}
                  className={cn(
                    "px-3 py-1.5 rounded border text-sm font-mono transition-colors",
                    settings.editorTheme === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>
          <Field label="字体大小">
            <select
              className="h-8 rounded-md border border-input bg-background px-3 text-sm"
              value={settings.editorFontSize}
              onChange={(e) => updateSettings({ editorFontSize: Number(e.target.value) })}
            >
              {[12, 13, 14, 15, 16, 18, 20].map((s) => (
                <option key={s} value={s}>{s}px</option>
              ))}
            </select>
          </Field>
        </Section>

        {/* 网络 */}
        <Section title="网络">
          <Field label="GitHub 代理" description="加速 GitHub raw 链接下载">
            <Input
              value={settings.githubProxy}
              onChange={(e) => updateSettings({ githubProxy: e.target.value })}
              placeholder="https://mirror.ghproxy.com/"
              className="max-w-sm"
            />
          </Field>
          <Field label="检测超时（秒）">
            <Input
              type="number"
              value={settings.checkTimeout}
              onChange={(e) => updateSettings({ checkTimeout: Number(e.target.value) })}
              className="w-24"
              min={1}
              max={60}
            />
          </Field>
          <Field label="并发检测数">
            <Input
              type="number"
              value={settings.checkConcurrency}
              onChange={(e) => updateSettings({ checkConcurrency: Number(e.target.value) })}
              className="w-24"
              min={1}
              max={100}
            />
          </Field>
        </Section>

        {/* 本地存储 */}
        <Section title="本地存储">
          <Field label="数据存储根目录" description="所有 TVBox 本地化资源与各独立配置子目录的根存放路径，默认 ./box">
            <div className="flex items-center gap-2 max-w-lg">
              <Input
                value={settings.saveDir || "./box"}
                onChange={(e) => updateSettings({ saveDir: e.target.value })}
                placeholder="./box 或 /path/to/tvbox_data"
                className="font-mono text-xs flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const { open } = await import("@tauri-apps/plugin-dialog");
                    const selected = await open({ directory: true, multiple: false });
                    if (selected && typeof selected === "string") {
                      updateSettings({ saveDir: selected });
                      addToast({ type: "success", message: `已设置数据根目录为: ${selected}` });
                    }
                  } catch (e) {
                    addToast({ type: "error", message: `选择目录失败: ${e}` });
                  }
                }}
                icon={<FolderOpen className="h-3.5 w-3.5" />}
              >
                浏览
              </Button>
            </div>
          </Field>
        </Section>

        {/* 本地服务器 */}
        <Section title="本地 HTTP 服务">
          <Field label="服务端口" description="内置 HTTP 服务器端口，供局域网设备订阅">
            <Input
              type="number"
              value={settings.serverPort}
              onChange={(e) => updateSettings({ serverPort: Number(e.target.value) })}
              className="w-24"
              min={1024}
              max={65535}
            />
          </Field>
        </Section>

        {/* 重置 */}
        <div className="pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => {
              resetSettings();
              addToast({ type: "success", message: "已恢复默认设置" });
            }}
            icon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            恢复默认设置
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">{title}</h2>
      <div className="space-y-4 pl-1">{children}</div>
    </div>
  );
}

function Field({ label, description, children }: {
  label: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-8">
      <div className="w-40 flex-shrink-0">
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
