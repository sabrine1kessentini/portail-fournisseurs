import { redirect } from "next/navigation";
import { getBuyerSession, type BuyerSessionPayload } from "./buyer";
import { getSupplierSession, type SupplierSessionInfo } from "./supplier";

/**
 * Barrière d'autorisation réelle pour l'espace acheteur : le middleware ne
 * fait qu'un contrôle léger (présence de cookie) pour l'UX, la vérification
 * qui compte (signature JWT + expiration) a lieu ici, côté serveur Node,
 * avant tout accès aux données.
 */
export async function requireBuyer(): Promise<BuyerSessionPayload> {
  const session = await getBuyerSession();
  if (!session) redirect("/acheteur/connexion");
  return session;
}

/**
 * Barrière d'autorisation réelle pour l'espace fournisseur : vérifie en base
 * que la session dérivée du lien magique est toujours valide (non expirée,
 * lien non révoqué) et retourne le scoping (supplierId, commande éventuelle)
 * à utiliser pour toutes les requêtes Prisma qui suivent.
 */
export async function requireSupplierSession(): Promise<SupplierSessionInfo> {
  const session = await getSupplierSession();
  if (!session) redirect("/fournisseur/lien-expire");
  return session;
}
