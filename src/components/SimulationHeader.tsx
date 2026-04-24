import { useState } from 'react';
import { Sparkles, GitCompareArrows, BarChart2, Trash2 } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import { useProfileStore } from '../store/profileStore';
import { useToastStore } from '../store/toastStore';
import { api } from '../services/api';
import FrenchDateInput from './FrenchDateInput';
import { blurOnEnter } from './NumInput';
import SettingsMenu from './SettingsMenu';
import BackForward from './BackForward';

const PRODUCT_TOUR_HELP =
  'Visite guidée : présentation des principales fonctions de Tortank (10 étapes).';

const CLEAN_CONFIRM_PARAGRAPHS = [
  'Supprimer toutes les données de simulation en base ?',
  'Seront effacés définitivement : toutes les simulations, hypothèses et leviers (y compris les prestations liées aux hypothèses).',
  'Ne seront pas effacés : magasins, préréglages, paramètres globaux, historique.',
  'Équivalent à la commande « npm run clean » dans le dossier server. Après validation, vous reviendrez à l’écran de création de simulation.',
];

type Props = { onOpenProductTour?: () => void };

export default function SimulationHeader({ onOpenProductTour }: Props) {
  const { simulation, updateSimulation, toggleComparison, showComparison, initFromAPI } =
    useSimulationStore();
  const activeProfileId = useProfileStore(s => s.activeProfileId);
  const pushToast = useToastStore(s => s.push);
  const [cleanBusy, setCleanBusy] = useState(false);
  const [cleanDialogOpen, setCleanDialogOpen] = useState(false);

  async function runCleanDatabase() {
    if (!activeProfileId) return;
    setCleanDialogOpen(false);
    setCleanBusy(true);
    try {
      await api.postMaintenanceClean();
      await initFromAPI(activeProfileId);
      pushToast({
        kind: 'success',
        title: 'Base nettoyée',
        lines: ['Simulations, hypothèses et leviers ont été supprimés.'],
      });
    } catch (e) {
      console.error(e);
      pushToast({
        kind: 'warning',
        title: 'Échec du nettoyage',
        lines: [e instanceof Error ? e.message : String(e)],
      });
    } finally {
      setCleanBusy(false);
    }
  }

  if (!simulation) return null;

  return (
    <>
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

          <div className="flex items-center gap-2" data-tour="tour-header">
            <input
              type="text"
              value={simulation.name}
              onChange={e => updateSimulation({ name: e.target.value })}
              onKeyDown={blurOnEnter}
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
          {onOpenProductTour && (
            <button
              type="button"
              onClick={onOpenProductTour}
              title={PRODUCT_TOUR_HELP}
              aria-label={PRODUCT_TOUR_HELP}
              className="flex items-center justify-center w-8 h-8 shrink-0 rounded-full border border-fg/15 bg-navy-800/70 text-sm font-semibold text-fg/80 hover:text-sky-400 hover:border-sky-400/40 hover:bg-navy-800 transition-colors"
            >
              ?
            </button>
          )}
          <button
            type="button"
            data-tour="tour-compare"
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

          <button
            type="button"
            disabled={cleanBusy}
            onClick={() => setCleanDialogOpen(true)}
            title="Supprimer toutes les simulations en base (npm run clean)"
            aria-label="Nettoyer la base : supprimer simulations, hypothèses et leviers"
            aria-haspopup="dialog"
            aria-expanded={cleanDialogOpen}
            className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/16 hover:border-red-400/55 hover:text-red-300 disabled:opacity-45 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <BackForward />
          <SettingsMenu />
        </div>
      </div>
    </header>

    {cleanDialogOpen && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clean-db-dialog-title"
        onClick={() => setCleanDialogOpen(false)}
      >
        <div
          className="w-full max-w-md rounded-xl border border-fg/15 bg-navy-900 shadow-xl shadow-black/40 p-5 text-fg"
          onClick={e => e.stopPropagation()}
        >
          <h2 id="clean-db-dialog-title" className="text-base font-semibold text-fg mb-3">
            Nettoyer la base de données
          </h2>
          <div className="space-y-3 text-sm text-fg/85 leading-relaxed">
            {CLEAN_CONFIRM_PARAGRAPHS.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-navy-800/80 border border-fg/15 text-fg/90 hover:bg-navy-800 transition-colors"
              onClick={() => setCleanDialogOpen(false)}
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={cleanBusy}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600/90 text-navy-950 hover:bg-amber-500 disabled:opacity-50 transition-colors"
              onClick={() => void runCleanDatabase()}
            >
              Tout supprimer
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
