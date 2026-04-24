import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useSimulationStore, type HypothesisSummary } from '../store/simulationStore';
import type { Hypothesis } from '../types';
import { isLeverIncludedInHypothesis } from '../types';
import ComparisonReportContent from './ComparisonReportContent';
import { GitCompareArrows, Download, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react';

/** Libellés de colonnes uniques si plusieurs hypothèses portent le même nom. */
function hypothesisColumnLabels(hypotheses: Hypothesis[]): string[] {
  const nameCount = new Map<string, number>();
  return hypotheses.map((h) => {
    const n = (nameCount.get(h.name) ?? 0) + 1;
    nameCount.set(h.name, n);
    const dup = hypotheses.filter((x) => x.name === h.name).length > 1;
    return dup ? `${h.name} (${n})` : h.name;
  });
}

function exportHypothesisComparisonToXlsx(
  simulationLabel: string,
  hypotheses: Hypothesis[],
  summaries: (HypothesisSummary | null)[],
  allLeverTypes: string[],
) {
  const cols = hypothesisColumnLabels(hypotheses);
  const row = (metric: string, values: (number | string)[]) => {
    const o: Record<string, string | number> = { Métrique: metric };
    cols.forEach((c, i) => {
      o[c] = values[i] ?? '';
    });
    return o;
  };

  const mainRows: Record<string, string | number>[] = [];

  mainRows.push(row('Objectif budget (€)', summaries.map((s) => s?.totalBudget ?? '')));

  for (const type of allLeverTypes) {
    const budgets = hypotheses.map((h) => {
      const lever = h.levers.find((l) => l.type === type);
      if (lever == null) return '';
      return isLeverIncludedInHypothesis(lever) ? lever.budget : 0;
    });
    const covs = hypotheses.map((h) => {
      const lever = h.levers.find((l) => l.type === type);
      if (lever == null) return '';
      return isLeverIncludedInHypothesis(lever) ? lever.coverage : '';
    });
    const reps = hypotheses.map((h) => {
      const lever = h.levers.find((l) => l.type === type);
      if (lever == null) return '';
      return isLeverIncludedInHypothesis(lever) ? lever.repetition : '';
    });
    mainRows.push(row(`${type} — budget (€)`, budgets));
    mainRows.push(row(`${type} — couverture (%)`, covs));
    mainRows.push(row(`${type} — répétition`, reps));
  }

  mainRows.push(row('Couverture globale (%)', summaries.map((s) => s?.generalCoverage ?? '')));
  mainRows.push(row('Rép. moyenne', summaries.map((s) => s?.avgRepetition ?? '')));
  mainRows.push(row('Prestas addi. (€)', summaries.map((s) => s?.prestationsSaleTotal ?? '')));
  mainRows.push(row('Rétrocom (%)', summaries.map((s) => (s != null ? s.retrocommissionPercent : ''))));
  mainRows.push(row('Marge (€)', summaries.map((s) => (s != null ? Math.round(s.marginAmount) : ''))));
  mainRows.push(row('Marge (%)', summaries.map((s) => (s != null ? s.marginPercent : ''))));
  mainRows.push(row('Budget total avec prestas (€)', summaries.map((s) => s?.grandTotal ?? '')));

  const wsMain = XLSX.utils.json_to_sheet(mainRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsMain, 'Comparaison');

  if (allLeverTypes.length > 0) {
    const budgetRows = allLeverTypes.map((type) => {
      const o: Record<string, string | number> = { Levier: type };
      hypotheses.forEach((h, i) => {
        const lever = h.levers.find((l) => l.type === type);
        o[cols[i]] = lever != null && isLeverIncludedInHypothesis(lever) ? lever.budget : lever != null ? 0 : '';
      });
      return o;
    });
    const wsBudget = XLSX.utils.json_to_sheet(budgetRows);
    XLSX.utils.book_append_sheet(wb, wsBudget, 'Budget par levier');
  }

  const safeSim = simulationLabel.replace(/[/\\?%*:|"<>]/g, '-').trim().slice(0, 60) || 'simulation';
  const d = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `comparaison-hypotheses-${safeSim}-${d}.xlsx`);
}

export default function ComparisonView() {
  const navigate = useNavigate();
  const { simulation, getHypothesisSummary, leverConfigs } = useSimulationStore();
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [exportMenuOpen]);

  if (!simulation || simulation.hypotheses.length < 2) {
    return (
      <div className="glass-card p-4 text-center">
        <GitCompareArrows className="w-8 h-8 text-fg/42 mx-auto mb-3" />
        <p className="text-sm text-fg/60">
          Créez au moins 2 hypothèses pour les comparer
        </p>
      </div>
    );
  }

  const hypotheses = simulation.hypotheses;
  const summaries = hypotheses.map((h) => getHypothesisSummary(h.id));

  const allLeverTypes = [...new Set(hypotheses.flatMap((h) => h.levers.map((l) => l.type)))];
  const budgetComparisonData = allLeverTypes.map((type) => {
    const entry: Record<string, string | number> = { name: type };
    hypotheses.forEach((h) => {
      const lever = h.levers.find((l) => l.type === type);
      entry[h.name] = lever && isLeverIncludedInHypothesis(lever) ? lever.budget : 0;
    });
    return entry;
  });

  const showDiffColumn = false;

  return (
    <div className="space-y-4 animate-slide-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg/72 flex items-center gap-2">
          <GitCompareArrows className="w-4 h-4" />
          Comparaison des hypothèses
        </h3>
        <div className="relative shrink-0" ref={exportMenuRef}>
          <button
            type="button"
            onClick={() => setExportMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] uppercase tracking-wider text-teal-400/90 hover:text-teal-300 border border-teal-400/25 hover:border-teal-400/45 bg-teal-400/5 hover:bg-teal-400/10 transition-colors"
            aria-expanded={exportMenuOpen}
            aria-haspopup="menu"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {exportMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1.5 min-w-[11.5rem] py-1 rounded-xl border border-fg/15 bg-navy-900/98 backdrop-blur-md shadow-xl z-30 text-left"
            >
              <button
                type="button"
                role="menuitem"
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs text-fg/88 hover:bg-fg/10 transition-colors"
                onClick={() => {
                  exportHypothesisComparisonToXlsx(simulation.name, hypotheses, summaries, allLeverTypes);
                  setExportMenuOpen(false);
                }}
              >
                <FileSpreadsheet className="w-4 h-4 text-teal-400/90 shrink-0" />
                <span>Export Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs text-fg/88 hover:bg-fg/10 transition-colors"
                onClick={() => {
                  setExportMenuOpen(false);
                  navigate('/print/comparison');
                }}
              >
                <FileText className="w-4 h-4 text-teal-400/90 shrink-0" />
                <span>Export PDF (page dédiée)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <ComparisonReportContent
        hypotheses={hypotheses}
        summaries={summaries}
        allLeverTypes={allLeverTypes}
        budgetComparisonData={budgetComparisonData}
        leverConfigs={leverConfigs}
        showDiffColumn={showDiffColumn}
      />
    </div>
  );
}
