import { requireBuyer } from "@/lib/auth/guards";
import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { BuyerSidebar, BuyerMobileNav } from "@/components/buyer/buyer-nav";
import { Button } from "@/components/ui/button";
import { logoutBuyerAction } from "@/app/actions/session";
import { LogOut } from "lucide-react";

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const buyer = await requireBuyer();
  const locale = await resolveLocale();
  const d = getDictionary(locale);

  return (
    <div className="flex min-h-svh">
      <BuyerSidebar dict={d} buyerName={buyer.name} buyerEmail={buyer.email} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 border-b px-4 py-3 sm:justify-end sm:px-6">
          <div className="flex items-center gap-2 sm:hidden">
            <BuyerMobileNav dict={d} />
            <span className="text-sm font-semibold tracking-tight">{d.common.appName}</span>
          </div>
          <div className="flex items-center gap-2">
            <LocaleSwitcher current={locale} />
            <form action={logoutBuyerAction}>
              <Button variant="ghost" size="sm" type="submit">
                <LogOut className="mr-1 size-4" />
                {d.nav.logout}
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
