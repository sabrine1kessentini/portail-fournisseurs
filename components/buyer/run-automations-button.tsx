"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { runAutomationsNowAction } from "@/app/acheteur/(protected)/actions";

export function RunAutomationsButton({ isFr }: { isFr: boolean }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await runAutomationsNowAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        isFr
          ? "Relances exécutées"
          : "Reminders executed",
        {
          description: isFr
            ? `${result.relancesLiens} relance(s) de lien, ${result.relancesDocuments} relance(s) document, ${result.escalades} escalade(s), ${result.lignesBloquees} nouvelle(s) ligne(s) bloquée(s).`
            : `${result.relancesLiens} link reminder(s), ${result.relancesDocuments} document reminder(s), ${result.escalades} escalation(s), ${result.lignesBloquees} newly blocked line(s).`,
          duration: 8000,
        }
      );
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      <Zap className="mr-1.5 size-4" />
      {isFr ? "Exécuter les relances maintenant" : "Run reminders now"}
    </Button>
  );
}
