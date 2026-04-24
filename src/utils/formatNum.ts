export function formatNum(n: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n));
}

/**
 * Même nombre que formatNum, mais espaces « normaux » (ASCII).
 * Intl fr-FR utilise souvent U+202F comme séparateur de milliers ; Helvetica / jsPDF
 * ne l’encode pas correctement (affichage type « / » ou césure entre chiffres).
 */
export function formatNumPdf(n: number): string {
  return formatNum(n)
    .replace(/\u202f/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2009/g, ' ')
    .replace(/\u2007/g, ' ');
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
