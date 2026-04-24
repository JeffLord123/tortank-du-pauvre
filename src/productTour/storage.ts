const PENDING_KEY = 'tortank_product_tour_pending';

function doneKey(profileId: string) {
  return `tortank_product_tour_done_${profileId}`;
}

/** À appeler au démarrage d’une simulation : si l’utilisateur avait demandé le tour à la création et ne l’a pas encore terminé. */
export function consumePendingProductTour(profileId: string | null): boolean {
  if (!profileId || typeof sessionStorage === 'undefined') return false;
  const pending = sessionStorage.getItem(PENDING_KEY);
  if (pending !== profileId) return false;
  sessionStorage.removeItem(PENDING_KEY);
  if (typeof localStorage !== 'undefined' && localStorage.getItem(doneKey(profileId)) === '1') {
    return false;
  }
  return true;
}

export function markProductTourDone(profileId: string | null) {
  if (!profileId || typeof localStorage === 'undefined') return;
  localStorage.setItem(doneKey(profileId), '1');
}

export function setPendingProductTour(profileId: string | null) {
  if (!profileId || typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(PENDING_KEY, profileId);
}
