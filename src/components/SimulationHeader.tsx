import { Sparkles, GitCompareArrows, BarChart2 } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import FrenchDateInput from './FrenchDateInput';
import SettingsMenu from './SettingsMenu';
import BackForward from './BackForward';

export default function SimulationHeader() {
  const { simulation, updateSimulation, toggleComparison, showComparison } = useSimulationStore();

  if (!simulation) return null;

  return (
    <header className="sticky top-0 z-40 bg-navy-950 border-b border-fg/15">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Logo + simulation info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#0c1218]" />
            </div>
            <span className="text-sm font-bold tracking-tight hidden sm:block">Tortank</span>
          </div>

          <div className="h-6 w-px bg-fg/38" />

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={simulation.name}
              onChange={e => updateSimulation({ name: e.target.value })}
              className="w-[100px] bg-navy-800/80 border border-navy-600/50 rounded-md px-3 py-1 text-sm text-fg focus:outline-none focus:border-teal-400/50"
            />
            <FrenchDateInput
              value={simulation.startDate}
              onChange={v => updateSimulation({ startDate: v })}
              className="min-w-[6.5rem]"
              size="sm"
              aria-label="Date de début de la simulation"
            />
            <span className="text-fg/40 text-xs">→</span>
            <FrenchDateInput
              value={simulation.endDate}
              onChange={v => updateSimulation({ endDate: v })}
              className="min-w-[6.5rem]"
              size="sm"
              aria-label="Date de fin de la simulation"
            />
            <div className="h-4 w-px bg-fg/20 mx-1" />
            <div className="flex items-center gap-1">
              <BarChart2 className="w-3 h-3 text-fg/45 shrink-0" />
              <select
                value={simulation.cpmId}
                onChange={e => updateSimulation({ cpmId: e.target.value })}
                className="bg-navy-800/80 border border-navy-600/50 rounded-md px-2 py-1 text-xs text-fg focus:outline-none focus:border-teal-400/50"
                aria-label="CPM"
              >
                <option value="fixe">CPM fixe</option>
                <option value="max">CPM max</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleComparison}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              showComparison
                ? 'bg-teal-400/15 text-teal-400 border border-teal-400/20'
                : 'bg-navy-800/55 text-fg/78 border border-fg/12 hover:text-fg/92 hover:bg-navy-800/90'
            }`}
          >
            <GitCompareArrows className="w-3.5 h-3.5" />
            Comparer
          </button>

          <div className="h-5 w-px bg-fg/20 mx-0.5" />

          <BackForward />
          <SettingsMenu />
        </div>
      </div>
    </header>
  );
}
