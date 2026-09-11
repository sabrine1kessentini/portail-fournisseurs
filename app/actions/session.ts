"use server";

import { redirect } from "next/navigation";
import { destroyBuyerSessionCookie } from "@/lib/auth/buyer";
import { destroySupplierSessionCookie } from "@/lib/auth/supplier";
import { setLocale } from "@/lib/i18n/locale";
import type { AppLocale } from "@/lib/i18n/dictionaries";

export async function logoutBuyerAction() {
  await destroyBuyerSessionCookie();
  redirect("/acheteur/connexion");
}

export async function logoutSupplierAction() {
  await destroySupplierSessionCookie();
  redirect("/fournisseur/lien-expire");
}

export async function switchLocaleAction(locale: AppLocale) {
  await setLocale(locale);
}
