import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { StatusTone } from "@/lib/status-color";

const toneClasses: Record<StatusTone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/10 text-destructive",
  neutral: "bg-secondary text-secondary-foreground",
};

/**
 * Thin wrapper over the base Badge that maps a semantic StatusTone to
 * consistent colors, so every status pill in the app (line status, document
 * status, disputes count...) reads the same way instead of each screen
 * picking its own destructive/secondary ternary.
 */
export function StatusBadge({
  tone,
  className,
  children,
}: {
  tone: StatusTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Badge variant="outline" className={cn("border-transparent", toneClasses[tone], className)}>
      {children}
    </Badge>
  );
}
