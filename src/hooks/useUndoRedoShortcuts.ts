import { useEffect } from 'react';
import { useHistoryStore } from '../store/historyStore';

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  if (el.isContentEditable) return true;
  return false;
}

export function useUndoRedoShortcuts() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      const isUndo = key === 'z' && !e.shiftKey;
      const isRedo = (key === 'y') || (key === 'z' && e.shiftKey);
      if (!isUndo && !isRedo) return;
      // Let browser handle native undo inside text inputs
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      const store = useHistoryStore.getState();
      if (isUndo) void store.undo();
      else void store.redo();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
