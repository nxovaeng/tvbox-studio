import { Dialog } from "./Dialog";
import { Keyboard } from "lucide-react";

interface Props { open: boolean; onClose: () => void; }

const SHORTCUTS = [
  {
    section: "导航",
    items: [
      { keys: ["Ctrl", "1"], desc: "切换到配置管理" },
      { keys: ["Ctrl", "2"], desc: "切换到直播源" },
      { keys: ["Ctrl", "3"], desc: "切换到代码编辑器" },
      { keys: ["Ctrl", ","], desc: "打开设置" },
    ],
  },
  {
    section: "配置管理",
    items: [
      { keys: ["Enter"], desc: "加载配置（URL 输入框中）" },
      { keys: ["Ctrl", "S"], desc: "保存到本地文件" },
      { keys: ["Ctrl", "Shift", "S"], desc: "发布到云端" },
      { keys: ["Ctrl", "F"], desc: "搜索规则" },
    ],
  },
  {
    section: "代码编辑器",
    items: [
      { keys: ["Alt", "Shift", "F"], desc: "格式化代码" },
      { keys: ["Ctrl", "S"], desc: "保存文件" },
      { keys: ["Ctrl", "Z"], desc: "撤销" },
      { keys: ["Ctrl", "Shift", "Z"], desc: "重做" },
    ],
  },
  {
    section: "通用",
    items: [
      { keys: ["Esc"], desc: "关闭弹窗" },
      { keys: ["?"], desc: "显示快捷键帮助" },
    ],
  },
];

export function KeyboardShortcutsDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title="键盘快捷键" size="md">
      <div className="p-4 space-y-4">
        {SHORTCUTS.map((section) => (
          <div key={section.section}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {section.section}
            </h3>
            <div className="space-y-1.5">
              {section.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm">{item.desc}</span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((k, ki) => (
                      <span key={ki}>
                        <kbd className="px-1.5 py-0.5 text-xs bg-muted border border-border rounded font-mono">
                          {k}
                        </kbd>
                        {ki < item.keys.length - 1 && (
                          <span className="text-muted-foreground text-xs mx-0.5">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
}

/** 快捷键触发按钮（放在界面角落） */
export function ShortcutsHint({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-card border border-border rounded-full px-3 py-1 shadow-sm opacity-60 hover:opacity-100"
      title="快捷键帮助"
    >
      <Keyboard className="h-3 w-3" />
      <kbd className="font-mono">?</kbd> 快捷键
    </button>
  );
}
