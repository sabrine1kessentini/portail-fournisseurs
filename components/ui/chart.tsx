"use client";

import * as React from "react";
import { ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { cn } from "cn";

export type ChartConfig = Record<
  string,
  {
    label: React.ReactNode;
    color?: string;
  }
>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error("Chart components must be used within a <ChartContainer>");
  return ctx;
}

/**
 * Minimal shadcn-style Recharts wrapper: provides the chart's color config
 * via CSS variables (--color-{key}) scoped to the container, so series can
 * reference `var(--color-onTime)` etc. instead of hardcoding hex/oklch
 * values inside chart JSX.
 */
export function ChartContainer({
  id,
  config,
  className,
  children,
}: {
  id: string;
  config: ChartConfig;
  className?: string;
  children: React.ReactElement;
}) {
  const style = Object.fromEntries(
    Object.entries(config)
      .filter(([, v]) => v.color)
      .map(([key, v]) => [`--color-${key}`, v.color])
  ) as React.CSSProperties;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={id}
        className={cn("h-full w-full text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground", className)}
        style={style}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = RechartsTooltip;

export function ChartTooltipContent({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string; dataKey?: string | number }>;
  label?: React.ReactNode;
  formatter?: (value: number | string, name: string) => React.ReactNode;
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-none ring-1 ring-foreground/10">
      {label !== undefined && <p className="mb-1 font-medium">{label}</p>}
      <div className="space-y-1">
        {payload.map((item, i) => {
          const key = String(item.dataKey ?? item.name ?? i);
          const entryConfig = config[key];
          return (
            <div key={key} className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-[2px]"
                style={{ background: item.color }}
              />
              <span className="text-muted-foreground">{entryConfig?.label ?? item.name}</span>
              <span className="ml-auto font-medium tabular-nums">
                {item.value !== undefined
                  ? (formatter?.(item.value, key) ?? item.value)
                  : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
