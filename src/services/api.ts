import type { Simulation, Hypothesis, Lever, LeverConfig, Store, Preset, GlobalParams, Prestation } from '../types';

const BASE = '/api';

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${method} ${path} → ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // ── Global params ────────────────────────────────────────────
  getGlobalParams: () => req<GlobalParams>('GET', '/global-params'),
  putGlobalParams: (p: GlobalParams) => req<GlobalParams>('PUT', '/global-params', p),

  // ── Lever configs ────────────────────────────────────────────
  getLeverConfigs: () => req<LeverConfig[]>('GET', '/lever-configs'),
  putLeverConfig: (type: string, updates: Partial<LeverConfig>) =>
    req<LeverConfig>('PUT', `/lever-configs/${type}`, updates),

  // ── Stores ───────────────────────────────────────────────────
  getStores: () => req<Store[]>('GET', '/stores'),
  postStore: (s: { id: string; name: string; population: number; pop10min?: number; pop20min?: number; pop30min?: number; popCustom?: number; budgetWeightPercent?: number }) =>
    req<Store>('POST', '/stores', s),
  putStore: (id: string, updates: Partial<Pick<Store, 'name' | 'population' | 'pop10min' | 'pop20min' | 'pop30min' | 'popCustom' | 'budgetWeightPercent'>>) =>
    req<Store>('PUT', `/stores/${id}`, updates),
  deleteStore: (id: string) => req<void>('DELETE', `/stores/${id}`),

  uploadStores: async (file: File, mode: 'replace' | 'append' = 'replace') => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/stores/upload-excel?mode=${mode}`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json() as Promise<{ count: number; stores: Store[] }>;
  },

  // ── Presets ──────────────────────────────────────────────────
  getPresets: () => req<Preset[]>('GET', '/presets'),
  postPreset: (p: Omit<Preset, 'id'> & { id?: string }) =>
    req<Preset>('POST', '/presets', p),
  deletePreset: (id: string) => req<void>('DELETE', `/presets/${id}`),
  reorderPresets: (ids: string[]) => req<void>('PATCH', '/presets/reorder', { ids }),

  // ── Simulations ──────────────────────────────────────────────
  getSimulations: (profileId: string) =>
    req<Array<{ id: string; name: string; startDate: string; endDate: string; createdAt: string }>>(
      'GET',
      `/simulations?profileId=${encodeURIComponent(profileId)}`,
    ),
  getSimulation: (id: string) => req<Simulation>('GET', `/simulations/${id}`),
  postSimulation: (s: Pick<Simulation, 'id' | 'name' | 'startDate' | 'endDate' | 'cpmId'> & { profileId: string }) =>
    req<Simulation>('POST', '/simulations', s),
  putSimulation: (id: string, updates: Partial<Pick<Simulation, 'name' | 'startDate' | 'endDate' | 'cpmId'>>) =>
    req<Simulation>('PUT', `/simulations/${id}`, updates),
  deleteSimulation: (id: string) => req<void>('DELETE', `/simulations/${id}`),

  // ── Hypotheses ───────────────────────────────────────────────
  postHypothesis: (simId: string, h: Hypothesis & { sort_order?: number }) =>
    req<{ id: string }>('POST', `/simulations/${simId}/hypotheses`, h),
  putHypothesis: (simId: string, id: string, updates: Partial<Hypothesis>) =>
    req<{ id: string }>('PUT', `/simulations/${simId}/hypotheses/${id}`, updates),
  deleteHypothesis: (simId: string, id: string) =>
    req<void>('DELETE', `/simulations/${simId}/hypotheses/${id}`),

  // ── Levers ───────────────────────────────────────────────────
  postLever: (hypId: string, l: Lever & { sort_order?: number }) =>
    req<{ id: string }>('POST', `/hypotheses/${hypId}/levers`, l),
  putLever: (hypId: string, id: string, updates: Partial<Lever>) =>
    req<{ id: string }>('PUT', `/hypotheses/${hypId}/levers/${id}`, updates),
  deleteLever: (hypId: string, id: string) =>
    req<void>('DELETE', `/hypotheses/${hypId}/levers/${id}`),

  // ── Prestations ──────────────────────────────────────────────
  postPrestation: (simId: string, p: Prestation) =>
    req<{ id: string }>('POST', `/simulations/${simId}/prestations`, p),
  putPrestation: (simId: string, id: string, updates: Partial<Prestation>) =>
    req<{ id: string }>('PUT', `/simulations/${simId}/prestations/${id}`, updates),
  deletePrestation: (simId: string, id: string) =>
    req<void>('DELETE', `/simulations/${simId}/prestations/${id}`),

  // ── Replace (used by undo/redo) ──────────────────────────────
  replaceSimulation: (id: string, body: {
    name?: string;
    startDate?: string;
    endDate?: string;
    profileId?: string | null;
    hypotheses: Array<Hypothesis & { levers: Lever[] }>;
  }) => req<Simulation>('PUT', `/simulations/${id}/replace`, body),

  // ── History ──────────────────────────────────────────────────
  getHistory: (profileId?: string | null, limit = 500) => {
    const q = new URLSearchParams();
    if (profileId) q.set('profileId', profileId);
    q.set('limit', String(limit));
    return req<Array<{
      id: number;
      ts: string;
      profileId: string | null;
      actorPseudo: string | null;
      simulationId: string | null;
      actionLabel: string;
      snapshot: unknown;
    }>>('GET', `/history?${q.toString()}`);
  },
  postHistory: (entry: {
    profileId: string | null;
    actorPseudo: string | null;
    simulationId: string | null;
    actionLabel: string;
    snapshot: unknown;
  }) => req<{ id: number; ts: string }>('POST', '/history', entry),
  deleteHistory: (id: number) => req<void>('DELETE', `/history/${id}`),
};
