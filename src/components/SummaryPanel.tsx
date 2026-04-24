import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSimulationStore } from '../store/simulationStore';
import { useVersionStore } from '../store/versionStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx';
import {
  TrendingUp,
  TrendingDown,
  Hash,
  Eye,
  Repeat,
  Layers,
  Store,
  Info,
  Target,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Table2,
  X,
  ChevronsUpDown,
  Download,
} from 'lucide-react';
import { formatNum, formatImpressions } from '../utils/formatNum';
import { getHypothesisAccentColor } from '../utils/hypothesisAccent';
import { getMarginThreshold } from '../data/defaults';
import NumInput from './NumInput';

function CoverageKPI({ coverage, detail }: { coverage: number; detail: { name: string; coverage: number }[] }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nonExposureProduct = detail.reduce((prod, l) => prod * (1 - l.coverage / 100), 1);

  function handleEnter() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (iconRef.current) {
      const r = iconRef.current.getBoundingClientRect();
      setPos({ top: r.top, left: r.left - 8 });
    }
    setShow(true);
  }
  function handleLeave() {
    hideTimer.current = setTimeout(() => setShow(false), 120);
  }

  return (
    <div className="glass-card p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-5 h-5 rounded-md bg-teal-400/10 flex items-center justify-center">
          <Eye className="w-3 h-3 text-teal-400" />
        </div>
        <span className="text-[10px] uppercase tracking-wider text-fg/60">Couverture</span>
        {detail.length > 0 && (
          <div ref={iconRef} className="ml-auto" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
            <Info className="w-3.5 h-3.5 text-fg/40 hover:text-fg/70 cursor-help transition-colors" />
          </div>
        )}
      </div>
      <span className="text-lg font-bold font-mono">{coverage}%</span>
      {show &&
        detail.length > 0 &&
        createPortal(
          <div
            className="fixed z-[9999] w-64 p-3 rounded-lg shadow-xl text-xs border"
            style={{
              top: pos.top,
              left: pos.left,
              transform: 'translate(-100%, -100%)',
              background: 'var(--chart-tooltip-bg)',
              borderColor: 'var(--chart-tooltip-border)',
              color: 'var(--chart-tooltip-fg)',
            }}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            <p className="font-semibold mb-1.5">Couverture dédupliquée</p>
            {detail.map((l, i) => (
              <div key={i} className="flex justify-between py-0.5">
                <span>{l.name}</span>
                <span className="font-mono">1 − {l.coverage}% = {Math.round((1 - l.coverage / 100) * 1000) / 10}%</span>
              </div>
            ))}
            <div className="border-t border-fg/10 mt-1.5 pt-1.5 space-y-0.5">
              <div className="flex justify-between">
                <span>∏ non-exposition</span>
                <span className="font-mono">{Math.round(nonExposureProduct * 1000) / 10}%</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>1 − {Math.round(nonExposureProduct * 1000) / 10}%</span>
                <span className="font-mono text-teal-400">{coverage}%</span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function CoverageRepKPI({ coverage, avgRepetition, detail }: { coverage: number; avgRepetition: number; detail: { name: string; coverage: number }[] }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nonExposureProduct = detail.reduce((prod, l) => prod * (1 - l.coverage / 100), 1);

  function handleEnter() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (iconRef.current) {
      const r = iconRef.current.getBoundingClientRect();
      setPos({ top: r.top, left: r.left - 8 });
    }
    setShow(true);
  }
  function handleLeave() {
    hideTimer.current = setTimeout(() => setShow(false), 120);
  }

  return (
    <div className="glass-card p-3 h-full flex flex-col">
      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-teal-400/10 flex items-center justify-center">
              <Eye className="w-3 h-3 text-teal-400" />
            </div>
            <span className="text-[10px] uppercase tracking-wider text-fg/60">Couverture</span>
            {detail.length > 0 && (
              <div ref={iconRef} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
                <Info className="w-3.5 h-3.5 text-fg/40 hover:text-fg/70 cursor-help transition-colors" />
              </div>
            )}
          </div>
          <span className="text-2xl font-bold font-mono">{coverage}%</span>
        </div>
        <div className="w-full border-t border-fg/10" />
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-teal-400/10 flex items-center justify-center">
              <Repeat className="w-3 h-3 text-teal-400" />
            </div>
            <span className="text-[10px] uppercase tracking-wider text-fg/60">Rép. moy.</span>
          </div>
          <span className="text-2xl font-bold font-mono">{avgRepetition}×</span>
        </div>
      </div>
      {show &&
        detail.length > 0 &&
        createPortal(
          <div
            className="fixed z-[9999] w-64 p-3 rounded-lg shadow-xl text-xs border"
            style={{
              top: pos.top,
              left: pos.left,
              transform: 'translate(-100%, -100%)',
              background: 'var(--chart-tooltip-bg)',
              borderColor: 'var(--chart-tooltip-border)',
              color: 'var(--chart-tooltip-fg)',
            }}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            <p className="font-semibold mb-1.5">Couverture dédupliquée</p>
            {detail.map((l, i) => (
              <div key={i} className="flex justify-between py-0.5">
                <span>{l.name}</span>
                <span className="font-mono">1 − {l.coverage}% = {Math.round((1 - l.coverage / 100) * 1000) / 10}%</span>
              </div>
            ))}
            <div className="border-t border-fg/10 mt-1.5 pt-1.5 space-y-0.5">
              <div className="flex justify-between">
                <span>∏ non-exposition</span>
                <span className="font-mono">{Math.round(nonExposureProduct * 1000) / 10}%</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>1 − {Math.round(nonExposureProduct * 1000) / 10}%</span>
                <span className="font-mono text-teal-400">{coverage}%</span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

type StoreBudgetRow = {
  id: string;
  name: string;
  population: number;
  weightPercent: number;
  budget: number;
  coverage: number;
  repetition: number;
};
type StoreSortKey = 'name' | 'population' | 'weight' | 'budget' | 'coverage' | 'repetition';

type LeverRecapRow = {
  id: string;
  name: string;
  budget: number;
  impressions: number;
  coverage: number;
  repetition: number;
  cpm: number;
};
type LeverSortKey = 'name' | 'budget' | 'impressions' | 'coverage' | 'repetition' | 'cpm';

function exportStoreBudgetsToXlsx(rows: StoreBudgetRow[], hypothesisName: string) {
  const sheetRows = rows.map((row, i) => ({
    '#': i + 1,
    Magasin: row.name,
    Population: row.population,
    'Poids %': row.weightPercent,
    'Couverture %': row.coverage,
    Répétition: row.repetition,
    'Budget (€)': row.budget,
  }));
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Points de vente');
  const safe = hypothesisName.replace(/[/\\?%*:|"<>]/g, '-').trim().slice(0, 80) || 'export';
  XLSX.writeFile(wb, `points-de-vente-budgets-${safe}.xlsx`);
}

function exportLeversRecapToXlsx(rows: LeverRecapRow[], hypothesisName: string) {
  const sheetRows = rows.map((row, i) => ({
    '#': i + 1,
    Levier: row.name,
    'Budget (€)': row.budget,
    Impressions: row.impressions,
    'Couverture %': row.coverage,
    Répétition: row.repetition,
    'CPM (€)': row.cpm,
  }));
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leviers');
  const safe = hypothesisName.replace(/[/\\?%*:|"<>]/g, '-').trim().slice(0, 80) || 'export';
  XLSX.writeFile(wb, `leviers-recap-${safe}.xlsx`);
}

function StoreBudgetsDialog({
  open,
  onClose,
  rows,
  hypothesisName,
}: {
  open: boolean;
  onClose: () => void;
  rows: StoreBudgetRow[];
  hypothesisName: string;
}) {
  const [sortKey, setSortKey] = useState<StoreSortKey>('budget');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    const m = sortDir === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      if (sortKey === 'name') return m * a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
      if (sortKey === 'population') return m * (a.population - b.population);
      if (sortKey === 'weight') return m * (a.weightPercent - b.weightPercent);
      if (sortKey === 'coverage') return m * (a.coverage - b.coverage);
      if (sortKey === 'repetition') return m * (a.repetition - b.repetition);
      return m * (a.budget - b.budget);
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const onSort = useCallback(
    (key: StoreSortKey) => {
      if (key === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
      else {
        setSortKey(key);
        setSortDir(key === 'name' ? 'asc' : 'desc');
      }
    },
    [sortKey],
  );

  useEffect(() => {
    if (open) {
      setSortKey('budget');
      setSortDir('desc');
    }
  }, [open]);

  if (!open) return null;

  // Portail : le parent du récap a `animate-slide-in` (transform) ce qui
  // requalifie `position: fixed` sur le conteneur du panel au lieu de la fenêtre.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-navy-900 border border-navy-600/50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-fg/12 shrink-0 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-400/10 flex items-center justify-center shrink-0">
              <Table2 className="w-4 h-4 text-teal-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate">Points de vente — budgets</h2>
              <p className="text-[10px] text-fg/60 truncate">{hypothesisName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {sortedRows.length > 0 && (
              <button
                type="button"
                onClick={() => exportStoreBudgetsToXlsx(sortedRows, hypothesisName)}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] uppercase tracking-wider text-teal-400/90 hover:text-teal-300 border border-teal-400/25 hover:border-teal-400/45 bg-teal-400/5 hover:bg-teal-400/10 transition-colors"
                title="Télécharger le tableau (Excel)"
              >
                <Download className="w-3.5 h-3.5" />
                Export .xlsx
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-fg/10 text-fg/72 hover:text-fg transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-auto flex-1 min-h-0 px-4 py-3">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-fg/12 text-[10px] uppercase tracking-wider text-fg/55">
                <th className="py-2 pr-3 font-medium w-10">#</th>
                <th className="py-2 pr-3 font-medium">
                  <button
                    type="button"
                    onClick={() => onSort('name')}
                    className="inline-flex items-center gap-1 hover:text-fg/88 transition-colors"
                  >
                    Magasin
                    <SortGlyph active={sortKey === 'name'} dir={sortDir} />
                  </button>
                </th>
                <th className="py-2 pr-3 font-medium text-right w-32">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onSort('population')}
                      className="inline-flex items-center gap-1 hover:text-fg/88 transition-colors"
                    >
                      Population
                      <SortGlyph active={sortKey === 'population'} dir={sortDir} />
                    </button>
                  </div>
                </th>
                <th
                  className="py-2 pr-3 font-medium text-right w-24"
                  title="Pondération (poids % dans Admin → Magasins). Sert au mode de répartition « Pondéré »."
                >
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onSort('weight')}
                      className="inline-flex items-center gap-1 hover:text-fg/88 transition-colors"
                    >
                      Poids
                      <SortGlyph active={sortKey === 'weight'} dir={sortDir} />
                    </button>
                  </div>
                </th>
                <th className="py-2 pr-3 font-medium text-right w-24">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onSort('coverage')}
                      className="inline-flex items-center gap-1 hover:text-fg/88 transition-colors"
                    >
                      Couv.
                      <SortGlyph active={sortKey === 'coverage'} dir={sortDir} />
                    </button>
                  </div>
                </th>
                <th className="py-2 pr-3 font-medium text-right w-24">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onSort('repetition')}
                      className="inline-flex items-center gap-1 hover:text-fg/88 transition-colors"
                    >
                      Rép.
                      <SortGlyph active={sortKey === 'repetition'} dir={sortDir} />
                    </button>
                  </div>
                </th>
                <th className="py-2 font-medium text-right w-32">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onSort('budget')}
                      className="inline-flex items-center gap-1 hover:text-fg/88 transition-colors"
                    >
                      Budget
                      <SortGlyph active={sortKey === 'budget'} dir={sortDir} />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-fg/50">
                    Aucun magasin
                  </td>
                </tr>
              ) : (
                sortedRows.map((row, i) => (
                  <tr key={row.id} className="border-b border-fg/8 hover:bg-fg/5">
                    <td className="py-2 pr-3 text-fg/45 font-mono tabular-nums">{i + 1}</td>
                    <td className="py-2 pr-3 text-fg/90 align-top break-words max-w-[min(280px,50vw)]">{row.name}</td>
                    <td className="py-2 pr-3 text-right font-mono text-fg/82 tabular-nums">{formatNum(row.population)}</td>
                    <td className="py-2 pr-3 text-right font-mono text-fg/82 tabular-nums">
                      {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 0 }).format(row.weightPercent)}&nbsp;%
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-fg/82 tabular-nums">{row.coverage}%</td>
                    <td className="py-2 pr-3 text-right font-mono text-fg/82 tabular-nums">{row.repetition}×</td>
                    <td className="py-2 text-right font-mono text-teal-400/95 tabular-nums">{formatNum(row.budget)} €</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function LeversRecapDialog({
  open,
  onClose,
  rows,
  hypothesisName,
}: {
  open: boolean;
  onClose: () => void;
  rows: LeverRecapRow[];
  hypothesisName: string;
}) {
  const [sortKey, setSortKey] = useState<LeverSortKey>('budget');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    const m = sortDir === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      if (sortKey === 'name') return m * a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
      if (sortKey === 'impressions') return m * (a.impressions - b.impressions);
      if (sortKey === 'coverage') return m * (a.coverage - b.coverage);
      if (sortKey === 'repetition') return m * (a.repetition - b.repetition);
      if (sortKey === 'cpm') return m * (a.cpm - b.cpm);
      return m * (a.budget - b.budget);
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const onSort = useCallback(
    (key: LeverSortKey) => {
      if (key === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
      else {
        setSortKey(key);
        setSortDir(key === 'name' ? 'asc' : 'desc');
      }
    },
    [sortKey],
  );

  useEffect(() => {
    if (open) {
      setSortKey('budget');
      setSortDir('desc');
    }
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-navy-900 border border-navy-600/50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-fg/12 shrink-0 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-400/10 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-teal-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate">Leviers — détail</h2>
              <p className="text-[10px] text-fg/60 truncate">{hypothesisName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {sortedRows.length > 0 && (
              <button
                type="button"
                onClick={() => exportLeversRecapToXlsx(sortedRows, hypothesisName)}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] uppercase tracking-wider text-teal-400/90 hover:text-teal-300 border border-teal-400/25 hover:border-teal-400/45 bg-teal-400/5 hover:bg-teal-400/10 transition-colors"
                title="Télécharger le tableau (Excel)"
              >
                <Download className="w-3.5 h-3.5" />
                Export .xlsx
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-fg/10 text-fg/72 hover:text-fg transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-auto flex-1 min-h-0 px-4 py-3">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-fg/12 text-[10px] uppercase tracking-wider text-fg/55">
                <th className="py-2 pr-3 font-medium w-10">#</th>
                <th className="py-2 pr-3 font-medium">
                  <button
                    type="button"
                    onClick={() => onSort('name')}
                    className="inline-flex items-center gap-1 hover:text-fg/88 transition-colors"
                  >
                    Levier
                    <SortGlyph active={sortKey === 'name'} dir={sortDir} />
                  </button>
                </th>
                <th className="py-2 pr-3 font-medium text-right w-28">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onSort('budget')}
                      className="inline-flex items-center gap-1 hover:text-fg/88 transition-colors"
                    >
                      Budget
                      <SortGlyph active={sortKey === 'budget'} dir={sortDir} />
                    </button>
                  </div>
                </th>
                <th className="py-2 pr-3 font-medium text-right w-28">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onSort('impressions')}
                      className="inline-flex items-center gap-1 hover:text-fg/88 transition-colors"
                    >
                      Impr.
                      <SortGlyph active={sortKey === 'impressions'} dir={sortDir} />
                    </button>
                  </div>
                </th>
                <th className="py-2 pr-3 font-medium text-right w-20">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onSort('coverage')}
                      className="inline-flex items-center gap-1 hover:text-fg/88 transition-colors"
                    >
                      Couv.
                      <SortGlyph active={sortKey === 'coverage'} dir={sortDir} />
                    </button>
                  </div>
                </th>
                <th className="py-2 pr-3 font-medium text-right w-20">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onSort('repetition')}
                      className="inline-flex items-center gap-1 hover:text-fg/88 transition-colors"
                    >
                      Rép.
                      <SortGlyph active={sortKey === 'repetition'} dir={sortDir} />
                    </button>
                  </div>
                </th>
                <th className="py-2 font-medium text-right w-24">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onSort('cpm')}
                      className="inline-flex items-center gap-1 hover:text-fg/88 transition-colors"
                    >
                      CPM
                      <SortGlyph active={sortKey === 'cpm'} dir={sortDir} />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-fg/50">
                    Aucun levier
                  </td>
                </tr>
              ) : (
                sortedRows.map((row, i) => (
                  <tr key={row.id} className="border-b border-fg/8 hover:bg-fg/5">
                    <td className="py-2 pr-3 text-fg/45 font-mono tabular-nums">{i + 1}</td>
                    <td className="py-2 pr-3 text-fg/90 align-top break-words max-w-[min(280px,45vw)]">{row.name}</td>
                    <td className="py-2 pr-3 text-right font-mono text-teal-400/95 tabular-nums">{formatNum(row.budget)} €</td>
                    <td className="py-2 pr-3 text-right font-mono text-fg/82 tabular-nums">{formatImpressions(row.impressions)}</td>
                    <td className="py-2 pr-3 text-right font-mono text-fg/82 tabular-nums">{row.coverage}%</td>
                    <td className="py-2 pr-3 text-right font-mono text-fg/82 tabular-nums">{row.repetition}×</td>
                    <td className="py-2 text-right font-mono text-fg/82 tabular-nums">{formatNum(row.cpm)} €</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SortGlyph({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 text-fg/35" />;
  return <span className="text-teal-400 font-mono text-[10px]">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export default function SummaryPanel() {
  const { simulation, activeHypothesisId, getHypothesisSummary, updateHypothesis } = useSimulationStore();
  const activeVersion = useVersionStore(s => s.activeVersion);
  const [storeTableOpen, setStoreTableOpen] = useState(false);
  const [leversTableOpen, setLeversTableOpen] = useState(false);

  if (!simulation || !activeHypothesisId) return null;

  const summary = getHypothesisSummary(activeHypothesisId);
  const hypothesis = simulation.hypotheses.find(h => h.id === activeHypothesisId);
  const activeHypothesisIndex = simulation.hypotheses.findIndex(h => h.id === activeHypothesisId);
  const recapAccent = getHypothesisAccentColor(activeHypothesisIndex >= 0 ? activeHypothesisIndex : 0);

  if (!summary || !hypothesis) {
    return (
      <div className="glass-card p-4 text-center">
        <Layers className="w-8 h-8 text-fg/42 mx-auto mb-3" />
        <p className="text-sm text-fg/60">
          Ajoutez des leviers ou des prestations additionnelles pour voir le récapitulatif
        </p>
      </div>
    );
  }

  const totalImpressions = summary.leverBreakdown.reduce((s, l) => s + l.impressions, 0);
  const leversBudgetUsed = summary.totalBudget;

  const prestations = hypothesis.prestations ?? [];
  const prestationsBilled = prestations.reduce((s, p) => s + (p.offered ? 0 : p.price * (p.quantity ?? 1)), 0);
  const hasPrestations = prestations.length > 0;
  const grandTotal = leversBudgetUsed + prestationsBilled;

  const leverRows: LeverRecapRow[] = summary.leverBreakdown.map(l => ({
    id: l.id,
    name: l.name,
    budget: l.budget,
    impressions: l.impressions,
    coverage: l.coverage,
    repetition: l.repetition,
    cpm: l.cpm,
  }));
  const sortedLeversByBudget = [...leverRows].sort((a, b) => a.budget - b.budget);
  const minLever = sortedLeversByBudget[0];
  const maxLever = sortedLeversByBudget[sortedLeversByBudget.length - 1];

  return (
    <div className="space-y-4 animate-slide-in">
      {/* Title + accent bar (même code couleur que le bandeau de l’hypothèse) */}
      <div className="flex items-center gap-3 min-w-0">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg/72 shrink-0">
          Récapitulatif · {hypothesis.name}
        </h3>
        <div
          className="flex-1 min-w-0 h-1.5 rounded-full"
          style={{ backgroundColor: recapAccent }}
          aria-hidden
        />
      </div>

      {/* KPIs grid */}
      {activeVersion === 'v2' ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-3 h-full flex flex-col">
            <div className="flex flex-col items-center justify-center flex-1 gap-4">
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-teal-400/10 flex items-center justify-center">
                    <Target className="w-3 h-3 text-teal-400" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-fg/60">Objectif budget</span>
                </div>
                <span className="text-2xl font-bold font-mono">{formatNum(hypothesis.totalBudget)}€</span>
              </div>
              <div className="w-full border-t border-fg/10" />
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-teal-400/10 flex items-center justify-center">
                    <TrendingUp className="w-3 h-3 text-teal-400" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-fg/60">Budget hypo. réel</span>
                </div>
                <span className="text-2xl font-bold font-mono text-teal-400">{formatNum(leversBudgetUsed)}€</span>
              </div>
            </div>
          </div>

          <CoverageRepKPI coverage={summary.generalCoverage} avgRepetition={summary.avgRepetition} detail={summary.coverageDetail} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-md bg-teal-400/10 flex items-center justify-center">
                <TrendingUp className="w-3 h-3 text-teal-400" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-fg/60">Budget hypo.</span>
            </div>
            <span className="text-lg font-bold font-mono text-teal-400">{formatNum(summary.totalBudget)}€</span>
          </div>

          <div className="glass-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-md bg-teal-400/10 flex items-center justify-center">
                <Hash className="w-3 h-3 text-teal-400" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-fg/60">Leviers</span>
            </div>
            <span className="text-lg font-bold font-mono">{summary.leverCount}</span>
          </div>

          <CoverageKPI coverage={summary.generalCoverage} detail={summary.coverageDetail} />

          <div className="glass-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-md bg-teal-400/10 flex items-center justify-center">
                <Repeat className="w-3 h-3 text-teal-400" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-fg/60">Rép. moy.</span>
            </div>
            <span className="text-lg font-bold font-mono">{summary.avgRepetition}×</span>
          </div>
        </div>
      )}

      {/* Récapitulatif marge */}
      <MargeRecap
        realBudget={leversBudgetUsed}
        grandTotal={grandTotal}
        prestationsBilled={prestationsBilled}
        hasPrestations={hasPrestations}
        retrocommissionPercent={hypothesis.retrocommissionPercent ?? 0}
        onRetroChange={v => updateHypothesis(activeHypothesisId, { retrocommissionPercent: v })}
        purchaseTotal={summary.purchaseTotal}
        retrocommissionAmount={summary.retrocommissionAmount}
        marginAmount={summary.marginAmount}
        marginPercent={summary.marginPercent}
      />

      {/* Impressions total */}
      <div className="glass-card p-3 text-left">
        <span className="text-[10px] uppercase tracking-wider text-fg/60 block mb-1">Total impressions</span>
        <div className="text-xl font-bold font-mono text-teal-400">{formatImpressions(totalImpressions)}</div>
      </div>

      {/* Store extremes */}
      <div className="glass-card p-3 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Store className="w-3.5 h-3.5 text-fg/60 shrink-0" />
          <span className="text-[10px] uppercase tracking-wider text-fg/60">Points de vente</span>
          <button
            type="button"
            onClick={() => setStoreTableOpen(true)}
            className="ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-teal-400/90 hover:text-teal-300 px-2 py-1 rounded-lg border border-teal-400/25 hover:border-teal-400/45 bg-teal-400/5 transition-colors"
          >
            <Table2 className="w-3 h-3" />
            Détail
          </button>
        </div>
        <div className="flex items-start justify-between text-xs gap-2">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <TrendingDown className="w-3 h-3 text-coral-400 shrink-0 mt-0.5" />
            <span className="text-fg/82 min-w-0 break-words line-clamp-2 leading-snug">
              {summary.minStore.name}
            </span>
          </div>
          <span className="font-mono text-coral-400 shrink-0 self-start pt-0.5">{formatNum(summary.minStore.budget)}€</span>
        </div>
        <div className="flex items-start justify-between text-xs gap-2">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <TrendingUp className="w-3 h-3 text-teal-400 shrink-0 mt-0.5" />
            <span className="text-fg/82 min-w-0 break-words line-clamp-2 leading-snug">
              {summary.maxStore.name}
            </span>
          </div>
          <span className="font-mono text-teal-400 shrink-0 self-start pt-0.5">{formatNum(summary.maxStore.budget)}€</span>
        </div>
      </div>

      <StoreBudgetsDialog
        open={storeTableOpen}
        onClose={() => setStoreTableOpen(false)}
        rows={summary.storeBudgets}
        hypothesisName={hypothesis.name}
      />

      {/* Leviers — même logique que « Points de vente » : min / max budget + tableau */}
      {leverRows.length > 0 && minLever && maxLever && (
        <>
          <div className="glass-card p-3 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-3.5 h-3.5 text-fg/60 shrink-0" />
              <span className="text-[10px] uppercase tracking-wider text-fg/60">Leviers</span>
              <button
                type="button"
                onClick={() => setLeversTableOpen(true)}
                className="ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-teal-400/90 hover:text-teal-300 px-2 py-1 rounded-lg border border-teal-400/25 hover:border-teal-400/45 bg-teal-400/5 transition-colors"
              >
                <Table2 className="w-3 h-3" />
                Détail
              </button>
            </div>
            <div className="flex items-start justify-between text-xs gap-2">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <TrendingDown className="w-3 h-3 text-coral-400 shrink-0 mt-0.5" />
                <span className="text-fg/82 min-w-0 break-words line-clamp-2 leading-snug">{minLever.name}</span>
              </div>
              <span className="font-mono text-coral-400 shrink-0 self-start pt-0.5">{formatNum(minLever.budget)}€</span>
            </div>
            <div className="flex items-start justify-between text-xs gap-2">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <TrendingUp className="w-3 h-3 text-teal-400 shrink-0 mt-0.5" />
                <span className="text-fg/82 min-w-0 break-words line-clamp-2 leading-snug">{maxLever.name}</span>
              </div>
              <span className="font-mono text-teal-400 shrink-0 self-start pt-0.5">{formatNum(maxLever.budget)}€</span>
            </div>
          </div>

          <LeversRecapDialog
            open={leversTableOpen}
            onClose={() => setLeversTableOpen(false)}
            rows={leverRows}
            hypothesisName={hypothesis.name}
          />
        </>
      )}

      {/* Pie chart — Recharts 3: ResponsiveContainer needs a positive measured size; minWidth avoids flex 0-width */}
      <div className="glass-card p-4 min-w-0 w-full">
        <h4 className="text-[10px] uppercase tracking-wider text-fg/60 mb-3">Répartition budget</h4>
        <div className="h-[160px] w-full min-w-[180px]">
          <ResponsiveContainer width="100%" height={160} minWidth={180} debounce={32}>
            <PieChart>
              <Pie
                data={summary.leverBreakdown}
                dataKey="budget"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={3}
                strokeWidth={0}
              >
                {summary.leverBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--chart-tooltip-bg)',
                  border: '1px solid var(--chart-tooltip-border)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: 'var(--chart-tooltip-fg)',
                }}
                formatter={(value) => [`${formatNum(Number(value))}€`, 'Budget']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {summary.leverBreakdown.map((entry, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] text-fg/82">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </div>
          ))}
        </div>
      </div>

      {/* Bar chart - impressions */}
      <div className="glass-card p-4 min-w-0 w-full">
        <h4 className="text-[10px] uppercase tracking-wider text-fg/60 mb-3">Impressions par levier</h4>
        <div className="h-[140px] w-full min-w-[180px]">
          <ResponsiveContainer width="100%" height={140} minWidth={180} debounce={32}>
            <BarChart data={summary.leverBreakdown} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'var(--chart-tick)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--chart-tick)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => formatImpressions(Number(v))}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--chart-tooltip-bg)',
                  border: '1px solid var(--chart-tooltip-border)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: 'var(--chart-tooltip-fg)',
                }}
                formatter={(value) => [formatImpressions(Number(value)), 'Impressions']}
              />
              <Bar dataKey="impressions" radius={[4, 4, 0, 0]}>
                {summary.leverBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function MargeRecap({
  realBudget,
  grandTotal,
  prestationsBilled,
  hasPrestations,
  retrocommissionPercent,
  onRetroChange,
  retrocommissionAmount,
  marginAmount,
  marginPercent,
}: {
  realBudget: number;
  grandTotal: number;
  prestationsBilled: number;
  hasPrestations: boolean;
  retrocommissionPercent: number;
  onRetroChange: (v: number) => void;
  purchaseTotal: number;
  retrocommissionAmount: number;
  marginAmount: number;
  marginPercent: number;
}) {
  const threshold = getMarginThreshold(grandTotal);
  const ok = marginPercent >= threshold.minMarginPercent;
  const clamped = Math.max(0, Math.min(100, marginPercent));
  const thPct = Math.min(100, threshold.minMarginPercent);

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-fg/72">Récapitulatif</span>
      </div>

      <div>
        <span className="text-[10px] uppercase tracking-wider text-fg/60 block mb-1">
          Budget total (avec prestas)
        </span>
        <span className="text-2xl font-bold font-mono text-teal-400">{formatNum(grandTotal)} €</span>
        {hasPrestations && (
          <span className="text-[11px] text-fg/55 font-mono block mt-0.5">
            {formatNum(realBudget)}€ + {formatNum(prestationsBilled)}€ prestas
          </span>
        )}
      </div>

      <div className="border-t border-fg/10 pt-3">
        <span className="text-[10px] uppercase tracking-wider text-fg/60 block mb-1.5">
          Rétrocommission <span className="text-fg/45 normal-case">(optionnel)</span>
        </span>
        <div className="flex items-center gap-2">
          <div className="relative w-24">
            <NumInput
              value={retrocommissionPercent}
              onChange={onRetroChange}
              min={0}
              max={100}
              step={0.1}
              className="w-full bg-navy-800/60 border border-navy-600/30 rounded-lg px-3 py-2 pr-7 text-sm text-fg font-mono focus:outline-none focus:border-teal-400/40 transition-colors"
            />
            <Percent className="w-3.5 h-3.5 text-fg/45 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <span className="text-sm text-fg/60 font-mono">− {formatNum(retrocommissionAmount)} €</span>
        </div>
      </div>

      <div className="border-t border-fg/10 pt-3">
        <span className="text-[10px] uppercase tracking-wider text-fg/60 block mb-1">Marge totale</span>
        <span className={`text-2xl font-bold font-mono ${ok ? 'text-teal-400' : 'text-coral-400'}`}>
          {formatNum(Math.round(marginAmount))} €
        </span>
        <p className="text-[10px] text-fg/45 mt-0.5">valeur absolue</p>
      </div>

      <div className="border-t border-fg/10 pt-3">
        <span className="text-[10px] uppercase tracking-wider text-fg/60 block mb-1">Marge en pourcentage</span>
        <span className={`text-2xl font-bold font-mono ${ok ? 'text-teal-400' : 'text-coral-400'}`}>
          {marginPercent.toFixed(2)} %
        </span>
        <div className="mt-2 relative w-full h-3.5">
          <div className="absolute inset-0 flex rounded-full overflow-hidden border border-fg/10">
            <div className="h-full shrink-0 bg-red-500/45" style={{ width: `${thPct}%` }} />
            <div className="h-full min-w-0 flex-1 bg-emerald-500/40" />
          </div>
          <div
            className={
              'absolute top-0 bottom-0 z-[5] pointer-events-none bg-navy-900/80 transition-[left] ' +
              (clamped === 0 ? 'left-0 right-0 rounded-full' : 'rounded-r-full')
            }
            style={clamped === 0 ? undefined : { left: `${clamped}%`, right: 0 }}
            aria-hidden
          />
          <div
            className="absolute z-20 w-1.5 -translate-x-1/2 rounded-sm bg-amber-200 shadow-[0_0_0_1px_rgba(0,0,0,0.25),0_1px_2px_rgba(0,0,0,0.15)]"
            style={{
              left: `${thPct}%`,
              top: '50%',
              height: 22,
              transform: 'translate(-50%, -50%)',
            }}
            title={`Seuil ${threshold.minMarginPercent}% (${threshold.label})`}
          />
        </div>
      </div>

      <div
        className={`flex items-start gap-2 rounded-lg px-3 py-2.5 border ${
          ok
            ? 'bg-teal-400/10 border-teal-400/30 text-[#0b2e1a]'
            : 'bg-coral-400/10 border-coral-400/30 text-[#3a0f0f]'
        }`}
      >
        {ok ? (
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        )}
        <div className="text-[13px] leading-relaxed">
          {ok ? (
            <>
              <span className="font-bold">OK</span> — marge au-dessus du seuil de{' '}
              <span className="font-bold">{threshold.minMarginPercent.toFixed(2)} %</span>{' '}
              <span className="opacity-80">({threshold.label})</span>
            </>
          ) : (
            <>
              <span className="font-bold">Validation requise</span> — marge sous le seuil de{' '}
              <span className="font-bold">{threshold.minMarginPercent.toFixed(2)} %</span>{' '}
              <span className="opacity-80">({threshold.label})</span>. Accord de Thomas, Nico N ou Nico G nécessaire.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
