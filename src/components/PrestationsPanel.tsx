import { useState } from 'react';
import { Plus, Trash2, ChevronDown, Lock } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import { formatNum } from '../utils/formatNum';
import NumInput from './NumInput';
import { PRESTATION_PRESETS } from '../data/prestationPresets';

const CUSTOM_VALUE = '__custom__';

type Props = { hypothesisId: string; isLocked?: boolean; tourAnchor?: boolean };

export default function PrestationsPanel({ hypothesisId, isLocked, tourAnchor }: Props) {
  const simulation = useSimulationStore(s => s.simulation);
  const hypothesis = simulation?.hypotheses.find(h => h.id === hypothesisId);
  const addPrestation = useSimulationStore(s => s.addPrestation);
  const removePrestation = useSimulationStore(s => s.removePrestation);

  const storageKey = `prestationsPanel.open.${hypothesisId}`;
  const [open, setOpen] = useState(() => localStorage.getItem(storageKey) === 'true');
  const [selected, setSelected] = useState<string>('');
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [productionCost, setProductionCost] = useState(0);
  const [price, setPrice] = useState(0);
  const [offered, setOffered] = useState(false);

  if (!simulation || !hypothesis) return null;

  const prestations = hypothesis.prestations ?? [];
  const presetLines = prestations.filter(p => p.fromPreset);
  const extraPrestations = prestations.filter(p => !p.fromPreset);
  const totalBilled = prestations.reduce(
    (s, p) => s + (p.offered ? 0 : p.price * (p.quantity ?? 1)),
    0,
  );

  const canSubmit = name.trim().length > 0;

  const resetForm = () => {
    setSelected('');
    setCategory('');
    setName('');
    setQuantity(1);
    setProductionCost(0);
    setPrice(0);
    setOffered(false);
  };

  const handlePresetChange = (value: string) => {
    setSelected(value);
    if (value === '' || value === CUSTOM_VALUE) {
      if (value === CUSTOM_VALUE) {
        setName('');
        setPrice(0);
      }
      return;
    }
    for (const group of PRESTATION_PRESETS) {
      for (const item of group.items) {
        const key = `${group.label}::${item.name}`;
        if (key === value) {
          setCategory(group.label);
          setName(item.name);
          setProductionCost(item.productionCost);
          setPrice(item.price);
          return;
        }
      }
    }
  };

  const handleAdd = () => {
    if (isLocked || !canSubmit) return;
    addPrestation(hypothesisId, {
      name: name.trim(),
      category: category || undefined,
      quantity: Math.max(1, quantity),
      productionCost,
      price: offered ? 0 : price,
      offered,
    });
    resetForm();
  };

  const formLocked = !!isLocked;

  const addFormSection = () => (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1.5 block">Prestation</label>
        <div className="relative">
          <select
            value={selected}
            disabled={formLocked}
            onChange={e => handlePresetChange(e.target.value)}
            className="w-full appearance-none bg-navy-800/60 hover:bg-navy-800/80 border border-navy-600/30 hover:border-fg/20 text-fg text-sm rounded-lg px-3 py-2.5 pr-9 cursor-pointer focus:outline-none focus:border-teal-400/40 transition-colors disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-navy-800/60"
          >
            <option value="">Sélectionner une prestation…</option>
            {PRESTATION_PRESETS.map(group => (
              <optgroup key={group.label} label={group.label}>
                {group.items.map(item => {
                  const key = `${group.label}::${item.name}`;
                  const label = item.custom
                    ? `${item.name}${item.price === 0 ? '' : ` — ${formatNum(item.price)} €`}`
                    : `${item.name} — ${formatNum(item.price)} €`;
                  return (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  );
                })}
              </optgroup>
            ))}
            <option value={CUSTOM_VALUE}>Custom — saisie libre</option>
          </select>
          <ChevronDown className="w-4 h-4 text-fg/60 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1.5 block">Nom</label>
        <input
          type="text"
          value={name}
          disabled={formLocked}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleAdd();
          }}
          placeholder="Nom de la prestation"
          className="w-full bg-navy-800/60 border border-navy-600/30 rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg/30 focus:outline-none focus:border-teal-400/40 transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
        />
      </div>
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-2">
          <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1.5 block">Quantité</label>
          <NumInput
            value={quantity}
            onChange={setQuantity}
            min={1}
            disabled={formLocked}
            className="w-full bg-navy-800/60 border border-navy-600/30 rounded-lg px-3 py-2 text-sm text-fg font-mono focus:outline-none focus:border-teal-400/40 transition-colors"
          />
        </div>
        <div className="col-span-4">
          <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1.5 block">Coût de production</label>
          <div className="relative">
            <NumInput
              value={productionCost}
              onChange={setProductionCost}
              min={0}
              disabled={formLocked}
              className="w-full bg-navy-800/60 border border-navy-600/30 rounded-lg px-3 py-2 pr-8 text-sm text-fg font-mono focus:outline-none focus:border-teal-400/40 transition-colors"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg/45 font-mono">€</span>
          </div>
        </div>
        <div className="col-span-4">
          <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1.5 block">Prix unitaire</label>
          <div className="relative">
            <NumInput
              value={offered ? 0 : price}
              onChange={setPrice}
              min={0}
              disabled={formLocked}
              className={`w-full bg-navy-800/60 border border-navy-600/30 rounded-lg px-3 py-2 pr-8 text-sm font-mono focus:outline-none focus:border-teal-400/40 transition-colors ${offered ? 'text-fg/40' : 'text-fg'}`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg/45 font-mono">€</span>
          </div>
        </div>
        <div className="col-span-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canSubmit || formLocked}
            className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              canSubmit && !formLocked
                ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                : 'bg-navy-800/60 text-fg/40 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            formLocked ? 'text-fg/40 cursor-not-allowed' : 'cursor-pointer text-fg/75 hover:text-fg'
          }`}
        >
          <input
            type="checkbox"
            checked={offered}
            disabled={formLocked}
            onChange={e => setOffered(e.target.checked)}
            className="accent-teal-400 w-3.5 h-3.5"
          />
          Offert (prix à 0)
        </label>
        <div className="text-xs text-fg/65">
          Total prestations facturées{' '}
          <span className="font-mono font-semibold text-fg ml-1">
            {formatNum(totalBilled)} €
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="glass-card overflow-hidden" data-tour={tourAnchor ? 'tour-prestations' : undefined}>
      <button
        type="button"
        onClick={() =>
          setOpen(o => {
            const next = !o;
            localStorage.setItem(storageKey, String(next));
            return next;
          })
        }
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-fg/[0.04] transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-fg min-w-0">
          <Plus className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="truncate">
            Prestations additionnelles
            {isLocked && presetLines.length > 0 && (
              <span className="text-fg/50 font-normal"> · {presetLines.length} du preset</span>
            )}
          </span>
          {prestations.length > 0 && (
            <span className="text-[11px] bg-navy-700/80 text-fg/70 px-2 py-0.5 rounded-full border border-fg/10 font-medium shrink-0">
              {prestations.length}
            </span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-fg/60 transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {isLocked && !open && extraPrestations.length > 0 && (
        <div className="px-4 py-2 flex flex-wrap items-center gap-1.5 border-t border-fg/10 bg-navy-900/15">
          <span className="text-[9px] uppercase tracking-wider text-fg/45">Hors preset</span>
          {extraPrestations.map(p => {
            const qty = p.quantity ?? 1;
            return (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 pl-2 pr-0.5 py-0.5 rounded-md bg-navy-800/60 border border-fg/10 text-[11px] text-fg/85"
              >
                <span className="max-w-[160px] truncate">{p.name}</span>
                <span className="text-fg/45">×{qty}</span>
                <button
                  type="button"
                  onClick={() => removePrestation(hypothesisId, p.id)}
                  className="p-0.5 rounded text-fg/50 hover:text-red-400 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className={`collapse-transition ${open ? 'open' : ''}`}>
        <div>
          <div className="border-t border-fg/12 px-4 py-4 space-y-4">
            {isLocked && (
              <p className="text-[11px] text-fg/55 -mt-1">
                Lignes <span className="text-fg/70">« Preset »</span> : figées. L’ajout de prestations est désactivé tant que
                l’hypothèse reste verrouillée sur ce preset.
              </p>
            )}

            {addFormSection()}

            {prestations.length > 0 && (
              <div className="space-y-2 pt-2">
                {prestations.map(p => {
                  const qty = p.quantity ?? 1;
                  const lineTotal = p.offered ? 0 : p.price * qty;
                  const isPreset = !!p.fromPreset;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 border transition-colors ${
                        isPreset
                          ? 'bg-navy-900/30 border-fg/8 opacity-75'
                          : 'bg-navy-800/40 border-fg/8 hover:border-fg/15'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isPreset && <Lock className="w-3.5 h-3.5 text-amber-400/90 shrink-0" />}
                          <span className="text-sm font-semibold text-fg truncate">{p.name}</span>
                          {p.category && (
                            <span className="text-[10px] bg-navy-700/80 text-fg/60 px-1.5 py-0.5 rounded-full border border-fg/10 font-medium whitespace-nowrap">
                              {p.category}
                            </span>
                          )}
                          {isPreset && (
                            <span className="text-[10px] bg-amber-400/12 text-amber-400/90 px-1.5 py-0.5 rounded-full font-medium border border-amber-400/25">
                              Preset
                            </span>
                          )}
                          {p.offered && (
                            <span className="text-[10px] bg-teal-400/15 text-teal-400 px-1.5 py-0.5 rounded-full font-medium">
                              Offert
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-fg/55 font-mono mt-0.5">
                          Qté {qty} · Coût {formatNum(p.productionCost)} € · PU {formatNum(p.price)} € · Total {formatNum(lineTotal)} €
                        </div>
                      </div>
                      {isPreset ? (
                        <span className="text-[10px] text-fg/40 text-right max-w-[7rem]">Inclus au preset</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removePrestation(hypothesisId, p.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-fg/65 border border-fg/15 hover:text-red-400 hover:border-red-400/40 hover:bg-red-500/10 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3 h-3" />
                          Supprimer
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
