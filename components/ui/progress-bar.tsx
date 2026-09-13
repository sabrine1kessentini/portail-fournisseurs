import { cn } from "cn";
import type { StatusTone } from "@/lib/status-color";

const TONE_BG: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  neutral: "bg-muted-foreground/30",
};

/** `value` is a 0..1 proportion. */
export function ProgressBar({ value, tone }: { value: number; tone: StatusTone }) {
  const width = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full", TONE_BG[tone])} style={{ width: `${width}%` }} />
    </div>
  );
}
