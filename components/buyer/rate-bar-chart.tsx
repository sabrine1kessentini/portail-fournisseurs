"use client";

import { BarChart, Bar, XAxis, YAxis, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

/** Small horizontal bar comparing on-time vs compliance rate for one supplier (both 0..1, from getSupplierScorecard). Renders nothing if both are null (no evaluable line yet). */
export function RateBarChart({
  onTimeRate,
  complianceRate,
  onTimeLabel,
  complianceLabel,
}: {
  onTimeRate: number | null;
  complianceRate: number | null;
  onTimeLabel: string;
  complianceLabel: string;
}) {
  if (onTimeRate === null && complianceRate === null) return null;

  const data = [
    { key: "onTime", label: onTimeLabel, value: Math.round((onTimeRate ?? 0) * 100) },
    { key: "compliance", label: complianceLabel, value: Math.round((complianceRate ?? 0) * 100) },
  ];

  const config: ChartConfig = {
    onTime: { label: onTimeLabel, color: "var(--chart-1)" },
    compliance: { label: complianceLabel, color: "var(--chart-2)" },
  };

  return (
    <ChartContainer id="rate-bar" config={config} className="h-20">
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24, top: 2, bottom: 2 }}>
        <XAxis type="number" hide domain={[0, 100]} />
        <YAxis type="category" dataKey="label" width={90} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${v}%`} />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="value" radius={4} barSize={14}>
          <Cell fill="var(--chart-1)" />
          <Cell fill="var(--chart-2)" />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
