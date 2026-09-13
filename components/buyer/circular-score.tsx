import { cn } from "cn";
import type { StatusTone } from "@/lib/status-color";

const TONE_STROKE: Record<StatusTone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  neutral: "text-muted-foreground",
};

/** Ring gauge for a single 0..1 rate (or "—" when null — no evaluable line yet). */
export function CircularScore({
  value,
  tone,
  size = 56,
  strokeWidth = 5,
}: {
  value: number | null;
  tone: StatusTone;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = value === null ? 0 : Math.max(0, Math.min(1, value));
  const offset = circumference * (1 - fraction);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {value !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn(TONE_STROKE[tone])}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-semibold tabular-nums">
        {value === null ? "—" : `${Math.round(value * 100)}%`}
      </span>
    </div>
  );
}
