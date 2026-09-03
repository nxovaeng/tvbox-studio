import React, { useState } from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useTvBoxStore, useUIStore, usePublishStore, useServerStore } from "../../store";
import { r2Test, r2UploadText, getLanIps, serverCache } from "../../lib/tauri";
import { encodeConfig } from "../../lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { Upload, Wifi, Shield, Copy, Server, Check } from "lucide-react";

interface Props { open: boolean; onClose: () => void; }

export function PublishDialog({ open, onClose }: Props) {
  const { getJson, source } = useTvBoxStore();
  const { addToast } = useUIStore();
  const { config, setConfig, setPublishing, publishing, lastPublish, setLastPublish } = usePublishStore();
  const { status, setStatus } = useServerStore();

  const [tab, setTab] = useState<"r2" | "local" | "encrypt">("r2");
  const [r2Form, setR2Form] = useState(config ?? {
    account_id: "", access_key_id: "", secret_access_key: "", bucket_name: "", public_domain: "",
  });
  const [publishedUrl, setPublishedUrl] = useState(lastPublish?.url ?? "");
  const [encryptedBlob, setEncryptedBlob] = useState<Blob | null>(null);
  const [lanIps, setLanIps] = useState<string[]>(status.lanIps);

  const json = getJson();

  const handleR2Test = async () => {
    try {
      await r2Test(r2Form);
      addToast({ type: "success", message: "R2 连接测试成功！" });
    } catch (e) {
      addToast({ type: "error", message: `R2 连接失败: ${e}` });
    }
  };

  const handleR2Publish = async () => {
    if (!json) return;
    setPublishing(true);
    setConfig(r2Form);
    try {
      const result = await r2UploadText(r2Form, "tvbox.json", json, "application/json; charset=utf-8");
      if (result.success && result.url) {
        setPublishedUrl(result.url);
        setLastPublish(result.url);
        addToast({ type: "success", message: "发布成功！" });
      } else {
        addToast({ type: "error", message: `发布失败: ${result.message}` });
      }
    } catch (e) {
      addToast({ type: "error", message: `发布失败: ${e}` });
    } finally {
      setPublishing(false);
    }
  };

  const handleLocalPublish = async () => {
    if (!json) return;
    await serverCache("tvbox", json);
    const ips = await getLanIps();
    setLanIps(ips);
    setStatus({ running: true, lanIps: ips, port: 8090 });
    const localUrl = `http://${ips[0] ?? "127.0.0.1"}:8090/tvbox.json`;
    setPublishedUrl(localUrl);
    addToast({ type: "success", message: "已推送到本地服务器" });
  };

  const handleEncrypt = () => {
    if (!json) return;
    const data = encodeConfig(json);
    const blob = new Blob([data], { type: "image/png" });
    setEncryptedBlob(blob);
  };

  const handleDownloadEncrypted = () => {
    if (!encryptedBlob) return;
    const url = URL.createObjectURL(encryptedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tvbox_config.png";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(publishedUrl);
    addToast({ type: "success", message: "已复制链接" });
  };

  return (
    <Dialog open={open} onClose={onClose} title="发布配置" description="将配置发布到云端或局域网供 TVBox 订阅" size="lg">
      <div className="flex flex-col gap-4 p-4">
        {/* Tab 切换 */}
        <div className="flex gap-1 bg-muted rounded-md p-1">
          {[
            { id: "r2", label: "Cloudflare R2", icon: Upload },
            { id: "local", label: "局域网共享", icon: Wifi },
            { id: "encrypt", label: "PNG加密导出", icon: Shield },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as typeof tab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-sm transition-colors ${
                tab === id ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* R2 上传 */}
        {tab === "r2" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Account ID</label>
                <Input value={r2Form.account_id}
                  onChange={(e) => setR2Form({ ...r2Form, account_id: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Bucket Name</label>
                <Input value={r2Form.bucket_name}
                  onChange={(e) => setR2Form({ ...r2Form, bucket_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Access Key ID</label>
                <Input value={r2Form.access_key_id}
                  onChange={(e) => setR2Form({ ...r2Form, access_key_id: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Secret Access Key</label>
                <Input type="password" value={r2Form.secret_access_key}
                  onChange={(e) => setR2Form({ ...r2Form, secret_access_key: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-medium text-muted-foreground">自定义域名（可选）</label>
                <Input value={r2Form.public_domain ?? ""}
                  onChange={(e) => setR2Form({ ...r2Form, public_domain: e.target.value })}
                  placeholder="https://your-domain.com 或留空使用 R2.dev" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleR2Test}>测试连接</Button>
              <Button variant="primary" loading={publishing}
                onClick={handleR2Publish}
                icon={<Upload className="h-3.5 w-3.5" />}>
                发布到 R2
              </Button>
            </div>
          </div>
        )}

        {/* 局域网共享 */}
        {tab === "local" && (
          <div className="space-y-3">
            <div className="bg-muted/40 rounded-md p-3 text-sm space-y-1.5">
              <p className="font-medium">本地 HTTP 服务</p>
              <p className="text-muted-foreground text-xs">
                应用内置了 HTTP 服务（端口 {status.port}），推送配置后局域网内设备可直接订阅
              </p>
              {lanIps.length > 0 && (
                <div className="space-y-1 mt-2">
                  {lanIps.map((ip) => (
                    <div key={ip} className="flex items-center gap-2 text-xs font-mono">
                      <Server className="h-3 w-3 text-green-500" />
                      <span>http://{ip}:{status.port}/tvbox.json</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button variant="primary" onClick={handleLocalPublish}
              icon={<Wifi className="h-3.5 w-3.5" />}>
              推送到本地服务器
            </Button>
          </div>
        )}

        {/* PNG 加密 */}
        {tab === "encrypt" && (
          <div className="space-y-3">
            <div className="bg-muted/40 rounded-md p-3 text-sm text-muted-foreground">
              <p>将 JSON 配置加密隐写到 PNG 图片中，TVBox 可直接加载此图片 URL 作为配置源。</p>
              <p className="mt-1 text-xs">原理：JSON 内容 base64 编码后附加在 PNG 文件尾部。</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleEncrypt}
                icon={<Shield className="h-3.5 w-3.5" />}>
                生成加密 PNG
              </Button>
              {encryptedBlob && (
                <Button variant="primary" onClick={handleDownloadEncrypted}>
                  下载 PNG
                </Button>
              )}
            </div>
            {encryptedBlob && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                加密成功！将此 PNG 上传到图床后，把 URL 填入 TVBox 配置源即可。
              </p>
            )}
          </div>
        )}

        {/* 已发布 URL + 二维码 */}
        {publishedUrl && (
          <div className="border border-border rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">已发布地址</span>
              <div className="flex-1 flex items-center gap-1">
                <Input value={publishedUrl} readOnly className="text-xs font-mono h-7" />
                <Button variant="outline" size="icon" onClick={copyUrl}
                  icon={<Copy className="h-3.5 w-3.5" />} />
              </div>
            </div>
            <div className="flex justify-center">
              <div className="p-2 bg-white rounded-lg">
                <QRCodeSVG value={publishedUrl} size={140} />
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">用 TVBox 扫码订阅</p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
