"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchLocaleAction } from "@/app/actions/session";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n/dictionaries";

export function LocaleSwitcher({ current }: { current: AppLocale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next: AppLocale = current === "fr" ? "en" : "fr";
    startTransition(async () => {
      await switchLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggle} disabled={pending}>
      {current === "fr" ? "EN" : "FR"}
    </Button>
  );
}
