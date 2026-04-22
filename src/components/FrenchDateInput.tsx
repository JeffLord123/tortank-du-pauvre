/** Custom date picker avec calendrier popover — format d'affichage fr-FR, valeur ISO. */
import { useState, useRef, useEffect, useCallback } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

function isoToFrDisplay(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR');
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseIso(iso: string): { y: number; m: number; d: number } | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
}

const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const JOURS_FR = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Indice de la première case (lundi = 0). */
function firstWeekday(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

// ─── CalendarPopover ─────────────────────────────────────────────────────────

interface CalendarProps {
  value: string;
  onChange: (iso: string) => void;
  onClose: () => void;
}

function CalendarPopover({ value, onChange, onClose }: CalendarProps) {
  const today = new Date();
  const parsed = parseIso(value);

  const [viewYear, setViewYear] = useState(parsed?.y ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.m ?? today.getMonth());
  const [hovered, setHovered] = useState<number | null>(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startOffset = firstWeekday(viewYear, viewMonth);
  const cells = startOffset + totalDays;
  const totalCells = Math.ceil(cells / 7) * 7;

  const isSelected = (d: number) =>
    parsed?.y === viewYear && parsed?.m === viewMonth && parsed?.d === d;

  const isToday = (d: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === d;

  const handleDay = (d: number) => {
    onChange(toIso(viewYear, viewMonth, d));
    onClose();
  };

  const handleClear = () => { onChange(''); onClose(); };
  const handleToday = () => {
    onChange(toIso(today.getFullYear(), today.getMonth(), today.getDate()));
    onClose();
  };

  return (
    <div
      className="select-none"
      style={{ fontFamily: 'var(--font-sans, system-ui)' }}
      onMouseDown={e => e.preventDefault()}
    >
      {/* Header navigation */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button
          onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-md text-fg/50 hover:text-teal-400 hover:bg-teal-400/10 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-fg tracking-tight">
            {MOIS_FR[viewMonth]}
          </span>
          <span className="text-sm font-mono text-fg/50">{viewYear}</span>
        </div>

        <button
          onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-md text-fg/50 hover:text-teal-400 hover:bg-teal-400/10 transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 px-3 mb-1">
        {JOURS_FR.map(j => (
          <div
            key={j}
            className="h-7 flex items-center justify-center text-[10px] font-medium uppercase tracking-widest text-fg/35"
          >
            {j}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
        {Array.from({ length: totalCells }, (_, i) => {
          const day = i - startOffset + 1;
          const valid = day >= 1 && day <= totalDays;

          if (!valid) {
            return <div key={i} />;
          }

          const sel = isSelected(day);
          const tod = isToday(day);
          const hov = hovered === day;
          const isSat = (startOffset + day - 1) % 7 === 5;
          const isSun = (startOffset + day - 1) % 7 === 6;
          const isWeekend = isSat || isSun;

          return (
            <button
              key={i}
              onClick={() => handleDay(day)}
              onMouseEnter={() => setHovered(day)}
              onMouseLeave={() => setHovered(null)}
              className={[
                'h-8 w-full flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-100',
                sel
                  ? 'bg-teal-400 text-navy-950 font-bold shadow-[0_0_12px_rgba(var(--accent-glow-rgb),0.4)]'
                  : tod
                  ? 'bg-teal-400/15 text-teal-400 ring-1 ring-teal-400/40'
                  : hov
                  ? 'bg-navy-700/80 text-fg'
                  : isWeekend
                  ? 'text-fg/45 hover:text-fg/70'
                  : 'text-fg/80 hover:text-fg',
              ].join(' ')}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-navy-700/60">
        <button
          onClick={handleClear}
          className="text-xs text-fg/40 hover:text-coral-400 transition-colors font-medium"
        >
          Effacer
        </button>
        <button
          onClick={handleToday}
          className="text-xs text-teal-400/80 hover:text-teal-400 transition-colors font-medium"
        >
          Aujourd'hui
        </button>
      </div>
    </div>
  );
}

// ─── FrenchDateInput ─────────────────────────────────────────────────────────

type Size = 'sm' | 'md';

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  'aria-label'?: string;
  size?: Size;
};

export default function FrenchDateInput({
  value,
  onChange,
  className = '',
  id,
  'aria-label': ariaLabel,
  size = 'md',
}: Props) {
  const shown = isoToFrDisplay(value);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Ferme le popover si clic à l'extérieur
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  // Ferme sur Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, close]);

  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-1 text-xs gap-1.5'
    : 'px-3 py-2 text-sm gap-2';

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <div ref={wrapperRef} className={`relative min-w-0 ${className}`}>
      {/* Trigger */}
      <div
        id={id}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setOpen(o => !o)}
        className={[
          'flex w-full items-center tabular-nums cursor-pointer select-none',
          'rounded-lg border transition-all duration-150',
          'bg-navy-800/70 backdrop-blur-sm',
          sizeClasses,
          open
            ? 'border-teal-400/60 ring-2 ring-teal-400/15 shadow-[0_0_0_1px_rgba(var(--accent-glow-rgb),0.12)]'
            : 'border-navy-600/50 hover:border-navy-600/80 hover:bg-navy-800/90',
        ].join(' ')}
      >
        <CalendarDays className={`${iconSize} shrink-0 transition-colors duration-150 ${
          open ? 'text-teal-400' : 'text-fg/40'
        }`} />
        <span className={`flex-1 font-mono leading-none ${!shown ? 'text-fg/35' : 'text-fg'}`}>
          {shown || 'jj/mm/aaaa'}
        </span>
        {shown && (
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400/70 shrink-0" />
        )}
      </div>

      {/* Popover */}
      {open && (
        <div
          role="dialog"
          aria-label="Calendrier"
          className={[
            'absolute z-50 mt-1.5 w-[17rem]',
            'bg-navy-900/95 backdrop-blur-xl',
            'border border-navy-700/80',
            'rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.45),0_2px_8px_rgba(0,0,0,0.3)]',
            'ring-1 ring-white/5',
            // Ouvre vers le bas par défaut ; si on veut vers le haut : bottom-full mb-1.5
          ].join(' ')}
        >
          <CalendarPopover
            value={value}
            onChange={onChange}
            onClose={close}
          />
        </div>
      )}
    </div>
  );
}
