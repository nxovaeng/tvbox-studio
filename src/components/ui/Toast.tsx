import { useUIStore } from "../../store";
import { cn } from "../../lib/utils";
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

const icons = {
  success: <CheckCircle className="h-4 w-4 text-green-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />,
  info: <Info className="h-4 w-4 text-blue-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
};

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "toast-enter pointer-events-auto flex items-center gap-2 px-3 py-2.5 rounded-lg shadow-lg border",
            "bg-card text-card-foreground border-border min-w-[240px] max-w-sm text-sm"
          )}
        >
          {icons[t.type]}
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
