"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markReceivedAction } from "./actions";

export function ReceiveLineButton({
  lineId,
  orderId,
  isFr,
}: {
  lineId: string;
  orderId: string;
  isFr: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await markReceivedAction(lineId, orderId);
      router.refresh();
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick} disabled={pending}>
      {isFr ? "Marquer reçu" : "Mark received"}
    </Button>
  );
}
