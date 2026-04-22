export function formatNum(n: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n));
}

/** Affiche les impressions en millions (ex. 40 000 000 → 40M). Sous 1M, format classique. */
export function formatImpressions(n: number): string {
  const r = Math.round(n);
  if (Math.abs(r) < 1_000_000) {
    return formatNum(r);
  }
  const millions = r / 1_000_000;
  const formatted = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(millions);
  return `${formatted}M`;
}
