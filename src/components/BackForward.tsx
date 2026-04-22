import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useHistoryStore } from '../store/historyStore';

function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
}

export default function BackForward() {
  const past = useHistoryStore(s => s.past);
  const future = useHistoryStore(s => s.future);
  const undo = useHistoryStore(s => s.undo);
  const redo = useHistoryStore(s => s.redo);

  const canUndo = past.length > 1;
  const canRedo = future.length > 0;
  const mac = isMac();

  const prevEntry = canUndo ? past[past.length - 2] : null;
  const nextEntry = canRedo ? future[future.length - 1] : null;

  const undoHint = `${mac ? '⌘Z' : 'Ctrl+Z'}${prevEntry ? ` · ${prevEntry.actionLabel}` : ''}`;
  const redoHint = `${mac ? '⌘Y' : 'Ctrl+Y'}${nextEntry ? ` · ${nextEntry.actionLabel}` : ''}`;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => void undo()}
        disabled={!canUndo}
        title={canUndo ? `Arrière — ${undoHint}` : 'Rien à annuler'}
        aria-label="Arrière"
        className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-400/85 text-white shadow-sm hover:bg-sky-400 disabled:bg-fg/10 disabled:text-fg/30 disabled:cursor-not-allowed transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
      </button>
      <button
        type="button"
        onClick={() => void redo()}
        disabled={!canRedo}
        title={canRedo ? `Avant — ${redoHint}` : 'Rien à refaire'}
        aria-label="Avant"
        className="flex items-center justify-center w-8 h-8 rounded-full bg-navy-600 text-white shadow-sm hover:bg-navy-500 disabled:bg-fg/10 disabled:text-fg/30 disabled:cursor-not-allowed transition-colors"
      >
        <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}
