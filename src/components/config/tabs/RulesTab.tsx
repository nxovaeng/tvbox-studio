import React, { useState } from "react";
import { useTvBoxStore, useUIStore } from "../../../store";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Textarea } from "../../ui/Input";
import { Dialog } from "../../ui/Dialog";
import { Plus, Trash2, Edit3 } from "lucide-react";
import type { TvBoxRule } from "../../../types/tvbox";

export function RulesTab() {
  const { source, updateSource } = useTvBoxStore();
  const { addToast } = useUIStore();
  const [editRule, setEditRule] = useState<{ rule: TvBoxRule; index: number } | null>(null);

  const rules = source?.rules ?? [];

  const handleRemove = (i: number) => {
    updateSource({ rules: rules.filter((_, idx) => idx !== i) });
  };

  const handleSave = (rule: TvBoxRule, index: number) => {
    if (index === -1) {
      updateSource({ rules: [...rules, rule] });
    } else {
      const updated = rules.map((r, i) => (i === index ? rule : r));
      updateSource({ rules: updated });
    }
    addToast({ type: "success", message: "已保存" });
    setEditRule(null);
  };

  const ruleHost = (r: TvBoxRule) => r.host ?? r.hosts?.[0] ?? "(无主机)";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0 bg-background">
        <span className="text-sm text-muted-foreground">{rules.length} 条提取规则</span>
        <div className="ml-auto">
          <Button variant="outline" size="sm" icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setEditRule({ rule: { hosts: [], regex: [], rule: [] }, index: -1 })}>
            新增
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="divide-y divide-border">
          {rules.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              暂无提取规则
            </div>
          ) : (
            rules.map((rule, i) => (
              <div key={i} className="group flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{rule.name ?? ruleHost(rule)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {[...(rule.hosts ?? []), ...(rule.regex ?? [])].slice(0, 3).join(" · ")}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  <Button variant="ghost" size="icon" onClick={() => setEditRule({ rule, index: i })}>
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleRemove(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {editRule && (
        <Dialog open title={editRule.index === -1 ? "新增提取规则" : "编辑提取规则"}
          onClose={() => setEditRule(null)} size="md">
          <RuleForm rule={editRule.rule}
            onSave={(r) => handleSave(r, editRule.index)}
            onCancel={() => setEditRule(null)} />
        </Dialog>
      )}
    </div>
  );
}

function RuleForm({ rule, onSave, onCancel }: {
  rule: TvBoxRule; onSave: (r: TvBoxRule) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: rule.name ?? "",
    host: rule.host ?? "",
    hosts: (rule.hosts ?? []).join("\n"),
    regex: (rule.regex ?? []).join("\n"),
    rule: (rule.rule ?? []).join("\n"),
  });

  const save = () => {
    const r: TvBoxRule = {};
    if (form.name.trim()) r.name = form.name.trim();
    if (form.host.trim()) r.host = form.host.trim();
    const hosts = form.hosts.split("\n").map((l) => l.trim()).filter(Boolean);
    if (hosts.length) r.hosts = hosts;
    const regex = form.regex.split("\n").map((l) => l.trim()).filter(Boolean);
    if (regex.length) r.regex = regex;
    const rules = form.rule.split("\n").map((l) => l.trim()).filter(Boolean);
    if (rules.length) r.rule = rules;
    onSave(r);
  };

  return (
    <div className="space-y-3 p-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">规则名称（可选）</label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">单个主机</label>
        <Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })}
          placeholder="example.com" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">多个主机（每行一个）</label>
        <Textarea rows={3} value={form.hosts}
          onChange={(e) => setForm({ ...form, hosts: e.target.value })}
          placeholder="example.com&#10;another.com" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">正则表达式（每行一个）</label>
        <Textarea rows={3} value={form.regex}
          onChange={(e) => setForm({ ...form, regex: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">提取规则（每行一个）</label>
        <Textarea rows={3} value={form.rule}
          onChange={(e) => setForm({ ...form, rule: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button variant="primary" onClick={save}>保存</Button>
      </div>
    </div>
  );
}
