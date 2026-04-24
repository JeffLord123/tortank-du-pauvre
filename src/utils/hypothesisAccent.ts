/** Couleurs d’identification des hypothèses (cycle). Ordre : rouge → bleu → vert → orange → violet → jaune. */
const HYPOTHESIS_ACCENT_COLORS = [
  '#ef4444',
  '#3b82f6',
  '#22c55e',
  '#f97316',
  '#a855f7',
  '#eab308',
] as const;

export function getHypothesisAccentColor(hypothesisIndex: number): string {
  const n = HYPOTHESIS_ACCENT_COLORS.length;
  const i = ((hypothesisIndex % n) + n) % n;
  return HYPOTHESIS_ACCENT_COLORS[i]!;
}
