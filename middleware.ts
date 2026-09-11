import { NextRequest, NextResponse } from "next/server";
import { BUYER_COOKIE_NAME, SUPPLIER_COOKIE_NAME } from "@/lib/auth/cookie-names";

/**
 * Contrôle léger (présence de cookie uniquement) exécuté en Edge Runtime.
 * Ce n'est PAS la barrière de sécurité : Prisma ne tourne pas sur l'Edge
 * Runtime, donc la vérification faisant autorité (signature JWT pour
 * l'acheteur, lookup DB pour le fournisseur) est faite dans les pages/layouts
 * via lib/auth/guards.ts. Ce middleware évite juste un aller-retour serveur
 * inutile pour l'UX (redirection immédiate si aucun cookie).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/acheteur") && pathname !== "/acheteur/connexion") {
    const hasCookie = request.cookies.has(BUYER_COOKIE_NAME);
    if (!hasCookie) {
      return NextResponse.redirect(new URL("/acheteur/connexion", request.url));
    }
  }

  if (pathname.startsWith("/fournisseur") && pathname !== "/fournisseur/lien-expire") {
    const hasCookie = request.cookies.has(SUPPLIER_COOKIE_NAME);
    if (!hasCookie) {
      return NextResponse.redirect(new URL("/fournisseur/lien-expire", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/acheteur/:path*", "/fournisseur/:path*"],
};
