import { Button } from "@/components/ui/button";
import { validateDiffAction } from "@/app/acheteur/(protected)/commandes/[id]/actions";
import type { getDictionary } from "@/lib/i18n/dictionaries";

export function DiffDecisionForm({
  historyId,
  dict,
}: {
  historyId: string;
  dict: ReturnType<typeof getDictionary>;
}) {
  return (
    <div className="flex flex-col gap-2 self-start">
      <form action={validateDiffAction}>
        <input type="hidden" name="historyId" value={historyId} />
        <input type="hidden" name="decision" value="approved" />
        <Button
          type="submit"
          size="sm"
          className="w-full bg-success text-success-foreground hover:bg-success/90"
        >
          {dict.buyerDashboard.validateChange}
        </Button>
      </form>
      <form action={validateDiffAction}>
        <input type="hidden" name="historyId" value={historyId} />
        <input type="hidden" name="decision" value="rejected" />
        <Button type="submit" size="sm" variant="outline" className="w-full">
          {dict.buyerDashboard.rejectChange}
        </Button>
      </form>
    </div>
  );
}
