"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { revokeLinkAction } from "@/app/acheteur/(protected)/fournisseurs/actions";

export function RevokeLinkButton({
  magicLinkId,
  redirectPath,
  label,
}: {
  magicLinkId: string;
  redirectPath: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await revokeLinkAction(magicLinkId, redirectPath);
      router.refresh();
    });
  }

  return (
    <Button variant="ghost" size="icon-sm" onClick={handleClick} disabled={pending} title={label}>
      <X className="size-3.5" />
    </Button>
  );
}
