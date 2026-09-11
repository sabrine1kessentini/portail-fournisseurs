"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Ban } from "lucide-react";
import { cancelOrderAction } from "./actions";

export function CancelOrderButton({ orderId, isFr }: { orderId: string; isFr: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(isFr ? "Annuler cette commande ?" : "Cancel this order?")) return;
    startTransition(async () => {
      await cancelOrderAction(orderId);
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      <Ban className="mr-1.5 size-4" />
      {isFr ? "Annuler la commande" : "Cancel order"}
    </Button>
  );
}
