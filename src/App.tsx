import { useEffect, useRef } from 'react';
import { useSimulationStore } from './store/simulationStore';
import { useProfileStore } from './store/profileStore';
import SimulationSetup from './components/SimulationSetup';
import SimulationHeader from './components/SimulationHeader';
import HypothesisPanel from './components/HypothesisPanel';
import SummaryPanel from './components/SummaryPanel';
import ComparisonView from './components/ComparisonView';
import AdminPanel from './components/AdminPanel';
import ProfileSelector from './components/ProfileSelector';
import Toaster from './components/Toaster';
import { useHistoryRecorder } from './hooks/useHistoryRecorder';
import { useUndoRedoShortcuts } from './hooks/useUndoRedoShortcuts';

function App() {
  const simulation = useSimulationStore(s => s.simulation);
  const showComparison = useSimulationStore(s => s.showComparison);
  const initFromAPI = useSimulationStore(s => s.initFromAPI);

  const activeProfileId = useProfileStore(s => s.activeProfileId);
  const profilePickerOpen = useProfileStore(s => s.profilePickerOpen);
  const closeProfilePicker = useProfileStore(s => s.closeProfilePicker);

  useHistoryRecorder();
  useUndoRedoShortcuts();

  const showProfileScreen = !activeProfileId || profilePickerOpen;
  const lastLoadedProfile = useRef<string | null>(null);

  useEffect(() => {
    if (showProfileScreen || !activeProfileId) return;
    if (lastLoadedProfile.current === activeProfileId) return;
    lastLoadedProfile.current = activeProfileId;
    void initFromAPI(activeProfileId);
  }, [activeProfileId, showProfileScreen, initFromAPI]);

  if (showProfileScreen) {
    return (
      <ProfileSelector
        allowDismiss={!!activeProfileId}
        onDismiss={closeProfilePicker}
      />
    );
  }

  if (!simulation) {
    return <SimulationSetup />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SimulationHeader />

      <div className="flex-1 flex">
        {/* Main content: hypotheses */}
        <main className={`flex-1 p-4 pr-2 overflow-y-auto transition-all duration-300 ${
          showComparison ? 'max-w-[55%]' : 'max-w-[65%]'
        }`}>
          <HypothesisPanel />
        </main>

        {/* Right sidebar: summary + comparison */}
        <aside className={`overflow-y-auto p-4 pl-2 transition-all duration-300 ${
          showComparison ? 'w-[45%]' : 'w-[35%]'
        }`}>
          {showComparison ? (
            <ComparisonView />
          ) : (
            <SummaryPanel />
          )}
        </aside>
      </div>

      {/* Admin modal */}
      <AdminPanel />

      {/* Toast notifications (top-right) */}
      <Toaster />
    </div>
  );
}

export default App;
