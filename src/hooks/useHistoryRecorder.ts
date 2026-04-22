import { useEffect } from 'react';
import { useHistoryStore } from '../store/historyStore';
import { useSimulationStore } from '../store/simulationStore';
import { useVersionStore } from '../store/versionStore';

/**
 * Subscribes to every store whose state should be captured by the history stack
 * and schedules a debounced commit on any change. Also flushes pending commits
 * on user "release" signals (input blur, pointerup) so a drag/slider/input
 * collapses to a single undo entry.
 */
export function useHistoryRecorder() {
  useEffect(() => {
    let mounted = true;
    useHistoryStore.getState().init().then(() => {
      if (!mounted) return;
    });

    const schedule = () => useHistoryStore.getState().schedulePush();
    const flush = () => useHistoryStore.getState().flushPending();

    const unsubSim = useSimulationStore.subscribe(() => schedule());
    const unsubVer = useVersionStore.subscribe(() => schedule());

    // Theme changes are applied on document.documentElement classList
    const themeObserver = new MutationObserver(() => schedule());
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // Flush on user "release" signals
    const onPointerUp = () => flush();
    const onBlur = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') flush();
    };
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('blur', onBlur, true);

    return () => {
      mounted = false;
      unsubSim();
      unsubVer();
      themeObserver.disconnect();
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('blur', onBlur, true);
    };
  }, []);
}
