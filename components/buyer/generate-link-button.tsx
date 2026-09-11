"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link2 } from "lucide-react";
import { generateAndSendLinkAction } from "@/app/acheteur/(protected)/fournisseurs/actions";

export function GenerateLinkButton({
  supplierId,
  orderId,
  label,
  copiedLabel,
}: {
  supplierId: string;
  orderId?: string;
  label: string;
  copiedLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const { magicLinkUrl, error } = await generateAndSendLinkAction({ supplierId, orderId });

      if (!magicLinkUrl) {
        toast.error(error ?? "Une erreur est survenue.");
        return;
      }

      // Toujours afficher le lien à l'écran (pas seulement le copier) : sur le
      // domaine d'envoi de test Resend, l'email n'arrive que si l'adresse du
      // fournisseur correspond au compte Resend — le lien reste donc la seule
      // façon fiable de le récupérer en démo/test.
      try {
        await navigator.clipboard.writeText(magicLinkUrl);
      } catch {
        // presse-papiers indisponible (ex: contexte non sécurisé) — sans impact,
        // le lien est affiché ci-dessous dans tous les cas.
      }
      toast.success(copiedLabel, {
        description: magicLinkUrl,
        duration: 15000,
      });
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" className="w-full" onClick={handleClick} disabled={pending}>
      <Link2 className="mr-1.5 size-4" />
      {label}
    </Button>
  );
}
