/**
 * Cas limite "lien transféré" : un lien magique n'est pas nominatif (pas de
 * mot de passe), donc rien ne garantit qu'il reste entre les mains de son
 * destinataire initial. Plutôt que de le rendre inutilisable dès la 2e
 * personne légitime (comptable + logistique chez le même fournisseur, par
 * exemple), on tolère un peu de marge : au-delà de FORWARDED_LINK_IP_THRESHOLD
 * adresses IP distinctes ayant ouvert le lien, on considère qu'il a
 * probablement été transféré au-delà du cercle prévu et on le bloque
 * automatiquement (voir lib/auth/supplier.ts).
 */
export const FORWARDED_LINK_IP_THRESHOLD = 2;

export function countDistinctIps(ips: (string | null)[]): number {
  return new Set(ips.filter((ip): ip is string => !!ip)).size;
}

export function isLikelyForwarded(ips: (string | null)[]): boolean {
  return countDistinctIps(ips) >= FORWARDED_LINK_IP_THRESHOLD;
}

export type MagicLinkStatus = "active" | "expired" | "blocked_forwarded" | "revoked_manual";

/**
 * Détermine le statut affiché à l'acheteur pour un lien donné. Pas de champ
 * dédié en base : le motif d'un lien révoqué (blocage automatique vs
 * révocation manuelle par l'acheteur) est ré-inféré à partir du même critère
 * (IP distinctes) qui a servi à décider le blocage — source de vérité
 * unique, pas de risque de désynchronisation.
 */
export function classifyMagicLinkStatus(
  link: { revoked: boolean; expiresAt: Date },
  ips: (string | null)[]
): MagicLinkStatus {
  if (link.revoked) {
    return isLikelyForwarded(ips) ? "blocked_forwarded" : "revoked_manual";
  }
  if (link.expiresAt <= new Date()) return "expired";
  return "active";
}
