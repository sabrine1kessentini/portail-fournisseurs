import { Badge } from "@/components/ui/badge";
import { computeDelayDays } from "@/lib/impact";
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
    return <Badge variant="secondary">{dict.buyerDashboard.impactNone}</Badge>;
  }

  const label = days > 0 ? dict.buyerDashboard.impactDelay : dict.buyerDashboard.impactEarly;

  return (
    <Badge variant={days > 0 ? "destructive" : "secondary"}>
      {label.replace("{days}", String(Math.abs(days)))}
    </Badge>
  );
}
