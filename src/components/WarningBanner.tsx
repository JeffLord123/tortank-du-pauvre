import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { getPrimaryWarning, type Warning } from '../store/simulationStore';

interface Props {
  warnings: Warning[];
}

export default function WarningBanner({ warnings }: Props) {
  if (warnings.length === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm bg-fg/[0.03] border border-fg/10 text-fg/38">
        <CheckCircle className="w-4 h-4 shrink-0" />
        <span>Aucune alerte</span>
      </div>
    );
  }

  const first = getPrimaryWarning(warnings);
  if (!first) {
    return null;
  }

  const styles = {
    error:   'bg-coral-500/10 border border-coral-500/20 text-coral-400',
    warning: 'bg-amber-500/10 border border-amber-500/20 text-amber-400',
    info:    'bg-sky-500/10 border border-sky-500/20 text-sky-400',
  };

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${styles[first.kind]}`}>
      {first.kind === 'error' ? (
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      ) : (
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
      )}
      <span className="flex-1">{first.message}</span>
      {warnings.length > 1 && (
        <span className="shrink-0 text-[11px] opacity-60">+{warnings.length - 1}</span>
      )}
    </div>
  );
}
