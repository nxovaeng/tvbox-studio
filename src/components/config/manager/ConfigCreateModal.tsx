import { useState } from "react";
import { Dialog } from "../../ui/Dialog";
import { Button } from "../../ui/Button";
import { FilePlus, FileCode, FolderOpen, Globe } from "lucide-react";
import { useSettingsStore } from "../../../store";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreateBlank: (projectName: string, targetPath: string, template?: "fongmi" | "catbox" | "empty") => void;
  onOpenLocalFile: () => void;
  onImportUrl: (url: string, projectName: string, targetPath: string) => void;
}

export function ConfigCreateModal({ open, onClose, onCreateBlank, onOpenLocalFile, onImportUrl }: Props) {
  const [tab, setTab] = useState<"blank" | "template" | "url" | "file">("blank");
  const { settings } = useSettingsStore();
  const rootSaveDir = (settings.saveDir || "./box").replace(/\/+$/, "");

  // 空白配置参数
  const [blankProject, setBlankProject] = useState("");
  const [blankFileName, setBlankFileName] = useState("tvbox.json");

  // 模板配置参数
  const [templateProject, setTemplateProject] = useState("");
  const [templateFileName, setTemplateFileName] = useState("tvbox.json");
  const [templateType, setTemplateType] = useState<"fongmi" | "catbox">("fongmi");

  // URL 导入参数
  const [urlInput, setUrlInput] = useState("");
  const [urlProject, setUrlProject] = useState("");
  const [urlFileName, setUrlFileName] = useState("tvbox.json");

  return (
    <Dialog open={open} onClose={onClose} title="新建 / 导入配置" className="max-w-md">
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex bg-muted/50 p-1 rounded-lg">
          <button
            onClick={() => setTab("blank")}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${
              tab === "blank" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FilePlus className="h-3.5 w-3.5" />
            空白配置
          </button>
          <button
            onClick={() => setTab("template")}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${
              tab === "template" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCode className="h-3.5 w-3.5" />
            模板配置
          </button>
          <button
            onClick={() => setTab("url")}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${
              tab === "url" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            网络导入
          </button>
          <button
            onClick={() => setTab("file")}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${
              tab === "file" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            本地文件
          </button>
        </div>

        {tab === "blank" && (
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                项目名称 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="例如: my_project (将作为专属目录名)"
                className="w-full text-sm px-3 py-1.5 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                value={blankProject}
                onChange={(e) => setBlankProject(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                配置文件名 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className="w-full text-sm px-3 py-1.5 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                value={blankFileName}
                onChange={(e) => setBlankFileName(e.target.value)}
              />
            </div>

            <div className="p-2.5 rounded-md bg-muted/40 text-[11px] text-muted-foreground border border-border/40 font-mono break-all mt-2">
              <span className="font-semibold text-foreground">目标物理路径:</span><br />
              {rootSaveDir}/<span className="text-primary">{blankProject || "<项目名称>"}</span>/<span className="text-blue-500">{blankFileName || "tvbox.json"}</span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={onClose}>取消</Button>
              <Button
                variant="primary"
                disabled={!blankProject.trim() || !blankFileName.trim()}
                onClick={() => {
                  let f = blankFileName.trim();
                  if (!f.endsWith(".json")) f += ".json";
                  const p = blankProject.trim();
                  onCreateBlank(p, `${rootSaveDir}/${p}/${f}`, "empty");
                  onClose();
                }}
              >
                创建空白配置
              </Button>
            </div>
          </div>
        )}

        {tab === "template" && (
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">模板类型</label>
              <div className="flex gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="templateType"
                    checked={templateType === "fongmi"}
                    onChange={() => setTemplateType("fongmi")}
                    className="accent-primary"
                  />
                  FongMi (蜂蜜) 格式
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-sm ml-4">
                  <input
                    type="radio"
                    name="templateType"
                    checked={templateType === "catbox"}
                    onChange={() => setTemplateType("catbox")}
                    className="accent-primary"
                  />
                  CatBox (猫影视) 格式
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                项目名称 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="例如: fongmi_box"
                className="w-full text-sm px-3 py-1.5 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                value={templateProject}
                onChange={(e) => setTemplateProject(e.target.value)}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                配置文件名 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className="w-full text-sm px-3 py-1.5 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                value={templateFileName}
                onChange={(e) => setTemplateFileName(e.target.value)}
              />
            </div>

            <div className="p-2.5 rounded-md bg-muted/40 text-[11px] text-muted-foreground border border-border/40 font-mono break-all mt-2">
              <span className="font-semibold text-foreground">目标物理路径:</span><br />
              {rootSaveDir}/<span className="text-primary">{templateProject || "<项目名称>"}</span>/<span className="text-blue-500">{templateFileName || "tvbox.json"}</span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={onClose}>取消</Button>
              <Button
                variant="primary"
                disabled={!templateProject.trim() || !templateFileName.trim()}
                onClick={() => {
                  let f = templateFileName.trim();
                  if (!f.endsWith(".json")) f += ".json";
                  const p = templateProject.trim();
                  onCreateBlank(p, `${rootSaveDir}/${p}/${f}`, templateType);
                  onClose();
                }}
              >
                生成模板配置
              </Button>
            </div>
          </div>
        )}

        {tab === "url" && (
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">TVBox 订阅 URL *</label>
              <input
                type="text"
                className="w-full text-sm px-3 py-1.5 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/tvbox.json"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                项目名称 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="例如: remote_box"
                className="w-full text-sm px-3 py-1.5 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                value={urlProject}
                onChange={(e) => setUrlProject(e.target.value)}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                配置文件名 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className="w-full text-sm px-3 py-1.5 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                value={urlFileName}
                onChange={(e) => setUrlFileName(e.target.value)}
              />
            </div>

            <div className="p-2.5 rounded-md bg-muted/40 text-[11px] text-muted-foreground border border-border/40 font-mono break-all mt-2">
              <span className="font-semibold text-foreground">目标物理路径:</span><br />
              {rootSaveDir}/<span className="text-primary">{urlProject || "<项目名称>"}</span>/<span className="text-blue-500">{urlFileName || "tvbox.json"}</span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={onClose}>取消</Button>
              <Button
                variant="primary"
                disabled={!urlInput.trim() || !urlProject.trim() || !urlFileName.trim()}
                onClick={() => {
                  let f = urlFileName.trim();
                  if (!f.endsWith(".json")) f += ".json";
                  const p = urlProject.trim();
                  const targetPath = `${rootSaveDir}/${p}/${f}`;
                  onImportUrl(urlInput.trim(), p, targetPath);
                  onClose();
                }}
              >
                导入并新建项目
              </Button>
            </div>
          </div>
        )}

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
