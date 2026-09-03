import { cn } from "../../lib/utils";

interface ProgressBarProps {
  value: number;   // 0-100
  max?: number;
  label?: string;
  className?: string;
  size?: "sm" | "md";
  variant?: "default" | "success" | "warning";
}

export function ProgressBar({ value, max = 100, label, className, size = "sm", variant = "default" }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const colors = {
    default: "bg-primary",
    success: "bg-green-500",
    warning: "bg-yellow-500",
  };
  const heights = { sm: "h-1.5", md: "h-2.5" };

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{label}</span>
          <span>{value}/{max}</span>
        </div>
      )}
      <div className={cn("w-full bg-muted rounded-full overflow-hidden", heights[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-300", colors[variant])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** 全屏检测进度覆盖层 */
export function CheckingOverlay({
  done, total, label, onCancel,
}: { done: number; total: number; label?: string; onCancel?: () => void }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const variant = pct === 100 ? "success" : "default";

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm gap-4">
      <div className="bg-card border border-border rounded-xl shadow-lg px-8 py-6 w-72 space-y-4">
        <div className="text-center">
          <p className="font-medium text-sm">{label ?? "连通性检测中..."}</p>
          <p className="text-2xl font-bold text-primary mt-1">{pct}%</p>
          <p className="text-xs text-muted-foreground">{done} / {total}</p>
        </div>
        <ProgressBar value={done} max={total} size="md" variant={variant} />
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            取消
          </button>
        )}
      </div>
    </div>
  );
}
