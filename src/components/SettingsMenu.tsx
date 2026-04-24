import { useEffect, useRef, useState } from 'react';
import { Settings, FlaskConical, UserCircle, Moon, Sun, Sliders, Check, ChevronRight } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import { useProfileStore, getActiveProfile } from '../store/profileStore';
import { useVersionStore, APP_VERSIONS, type AppVersion } from '../store/versionStore';
import { applyTheme, type Theme } from '../theme';

function readTheme(): Theme {
  return document.documentElement.classList.contains('light') ? 'light' : 'dark';
}

export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const ref = useRef<HTMLDivElement>(null);

  const toggleAdmin = useSimulationStore(s => s.toggleAdmin);
  const simulation = useSimulationStore(s => s.simulation);
  const updateHypothesis = useSimulationStore(s => s.updateHypothesis);

  const profiles = useProfileStore(s => s.profiles);
  const activeProfileId = useProfileStore(s => s.activeProfileId);
  const openProfilePicker = useProfileStore(s => s.openProfilePicker);
  const activeProfile = getActiveProfile(profiles, activeProfileId);
  const isAdmin = activeProfile?.isAdmin ?? false;

  const activeVersion = useVersionStore(s => s.activeVersion);
  const setVersion = useVersionStore(s => s.setVersion);
  const currentVersion = APP_VERSIONS.find(v => v.id === activeVersion)!;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setVersionOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  }

  function pickVersion(id: AppVersion) {
    setVersion(id);
    setVersionOpen(false);
    if (!simulation) return;
    const defaultMode = id === 'v3' ? 'v3-levier' : 'automatique';
    if (id === 'v1' || id === 'v3') {
      for (const h of simulation.hypotheses) {
        updateHypothesis(h.id, { budgetMode: defaultMode, objectiveMode: 'budget' });
      }
    }
  }

  function handleProfile() {
    setOpen(false);
    openProfilePicker();
  }

  function handleAdmin() {
    setOpen(false);
    toggleAdmin();
  }

  const isDark = theme === 'dark';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-tour="tour-settings"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-navy-800/55 text-fg/85 border border-fg/12 hover:text-fg hover:bg-navy-800/90 hover:border-teal-400/25 transition-all"
        title="Paramètres"
      >
        <Settings className="w-3.5 h-3.5" />
        Paramètres
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-72 rounded-xl border border-fg/15 bg-navy-900 shadow-xl shadow-black/40 z-50 overflow-hidden">
          {/* Version */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setVersionOpen(o => !o)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors border-b border-fg/8 ${
                versionOpen ? 'bg-navy-800/60' : 'hover:bg-navy-800/50'
              }`}
            >
              <FlaskConical className={`w-3.5 h-3.5 shrink-0 ${
                activeVersion === 'v2' ? 'text-coral-400' : activeVersion === 'v3' ? 'text-violet-400' : 'text-fg/72'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-fg/95">Version</div>
                <div className="text-[10px] text-fg/55 truncate">{currentVersion.label}</div>
              </div>
              <ChevronRight className={`w-3 h-3 text-fg/45 transition-transform ${versionOpen ? 'rotate-90' : ''}`} />
            </button>
            {versionOpen && (
              <div className="bg-navy-950/50">
                {APP_VERSIONS.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => pickVersion(v.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                      v.id === activeVersion ? 'bg-teal-400/10 text-fg' : 'text-fg/75 hover:bg-navy-800/60'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold">{v.label}</div>
                      <div className="text-[10px] text-fg/45 mt-0.5">{v.description}</div>
                    </div>
                    {v.id === activeVersion && <Check className="w-3.5 h-3.5 text-teal-500 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Profile */}
          <button
            type="button"
            onClick={handleProfile}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-navy-800/50 transition-colors border-b border-fg/8"
          >
            <UserCircle className="w-3.5 h-3.5 shrink-0 text-fg/72" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-fg/95">Profil</div>
              <div className="text-[10px] text-fg/55 truncate">{activeProfile?.pseudo ?? 'Aucun'}</div>
            </div>
          </button>

          {/* Theme */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-navy-800/50 transition-colors border-b border-fg/8"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 shrink-0 text-fg/72" /> : <Moon className="w-3.5 h-3.5 shrink-0 text-fg/72" />}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-fg/95">Apparence</div>
              <div className="text-[10px] text-fg/55">{isDark ? 'Mode sombre · Passer au clair' : 'Mode clair · Passer au sombre'}</div>
            </div>
          </button>

          {/* Admin / Presets */}
          <button
            type="button"
            onClick={handleAdmin}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-navy-800/50 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 shrink-0 text-fg/72" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-fg/95">{isAdmin ? 'Administration' : 'Presets'}</div>
              <div className="text-[10px] text-fg/55">{isAdmin ? 'Paramètres, leviers, magasins, historique' : 'Presets administrateur et personnels'}</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
