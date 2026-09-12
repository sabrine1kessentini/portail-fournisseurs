import { requireSupplierSession } from "@/lib/auth/guards";
import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSupplierSession();
  const locale = await resolveLocale();
  const d = getDictionary(locale);

  return (
    <div className="min-h-svh bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              {d.common.appName}
            </p>
            <p className="text-lg font-semibold tracking-tight">
              {d.supplierPortal.welcome}, {session.supplierName}
            </p>
          </div>
          <LocaleSwitcher current={locale} />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
