"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { UrgencyBucket } from "@/lib/dashboard-metrics";
import type { StatusTone } from "@/lib/status-color";

const toneChartVar: Record<StatusTone, string> = {
  success: "var(--chart-2)",
  warning: "var(--chart-3)",
  danger: "var(--chart-4)",
  neutral: "var(--chart-5)",
};

/** Small horizontal bar per document-urgency bucket (J-15 / J-5 / expired), colored by severity. */
export function DocumentUrgencyChart({ data }: { data: UrgencyBucket[] }) {
  const config: ChartConfig = Object.fromEntries(
    data.map((bucket) => [bucket.key, { label: bucket.label, color: toneChartVar[bucket.tone] }])
  );

  return (
    <ChartContainer id="document-urgency" config={config} className="h-40">
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey="label" width={110} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="count" radius={4} barSize={18}>
          {data.map((bucket) => (
            <Cell key={bucket.key} fill={toneChartVar[bucket.tone]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
