import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GitCompareArrows, Download, Printer } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import { isLeverIncludedInHypothesis } from '../types';
import ComparisonReportContent from '../components/ComparisonReportContent';
import { exportComparisonPdfDocument } from '../utils/exportComparisonPdf';

export default function ComparisonPrintPage() {
  const navigate = useNavigate();
  const [pdfBusy, setPdfBusy] = useState(false);
  const { simulation, getHypothesisSummary, leverConfigs } = useSimulationStore();

  if (!simulation || simulation.hypotheses.length < 2) {
    return (
      <div className="min-h-screen bg-navy-950 text-fg flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-sm text-fg/65 text-center max-w-sm">
          Aucune comparaison à afficher. Ouvrez une simulation avec au moins deux hypothèses, puis utilisez « Export PDF » depuis la vue comparaison.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-fg/20 hover:bg-fg/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;application
        </button>
      </div>
    );
  }

  const simName = simulation.name;
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

  const generatedAtLabel = new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

  function handleDownloadPdf() {
    setPdfBusy(true);
    try {
      exportComparisonPdfDocument({
        simulationName: simName,
        generatedAtLabel,
        hypotheses,
        summaries,
        allLeverTypes,
      });
    } catch (e) {
      console.error(e);
      const detail = e instanceof Error && e.message ? `\n\nDétail : ${e.message}` : '';
      window.alert(`Impossible de générer le PDF.${detail}`);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 text-fg">
      <div className="no-print border-b border-fg/12 bg-navy-900/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2 justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-fg/85 hover:text-fg border border-fg/15 hover:bg-fg/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-fg/75 hover:text-fg border border-fg/18 hover:bg-fg/10 transition-colors"
              title="Ouvre la boîte de dialogue Imprimer du navigateur"
            >
              <Printer className="w-4 h-4" />
              Imprimer…
            </button>
            <button
              type="button"
              disabled={pdfBusy}
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider text-teal-400/95 hover:text-teal-300 border border-teal-400/30 hover:border-teal-400/50 bg-teal-400/10 hover:bg-teal-400/15 transition-colors disabled:opacity-55 disabled:pointer-events-none"
            >
              <Download className="w-4 h-4" />
              {pdfBusy ? 'Génération…' : 'Télécharger le PDF'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 md:py-10 print:max-w-none print:px-6 print:py-6">
        <div className="rounded-xl bg-navy-950 p-4 md:p-6 space-y-8 border border-fg/8 print:border-0 print:p-0">
          <header className="border-b border-fg/10 pb-6 print:pb-4">
            <div className="flex items-center gap-2 text-teal-400/95 mb-2">
              <GitCompareArrows className="w-5 h-5 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider">Comparaison des hypothèses</span>
            </div>
            <h1 className="text-2xl md:text-[1.65rem] font-bold text-fg tracking-tight">{simulation.name}</h1>
            <p className="text-sm text-fg/55 mt-2">{generatedAtLabel}</p>
          </header>

          <ComparisonReportContent
            hypotheses={hypotheses}
            summaries={summaries}
            allLeverTypes={allLeverTypes}
            budgetComparisonData={budgetComparisonData}
            leverConfigs={leverConfigs}
          />
        </div>
      </div>
    </div>
  );
}
