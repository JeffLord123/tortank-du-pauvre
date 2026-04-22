import { useEffect } from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useToastStore, type Toast } from '../store/toastStore';

const DURATION_MS = 10_000;

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), DURATION_MS);
    return () => clearTimeout(t);
  }, [toast.id, dismiss]);

  const { Icon, color } =
    toast.kind === 'success'
      ? { Icon: CheckCircle2, color: 'text-teal-400' }
      : toast.kind === 'warning'
        ? { Icon: AlertTriangle, color: 'text-amber-400' }
        : { Icon: Info, color: 'text-sky-400' };

  return (
    <div
      role="status"
      className="pointer-events-auto flex items-start gap-3 bg-navy-900/95 backdrop-blur-sm border border-navy-600/50 rounded-xl shadow-2xl shadow-black/40 px-3.5 py-3 w-[340px] animate-fade-in"
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-fg/92 leading-tight">{toast.title}</div>
        {toast.lines && toast.lines.length > 0 && (
          <ul className="mt-1.5 space-y-0.5 text-[11px] text-fg/70 leading-snug">
            {toast.lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        className="p-0.5 rounded-md text-fg/45 hover:text-fg/80 hover:bg-fg/10 transition-colors"
        title="Fermer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[200] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  );
}
