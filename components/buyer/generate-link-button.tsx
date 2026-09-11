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
      const { magicLinkUrl } = await generateAndSendLinkAction({ supplierId, orderId });
      try {
        await navigator.clipboard.writeText(magicLinkUrl);
        toast.success(copiedLabel);
      } catch {
        toast.success(magicLinkUrl);
      }
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
