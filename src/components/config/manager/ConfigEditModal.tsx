import { useState, useEffect } from "react";
import type { ConfigCard } from "../../../store";
import { Dialog } from "../../ui/Dialog";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { X, Plus, Tag } from "lucide-react";

interface Props {
  open: boolean;
  card: ConfigCard | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<ConfigCard>) => void;
}

export function ConfigEditModal({ open, card, onClose, onSave }: Props) {
  const [projectName, setProjectName] = useState("");
  const [defaultConfig, setDefaultConfig] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (card) {
      setProjectName(card.projectName);
      setDefaultConfig(card.defaultConfig);
      setDescription(card.description || "");
      setTags(card.tags || []);
    }
  }, [card]);

  if (!card) return null;

  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = () => {
    
    onSave(card.id, {
      
      description: description.trim(),
      tags,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="编辑配置信息" size="md">
      <div className="space-y-4 p-1">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">项目名称 (只读)</label>
          <Input
            value={projectName}
            readOnly
            
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">默认配置文件 (只读)</label>
          <Input
            value={defaultConfig}
            readOnly
            placeholder="例如: https://... 或 file://..."
            className="font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">备注描述</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例如: 包含常用点播和体育直播，备用线路"
          />
        </div>

        {/* 标签分类 */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1">
            <Tag className="h-3 w-3" /> 分类标签
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-muted text-foreground border border-border"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-destructive text-muted-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
              placeholder="输入新标签后回车或点击添加 (如: 4K、动漫、家庭)"
              className="text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddTag}
              icon={<Plus className="h-3.5 w-3.5" />}
            >
              添加
            </Button>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border mt-4">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" onClick={handleSave}>
            保存修改
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

