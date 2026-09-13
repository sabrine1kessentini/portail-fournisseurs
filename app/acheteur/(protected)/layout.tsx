import Link from "next/link";
import { requireBuyer } from "@/lib/auth/guards";
import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { prisma } from "@/lib/prisma";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { BuyerTopNav, BuyerMobileNav } from "@/components/buyer/buyer-nav";
import { NotificationBell } from "@/components/buyer/notification-bell";
import { Button } from "@/components/ui/button";
import { logoutBuyerAction } from "@/app/actions/session";
import { LogOut } from "lucide-react";
import { initials } from "@/lib/initials";

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const buyer = await requireBuyer();
  const locale = await resolveLocale();
  const d = getDictionary(locale);

  const pendingCount = await prisma.orderLineHistory.count({ where: { validationStatus: "pending" } });

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b bg-card">
        <div className="flex items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6">
          <BuyerMobileNav dict={d} />

          <Link href="/acheteur" className="flex shrink-0 items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-foreground font-heading text-base text-background">
              {d.common.appName[0]}
            </span>
            <span className="hidden text-sm font-semibold tracking-tight sm:block">
              {d.common.appName}
            </span>
          </Link>

          <div className="flex-1 overflow-x-auto">
            <BuyerTopNav dict={d} />
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <LocaleSwitcher current={locale} />
            <NotificationBell count={pendingCount} label={d.common.notifications} />
            <div className="hidden items-center gap-2 border-l pl-3 sm:flex">
              <span className="flex size-8 items-center justify-center rounded-full bg-secondary font-mono text-xs font-medium">
                {initials(buyer.name)}
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-medium">{buyer.name}</span>
                <span className="block text-xs text-muted-foreground">{d.common.buyerRoleLabel}</span>
              </span>
            </div>
            <form action={logoutBuyerAction}>
              <Button variant="ghost" size="icon" type="submit" aria-label={d.nav.logout}>
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}
