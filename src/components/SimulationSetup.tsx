import { useState, useRef, useEffect } from 'react';
import { CalendarDays, Sparkles, ArrowRight, UserCircle, ChevronDown } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import { useProfileStore } from '../store/profileStore';
import ThemeToggle from './ThemeToggle';
import FrenchDateInput from './FrenchDateInput';

const CPM_OPTIONS: { value: string; label: string }[] = [
  { value: 'fixe', label: 'CPM fixe' },
  { value: 'max', label: 'CPM max' },
];

function CpmDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = CPM_OPTIONS.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 bg-navy-800/80 border border-navy-600/50 rounded-lg px-4 py-3 text-fg hover:border-teal-400/50 focus:outline-none focus:border-teal-400/50 transition-all"
      >
        <span className={selected ? 'text-fg' : 'text-fg/40'}>
          {selected ? selected.label : '— Sélectionner un CPM —'}
        </span>
        <ChevronDown className={`w-4 h-4 text-fg/50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-navy-900 border border-fg/15 rounded-lg shadow-xl shadow-black/40 overflow-hidden animate-fade-in">
          {CPM_OPTIONS.length === 0 ? (
            <div className="px-4 py-3 text-xs text-fg/40">Aucun CPM disponible</div>
          ) : (
            CPM_OPTIONS.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors hover:bg-navy-800/60 hover:text-fg ${o.value === value ? 'bg-teal-400/12 text-teal-400' : 'text-fg/70'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${o.value === value ? 'bg-teal-400' : ''}`} />
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function SimulationSetup() {
  const createSimulation = useSimulationStore(s => s.createSimulation);
  const openProfilePicker = useProfileStore(s => s.openProfilePicker);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cpmId, setCpmId] = useState('');

  const canCreate = name.trim() && startDate && endDate && endDate >= startDate;

  const handleCreate = () => {
    if (canCreate) {
      createSimulation(name.trim(), startDate, endDate, cpmId);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          type="button"
          onClick={openProfilePicker}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-fg/78 border border-fg/12 hover:bg-fg/10 hover:text-fg transition-colors"
        >
          <UserCircle className="w-3.5 h-3.5" />
          Profil
        </button>
        <ThemeToggle />
      </div>
      <div className="w-full max-w-lg animate-fade-in">
        {/* Logo / Brand */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#0c1218]" />
            </div>
            <span className="text-xl font-bold tracking-tight">Tortank</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">
            Nouvelle simulation
          </h1>
          <p className="text-fg/82 text-sm">
            Créez une proposition budgétaire pour vos zones de communication
          </p>
        </div>

        {/* Form */}
        <div className="glass-card p-8 space-y-4">
          {/* Nom de l'opération */}
          <div>
            <label className="block text-xs font-medium text-fg/85 uppercase tracking-wider mb-2">
              Nom de l'opération
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Campagne Printemps 2026"
              className="w-full bg-navy-800/80 border border-navy-600/50 rounded-lg px-4 py-3 text-fg placeholder:text-fg/65 focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20 transition-all"
              autoFocus
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-fg/85 uppercase tracking-wider mb-2">
                <CalendarDays className="w-3 h-3 inline mr-1 -mt-0.5" />
                Date de début
              </label>
              <FrenchDateInput
                value={startDate}
                onChange={setStartDate}
                className="w-full"
                aria-label="Date de début"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg/85 uppercase tracking-wider mb-2">
                <CalendarDays className="w-3 h-3 inline mr-1 -mt-0.5" />
                Date de fin
              </label>
              <FrenchDateInput
                value={endDate}
                onChange={setEndDate}
                className="w-full"
                aria-label="Date de fin"
              />
            </div>
          </div>

          {endDate && startDate && endDate < startDate && (
            <p className="text-coral-400 text-xs flex items-center gap-1">
              La date de fin doit être après la date de début
            </p>
          )}

          {/* CPM */}
          <div>
            <label className="block text-xs font-medium text-fg/85 uppercase tracking-wider mb-2">
              CPM
            </label>
            <CpmDropdown value={cpmId} onChange={setCpmId} />
          </div>

          {/* Submit */}
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-400 to-teal-500 text-[#0c1218] font-semibold rounded-lg px-4 py-3.5 hover:from-teal-400 hover:to-teal-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 group"
          >
            Créer la simulation
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <p className="text-center text-fg/65 text-xs mt-6">
          Vous pourrez ajouter des hypothèses et leviers ensuite
        </p>
      </div>
    </div>
  );
}
