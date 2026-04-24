import { useEffect, useRef, useState } from 'react';
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
import ProductTour from './components/ProductTour';
import { useHistoryRecorder } from './hooks/useHistoryRecorder';
import { useUndoRedoShortcuts } from './hooks/useUndoRedoShortcuts';
import { consumePendingProductTour } from './productTour/storage';

function App() {
  const simulation = useSimulationStore(s => s.simulation);
  const apiReady = useSimulationStore(s => s.apiReady);
  const showComparison = useSimulationStore(s => s.showComparison);
  const initFromAPI = useSimulationStore(s => s.initFromAPI);

  const activeProfileId = useProfileStore(s => s.activeProfileId);
  const profilePickerOpen = useProfileStore(s => s.profilePickerOpen);
  const closeProfilePicker = useProfileStore(s => s.closeProfilePicker);

  useHistoryRecorder();
  useUndoRedoShortcuts();

  const showProfileScreen = !activeProfileId || profilePickerOpen;
  const lastLoadedProfile = useRef<string | null>(null);
  const [productTourOpen, setProductTourOpen] = useState(false);
  /** Si true, fermer la visite enregistre « déjà vu » (option à la création). Manuel : false. */
  const [productTourFromOnboarding, setProductTourFromOnboarding] = useState(false);

  useEffect(() => {
    if (showProfileScreen || !activeProfileId) return;
    if (lastLoadedProfile.current === activeProfileId) return;
    lastLoadedProfile.current = activeProfileId;
    void initFromAPI(activeProfileId);
  }, [activeProfileId, showProfileScreen, initFromAPI]);

  useEffect(() => {
    if (!simulation || !activeProfileId) return;
    if (consumePendingProductTour(activeProfileId)) {
      setProductTourFromOnboarding(true);
      setProductTourOpen(true);
    }
  }, [simulation?.id, activeProfileId]);

  if (showProfileScreen) {
    return (
      <ProfileSelector
        allowDismiss={!!activeProfileId}
        onDismiss={closeProfilePicker}
      />
    );
  }

  if (!simulation) {
    if (!apiReady) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-navy-950 text-fg/55 text-sm">
          Chargement…
        </div>
      );
    }
    return <SimulationSetup />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SimulationHeader
        onOpenProductTour={() => {
          setProductTourFromOnboarding(false);
          setProductTourOpen(true);
        }}
      />

      <div className="flex-1 flex">
        {/* Main content: hypotheses */}
        <main className={`flex-1 p-4 pr-2 overflow-y-auto transition-all duration-300 ${
          showComparison ? 'max-w-[55%]' : 'max-w-[65%]'
        }`}>
          <HypothesisPanel />
        </main>

        {/* Right sidebar: summary + comparison */}
        <aside
          data-tour="tour-summary"
          className={`overflow-y-auto p-4 pl-2 transition-all duration-300 ${
            showComparison ? 'w-[45%]' : 'w-[35%]'
          }`}
        >
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

      <ProductTour
        open={productTourOpen}
        onClose={() => {
          setProductTourOpen(false);
          setProductTourFromOnboarding(false);
        }}
        profileId={activeProfileId}
        markCompleteOnFinish={productTourFromOnboarding}
      />
    </div>
  );
}

export default App;
