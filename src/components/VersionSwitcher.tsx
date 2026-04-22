import { useState, useRef, useEffect } from 'react';
import { FlaskConical, Check, ChevronDown } from 'lucide-react';
import { useVersionStore, APP_VERSIONS } from '../store/versionStore';
import { useSimulationStore } from '../store/simulationStore';
import type { AppVersion } from '../store/versionStore';

export default function VersionSwitcher() {
  const activeVersion = useVersionStore(s => s.activeVersion);
  const setVersion = useVersionStore(s => s.setVersion);
  const updateHypothesis = useSimulationStore(s => s.updateHypothesis);
  const simulation = useSimulationStore(s => s.simulation);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = APP_VERSIONS.find(v => v.id === activeVersion)!;

  function pick(id: AppVersion) {
    setVersion(id);
    setOpen(false);
    if (!simulation) return;
    const defaultMode = id === 'v3' ? 'v3-levier' : 'automatique';
    if (id === 'v1' || id === 'v3') {
      for (const h of simulation.hypotheses) {
        updateHypothesis(h.id, { budgetMode: defaultMode, objectiveMode: 'budget' });
      }
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
          activeVersion === 'v2'
            ? 'bg-coral-500/15 text-coral-400 border-coral-400/25 hover:bg-coral-500/25'
            : activeVersion === 'v3'
            ? 'bg-violet-500/15 text-violet-400 border-violet-400/25 hover:bg-violet-500/25'
            : 'bg-navy-800/55 text-fg/85 border-fg/12 hover:border-teal-400/25 hover:text-fg'
        }`}
        title="Changer la version A/B"
      >
        <FlaskConical className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-64 rounded-xl border border-fg/15 bg-navy-900 shadow-xl shadow-black/40 z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-fg/10">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-fg/45">A/B Testing</span>
          </div>
          {APP_VERSIONS.map(v => (
            <button
              key={v.id}
              type="button"
              onClick={() => pick(v.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                v.id === activeVersion
                  ? 'bg-teal-400/12 text-fg'
                  : 'text-fg/75 hover:bg-navy-800/60 hover:text-fg'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold">{v.label}</div>
                <div className="text-[10px] text-fg/45 mt-0.5">{v.description}</div>
              </div>
              {v.id === activeVersion && <Check className="w-3.5 h-3.5 text-teal-500 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
