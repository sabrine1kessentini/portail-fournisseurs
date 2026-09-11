/**
 * W2 "Calcul d'impact" : traduit un écart de date brut (ancien/nouveau) en
 * une information actionnable pour l'acheteur — nombre de jours de retard
 * (positif) ou d'avance (négatif) — plutôt que de lui laisser calculer
 * l'écart mentalement à partir de deux dates.
 */
export function computeDelayDays(oldIso: string, newIso: string): number {
  const oldDate = new Date(oldIso);
  const newDate = new Date(newIso);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((newDate.getTime() - oldDate.getTime()) / msPerDay);
}
