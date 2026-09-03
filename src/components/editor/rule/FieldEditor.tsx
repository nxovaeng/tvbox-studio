/**
 * 图形化规则编辑器 - 通用字段行组件
 * 每个字段包含：输入框 + 变量插入按钮 + 测试按钮
 */
import React, { useState } from "react";
import { Input } from "../../ui/Input";
import { Textarea } from "../../ui/Input";
import { Button } from "../../ui/Button";
import { Badge } from "../../ui/Badge";
import type { FieldDef } from "../../../types/tvbox";
import { ChevronDown, FlaskConical, Lightbulb } from "lucide-react";
import { cn } from "../../../lib/utils";
import { getContent } from "../../../lib/tauri";
import { extractByRule } from "../../../lib/utils";

interface Props {
  field: FieldDef;
  value: string;
  onChange: (val: string) => void;
  testUrl?: string;
  testHtml?: string;
}

export function FieldRow({ field, value, onChange, testUrl, testHtml }: Props) {
  const [showVars, setShowVars] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const insertVar = (v: string) => {
    onChange(value + v);
    setShowVars(false);
  };

  const handleTest = async () => {
    if (!value.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      let html = testHtml;
      if (!html && testUrl) {
        html = await getContent(testUrl);
      }
      if (html) {
        const result = extractByRule(html, value);
        setTestResult(result || "(无匹配结果)");
      } else {
        setTestResult("请先设置测试 URL 或 HTML 内容");
      }
    } catch (e) {
      setTestResult(`错误: ${e}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="field-row">
      <label className="field-label" title={field.id}>
        {field.key}
        {field.isAdvanced && (
          <span className="ml-1 text-[10px] text-muted-foreground">(高级)</span>
        )}
      </label>

      <div className="field-input space-y-1">
        <div className="flex gap-1">
          {field.type === "textarea" ? (
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
              rows={field.rows ?? 3}
              className="flex-1 text-xs font-mono"
            />
          ) : (
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
              className="flex-1 text-xs font-mono h-7"
            />
          )}

          {/* 变量插入按钮 */}
          {field.var_btn && (
            <div className="relative">
              <Button
                variant="outline" size="icon"
                className="h-7 w-7"
                title="插入变量"
                onClick={() => setShowVars(!showVars)}
                icon={<ChevronDown className="h-3 w-3" />}
              />
              {showVars && (
                <div className="absolute right-0 top-8 z-20 bg-popover border border-border rounded-lg shadow-lg p-2 min-w-48 max-w-xs">
                  <div className="text-xs text-muted-foreground mb-1.5 px-1">可用变量</div>
                  <div className="flex flex-wrap gap-1">
                    {field.var_btn.vars.map((v) => (
                      <button
                        key={v}
                        onClick={() => insertVar(v)}
                        className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors font-mono"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  {field.var_btn.tips && field.var_btn.tips.length > 0 && (
                    <div className="mt-2 border-t border-border pt-2 space-y-1">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Lightbulb className="h-3 w-3" /> 示例
                      </div>
                      {field.var_btn.tips.map((tip, i) => (
                        <button
                          key={i}
                          onClick={() => { onChange(tip); setShowVars(false); }}
                          className="text-xs text-left w-full px-1 py-0.5 text-muted-foreground hover:text-foreground truncate"
                          title={tip}
                        >
                          {tip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 测试按钮 */}
          {field.test_btn && (
            <Button
              variant="outline" size="icon"
              className="h-7 w-7"
              loading={testing}
              title="测试此规则"
              onClick={handleTest}
              icon={<FlaskConical className="h-3 w-3" />}
            />
          )}
        </div>

        {/* 测试结果 */}
        {testResult !== null && (
          <div className={cn(
            "text-xs px-2 py-1.5 rounded border font-mono break-all",
            testResult.startsWith("错误")
              ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-400"
              : "bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-400"
          )}>
            {testResult}
          </div>
        )}
      </div>
    </div>
  );
}
