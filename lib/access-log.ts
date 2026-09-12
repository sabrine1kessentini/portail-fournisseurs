/**
 * Cas limite "lien transféré" : le compteur d'IP distinctes reste affiché à
 * l'acheteur à titre informatif (lib/auth/supplier.ts loggue chaque
 * ouverture dans OrderAccessLog), mais ne sert plus à décider du blocage —
 * deux appareils sur le même WiFi partagent la même IP publique via le NAT
 * du routeur, ce qui rendait un transfert au sein d'un même bureau
 * indétectable. Le blocage réel se base sur le cookie de session (voir
 * resolveMagicLinkAndCreateSession) ; le motif ("manual" | "forwarded") est
 * persisté sur MagicLink.revokedReason, seule source de vérité.
 */
export function countDistinctIps(ips: (string | null)[]): number {
  return new Set(ips.filter((ip): ip is string => !!ip)).size;
}

export type MagicLinkStatus = "active" | "expired" | "blocked_forwarded" | "revoked_manual";

export function classifyMagicLinkStatus(link: {
  revoked: boolean;
  revokedReason: "manual" | "forwarded" | null;
  expiresAt: Date;
}): MagicLinkStatus {
  if (link.revoked) {
    return link.revokedReason === "forwarded" ? "blocked_forwarded" : "revoked_manual";
  }
  if (link.expiresAt <= new Date()) return "expired";
  return "active";
}
