import { cookies } from "next/headers";
import { getBuyerSession } from "@/lib/auth/buyer";
import { getSupplierSession } from "@/lib/auth/supplier";
import { prisma } from "@/lib/prisma";
import { defaultLocale, locales, type AppLocale } from "./dictionaries";

const LOCALE_COOKIE = "locale";

function isAppLocale(value: string | undefined): value is AppLocale {
  return !!value && (locales as readonly string[]).includes(value);
}

/**
 * Résout la langue à utiliser pour la requête en cours : préférence
 * mémorisée en base pour un fournisseur/acheteur connecté, sinon cookie,
 * sinon FR par défaut.
 */
export async function resolveLocale(): Promise<AppLocale> {
  const supplierSession = await getSupplierSession();
  if (supplierSession) return supplierSession.supplierLocale as AppLocale;

  const buyerSession = await getBuyerSession();
  if (buyerSession) return buyerSession.locale as AppLocale;

  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isAppLocale(cookieLocale)) return cookieLocale;

  return defaultLocale;
}

/** Persiste la préférence de langue : en base si connecté, sinon en cookie. */
export async function setLocale(locale: AppLocale) {
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  const supplierSession = await getSupplierSession();
  if (supplierSession) {
    await prisma.supplier.update({
      where: { id: supplierSession.supplierId },
      data: { locale },
    });
    return;
  }

  const buyerSession = await getBuyerSession();
  if (buyerSession) {
    await prisma.buyer.update({
      where: { id: buyerSession.buyerId },
      data: { locale },
    });
  }
}
