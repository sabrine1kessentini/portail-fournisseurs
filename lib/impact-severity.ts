import type { StatusTone } from "./status-color";

/** Maps a schedule slip (in days, from the existing computeDelayDays) to a severity tone. */
export function impactSeverityTone(days: number): StatusTone {
  if (days <= 0) return "success";
  if (days <= 2) return "warning";
  return "danger";
}
