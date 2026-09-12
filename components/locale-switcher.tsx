"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchLocaleAction } from "@/app/actions/session";
import type { AppLocale } from "@/lib/i18n/dictionaries";

const OPTIONS: AppLocale[] = ["fr", "en"];

export function LocaleSwitcher({ current }: { current: AppLocale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(next: AppLocale) {
    if (next === current || pending) return;
    startTransition(async () => {
      await switchLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-0.5 rounded-full bg-muted p-0.5">
      {OPTIONS.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => setLocale(locale)}
          disabled={pending}
          className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-medium uppercase transition-colors ${
            current === locale
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
