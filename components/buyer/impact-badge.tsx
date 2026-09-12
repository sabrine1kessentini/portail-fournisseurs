import { StatusBadge } from "@/components/ui/status-badge";
import { computeDelayDays } from "@/lib/impact";
import { impactSeverityTone } from "@/lib/impact-severity";
import type { getDictionary } from "@/lib/i18n/dictionaries";

export function ImpactBadge({
  oldIso,
  newIso,
  dict,
}: {
  oldIso: string;
  newIso: string;
  dict: ReturnType<typeof getDictionary>;
}) {
  const days = computeDelayDays(oldIso, newIso);

  if (days === 0) {
    return <StatusBadge tone="success">{dict.buyerDashboard.impactNone}</StatusBadge>;
  }

  const label = days > 0 ? dict.buyerDashboard.impactDelay : dict.buyerDashboard.impactEarly;

  return (
    <StatusBadge tone={impactSeverityTone(days)}>
      {label.replace("{days}", String(Math.abs(days)))}
    </StatusBadge>
  );
}
