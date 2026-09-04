import { useState, useEffect } from "react";
import { Dialog } from "../../ui/Dialog";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { useSettingsStore } from "../../../store";
import {
  FilePlus, Globe, FolderOpen, Sparkles, Check, HardDrive,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreateBlank: (name: string, targetPath: string, subDir: string) => void;
  onCreateFromTemplate: (templateKey: string, name: string, targetPath: string, subDir: string) => void;
  onImportUrl: (url: string, name: string, targetPath: string, subDir: string) => void;
  onOpenLocalFile: () => void;
}

const TEMPLATES = [
  {
    key: "standard",
    title: "标准基础模板",
    desc: "包含基础结构、常见 VIP 标识与去广告规则骨架",
    sitesCount: 0,
    livesCount: 1,
  },
  {
    key: "vod_spider",
    title: "影视爬虫聚合模板",
    desc: "预设了常见 Spider JAR 结构与示例爬虫规范",
    sitesCount: 1,
    livesCount: 0,
  },
  {
    key: "live_stream",
    title: "纯直播电视频道模板",
    desc: "专注于 IPTV 电视直播、带分组结构的直播规则",
    sitesCount: 0,
    livesCount: 3,
  },
];

function toDirSlug(name: string, fallback = "config"): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

export function ConfigCreateModal({
  open,
  onClose,
  onCreateBlank,
  onCreateFromTemplate,
  onImportUrl,
  onOpenLocalFile,
}: Props) {
  const { settings } = useSettingsStore();
  const rootSaveDir = (settings.saveDir || "./box").replace(/\/+$/, "");

  const [tab, setTab] = useState<"blank" | "template" | "url" | "file">("blank");
  const [blankName, setBlankName] = useState("我的影视配置");
  const [blankSubDir, setBlankSubDir] = useState("my_tvbox");
  const [blankFileName, setBlankFileName] = useState("my_tvbox.json");

  const [selectedTemplate, setSelectedTemplate] = useState("standard");
  const [templateName, setTemplateName] = useState("标准 TVBox 配置");
  const [templateSubDir, setTemplateSubDir] = useState("standard_tvbox");
  const [templateFileName, setTemplateFileName] = useState("standard_tvbox.json");

  const [urlInput, setUrlInput] = useState("");
  const [urlName, setUrlName] = useState("");
  const [urlSubDir, setUrlSubDir] = useState("");
  const [urlFileName, setUrlFileName] = useState("");

  // 当名字变动时自动更新子目录建议与对应配置文件名
  useEffect(() => {
    const slug = toDirSlug(blankName, "my_box");
    setBlankSubDir(slug);
    setBlankFileName(`${slug}.json`);
  }, [blankName]);

  useEffect(() => {
    const slug = toDirSlug(templateName, "template_box");
    setTemplateSubDir(slug);
    setTemplateFileName(`${slug}.json`);
  }, [templateName]);

  useEffect(() => {
    if (urlName.trim()) {
      const slug = toDirSlug(urlName, "remote_box");
      setUrlSubDir(slug);
      setUrlFileName(`${slug}.json`);
    } else if (urlInput.trim()) {
      try {
        const u = new URL(urlInput.trim());
        let filename = u.pathname.split("/").pop()?.replace(/\.[^.]+$/, "") || "remote_box";
        if (filename === "tvbox" || filename === "index") filename = "remote_box";
        const slug = toDirSlug(filename, "remote_box");
        setUrlSubDir(slug);
        setUrlFileName(`${slug}.json`);
      } catch {
        setUrlSubDir("remote_box");
        setUrlFileName("remote_box.json");
      }
    }
  }, [urlName, urlInput]);

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="新建 / 导入 TVBox 配置"
      description="为新配置指定在数据根目录下的专属存放子目录，资源与规则统一管理"
      size="md"
    >
      <div className="space-y-4 p-1">
        {/* 模式选择切换 */}
        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-lg bg-muted border border-border text-xs">
          <button
            type="button"
            onClick={() => setTab("blank")}
            className={`py-1.5 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1 ${
              tab === "blank" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FilePlus className="h-3.5 w-3.5" /> 空白配置
          </button>
          <button
            type="button"
            onClick={() => setTab("template")}
            className={`py-1.5 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1 ${
              tab === "template" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" /> 预设模板
          </button>
          <button
            type="button"
            onClick={() => setTab("url")}
            className={`py-1.5 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1 ${
              tab === "url" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="h-3.5 w-3.5" /> 网络订阅
          </button>
          <button
            type="button"
            onClick={() => setTab("file")}
            className={`py-1.5 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1 ${
              tab === "file" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FolderOpen className="h-3.5 w-3.5" /> 本地文件
          </button>
        </div>

        {/* 模式 1: 空白配置 */}
        {tab === "blank" && (
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">配置名称 *</label>
              <Input
                value={blankName}
                onChange={(e) => setBlankName(e.target.value)}
                placeholder="例如: 我的主用规则"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <HardDrive className="h-3.5 w-3.5 text-primary" /> 保存子目录名
                </label>
                <Input
                  value={blankSubDir}
                  onChange={(e) => {
                    setBlankSubDir(e.target.value);
                    setBlankFileName(`${toDirSlug(e.target.value, "my_box")}.json`);
                  }}
                  placeholder="例如: my_box"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">独立配置文件名</label>
                <Input
                  value={blankFileName}
                  onChange={(e) => setBlankFileName(e.target.value)}
                  placeholder="例如: my_box.json"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground font-mono bg-muted/30 p-2 rounded space-y-0.5">
              <div>文件路径: <span className="text-foreground">{rootSaveDir}/{blankSubDir || "my_box"}/{blankFileName || `${blankSubDir || "my_box"}.json`}</span></div>
              <div className="text-[10px] text-primary/80">多配置记录将自动同步至根目录: {rootSaveDir}/configs.json</div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const finalName = blankName.trim() || "未命名配置";
                  const finalSubDir = blankSubDir.trim() || "config";
                  const finalFile = (blankFileName.trim() || `${finalSubDir}.json`).replace(/\.json$/, "") + ".json";
                  const targetPath = `${rootSaveDir}/${finalSubDir}/${finalFile}`;
                  onCreateBlank(finalName, targetPath, `${rootSaveDir}/${finalSubDir}`);
                  onClose();
                }}
              >
                创建并进入工作区
              </Button>
            </div>
          </div>
        )}

        {/* 模式 2: 预设模板 */}
        {tab === "template" && (
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">配置名称 *</label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="模板配置显示名称"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <HardDrive className="h-3.5 w-3.5 text-primary" /> 保存子目录名
                </label>
                <Input
                  value={templateSubDir}
                  onChange={(e) => {
                    setTemplateSubDir(e.target.value);
                    setTemplateFileName(`${toDirSlug(e.target.value, "template_box")}.json`);
                  }}
                  placeholder="例如: standard_tvbox"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">独立配置文件名</label>
                <Input
                  value={templateFileName}
                  onChange={(e) => setTemplateFileName(e.target.value)}
                  placeholder="例如: standard_tvbox.json"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground font-mono bg-muted/30 p-2 rounded space-y-0.5">
              <div>文件路径: <span className="text-foreground">{rootSaveDir}/{templateSubDir || "template_box"}/{templateFileName || `${templateSubDir || "template_box"}.json`}</span></div>
              <div className="text-[10px] text-primary/80">多配置记录将自动同步至根目录: {rootSaveDir}/configs.json</div>
            </div>

            <div className="space-y-2 mt-2">
              <label className="text-xs font-semibold text-foreground">选择模板原型</label>
              <div className="space-y-2">
                {TEMPLATES.map((tpl) => (
                  <div
                    key={tpl.key}
                    onClick={() => {
                      setSelectedTemplate(tpl.key);
                      setTemplateName(tpl.title);
                    }}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      selectedTemplate === tpl.key
                        ? "border-primary bg-primary/[0.04] ring-1 ring-primary"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground">{tpl.title}</span>
                      {selectedTemplate === tpl.key && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{tpl.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const finalName = templateName.trim() || "模板配置";
                  const finalSubDir = templateSubDir.trim() || "template_box";
                  const finalFile = (templateFileName.trim() || `${finalSubDir}.json`).replace(/\.json$/, "") + ".json";
                  const targetPath = `${rootSaveDir}/${finalSubDir}/${finalFile}`;
                  onCreateFromTemplate(selectedTemplate, finalName, targetPath, `${rootSaveDir}/${finalSubDir}`);
                  onClose();
                }}
              >
                基于模板创建
              </Button>
            </div>
          </div>
        )}

        {/* 模式 3: 网络订阅导入 */}
        {tab === "url" && (
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">TVBox 订阅 URL *</label>
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/tvbox.json"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">配置别名</label>
              <Input
                value={urlName}
                onChange={(e) => setUrlName(e.target.value)}
                placeholder="留空自动使用链接文件名"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <HardDrive className="h-3.5 w-3.5 text-primary" /> 保存子目录
                </label>
                <Input
                  value={urlSubDir}
                  onChange={(e) => {
                    setUrlSubDir(e.target.value);
                    setUrlFileName(`${toDirSlug(e.target.value, "remote_box")}.json`);
                  }}
                  placeholder="例如: remote_box"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">独立配置文件名</label>
                <Input
                  value={urlFileName}
                  onChange={(e) => setUrlFileName(e.target.value)}
                  placeholder="例如: remote_box.json"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground font-mono bg-muted/30 p-2 rounded space-y-0.5">
              <div>本地保存路径: <span className="text-foreground">{rootSaveDir}/{urlSubDir || "remote_box"}/{urlFileName || `${urlSubDir || "remote_box"}.json`}</span></div>
              <div className="text-[10px] text-primary/80">多配置记录将自动同步至根目录: {rootSaveDir}/configs.json</div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button
                variant="primary"
                disabled={!urlInput.trim()}
                onClick={() => {
                  const inferredName = urlName.trim() || urlInput.split("/").pop()?.replace(/\.[^.]+$/, "") || "网络订阅配置";
                  const finalSubDir = urlSubDir.trim() || "remote_box";
                  const finalFile = (urlFileName.trim() || `${finalSubDir}.json`).replace(/\.json$/, "") + ".json";
                  const targetPath = `${rootSaveDir}/${finalSubDir}/${finalFile}`;
                  onImportUrl(urlInput.trim(), inferredName, targetPath, `${rootSaveDir}/${finalSubDir}`);
                  onClose();
                }}
              >
                导入并打开
              </Button>
            </div>
          </div>
        )}

        {/* 模式 4: 本地文件导入 */}
        {tab === "file" && (
          <div className="space-y-4 py-3 text-center">
            <div className="p-6 rounded-xl border border-dashed border-border bg-muted/20 flex flex-col items-center gap-3">
              <FolderOpen className="h-10 w-10 text-primary" />
              <div>
                <div className="font-semibold text-sm">打开本地 JSON / TXT 配置文件</div>
                <div className="text-xs text-muted-foreground mt-1">
                  支持 TVBox 规则文件、Base64 加密配置及宽松 JSONC 注释
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenLocalFile();
                }}
                icon={<FolderOpen className="h-3.5 w-3.5" />}
              >
                浏览并选择文件
              </Button>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                关闭
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
