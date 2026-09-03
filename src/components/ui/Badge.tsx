import * as React from "react";
import { cn } from "../../lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "error" | "outline";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-primary/10 text-primary border-primary/20",
  success: "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400",
  warning: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400",
  error: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
  outline: "bg-transparent border-border text-foreground",
};

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/** 连通性状态点 */
export function StatusDot({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    online: "bg-green-500",
    offline: "bg-red-500",
    checking: "bg-yellow-400 animate-pulse",
    unknown: "bg-gray-400",
  };
  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full flex-shrink-0",
        colors[status ?? "unknown"]
      )}
    />
  );
}
