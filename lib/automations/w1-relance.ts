import { prisma } from "@/lib/prisma";
import { createMagicLink, buildMagicLinkUrl } from "@/lib/auth/supplier";
import { sendGroupedReminder } from "@/lib/email";
import { hasRecentDigest, recordDigest } from "./digest-guard";

const UNOPENED_THRESHOLD_DAYS = 3;

/**
 * W1 — "Relance si non ouverte" : détecte les liens fournisseurs jamais
 * ouverts depuis plus de 3 jours et envoie UNE relance groupée par
 * fournisseur (jamais un email par lien).
 *
 * Le token en clair d'un lien n'est jamais conservé en base (seul son hash
 * l'est, voir lib/auth/supplier.ts) : une relance automatique ne peut donc
 * pas "retrouver" l'ancien lien pour le renvoyer. On génère à la place un
 * nouveau lien (même portée, même créateur) — ce qui a aussi l'avantage de
 * donner au fournisseur une fenêtre de validité fraîche.
 */
export async function runUnopenedLinkReminders() {
  const threshold = new Date(Date.now() - UNOPENED_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

  const unopenedLinks = await prisma.magicLink.findMany({
    where: { openedAt: null, revoked: false, expiresAt: { gt: new Date() }, createdAt: { lt: threshold } },
    include: { supplier: true, order: true },
  });

  const bySupplier = new Map<string, typeof unopenedLinks>();
  for (const link of unopenedLinks) {
    const list = bySupplier.get(link.supplierId) ?? [];
    list.push(link);
    bySupplier.set(link.supplierId, list);
  }

  let sent = 0;
  for (const [supplierId, links] of bySupplier) {
    if (await hasRecentDigest(supplierId, "link_not_opened")) continue;

    const supplier = links[0].supplier;
    const { token } = await createMagicLink({
      supplierId,
      orderId: null,
      createdById: links[0].createdById,
    });

    await sendGroupedReminder({
      to: supplier.email,
      locale: supplier.locale,
      magicLinkUrl: buildMagicLinkUrl(token),
      items: links.map((l) => ({ label: l.order?.reference ?? supplier.name })),
    });

    await recordDigest(supplierId, "link_not_opened", { linkIds: links.map((l) => l.id) });
    sent++;
  }

  return { candidateLinks: unopenedLinks.length, remindersSent: sent };
}
