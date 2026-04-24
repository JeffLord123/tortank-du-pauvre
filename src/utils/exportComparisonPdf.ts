import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Hypothesis } from '../types';
import type { HypothesisSummary } from '../store/simulationStore';
import { formatNumPdf } from './formatNum';

export interface ExportComparisonPdfInput {
  simulationName: string;
  generatedAtLabel: string;
  hypotheses: Hypothesis[];
  summaries: (HypothesisSummary | null)[];
  allLeverTypes: string[];
}

function hypothesisColumnLabels(hypotheses: Hypothesis[]): string[] {
  const nameCount = new Map<string, number>();
  return hypotheses.map((h) => {
    const n = (nameCount.get(h.name) ?? 0) + 1;
    nameCount.set(h.name, n);
    const dup = hypotheses.filter((x) => x.name === h.name).length > 1;
    return dup ? `${h.name} (${n})` : h.name;
  });
}

/**
 * PDF vectoriel (données → tableaux), sans capture DOM — évite les bugs html2canvas / glass / Recharts.
 */
export function exportComparisonPdfDocument(input: ExportComparisonPdfInput): void {
  const { simulationName, generatedAtLabel, hypotheses, summaries, allLeverTypes } = input;

  const labels = hypothesisColumnLabels(hypotheses);
  const orientation = hypotheses.length >= 3 ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  const headRow = ['Métrique', ...labels];
  const body: string[][] = [];

  body.push([
    'Objectif budget',
    ...summaries.map((s) => (s ? `${formatNumPdf(s.totalBudget)} €` : '—')),
  ]);

  for (const type of allLeverTypes) {
    body.push([
      type,
      ...hypotheses.map((h) => {
        const lever = h.levers.find((l) => l.type === type);
        return lever
          ? `${formatNumPdf(lever.budget)} € - ${lever.coverage} % - ${lever.repetition}x`
          : '—';
      }),
    ]);
  }

  body.push([
    'Couverture (globale)',
    ...summaries.map((s) => (s ? `${s.generalCoverage} %` : '—')),
  ]);

  body.push([
    'Rép. moyenne',
    ...summaries.map((s) => (s ? `${s.avgRepetition}x` : '—')),
  ]);

  body.push([
    'Prestas addi.',
    ...summaries.map((s) => (s ? `${formatNumPdf(s.prestationsSaleTotal)} €` : '—')),
  ]);

  body.push([
    'Rétrocom',
    ...summaries.map((s) => (s ? `${s.retrocommissionPercent.toFixed(1)} %` : '—')),
  ]);

  body.push([
    'Marge (€)',
    ...summaries.map((s) =>
      s ? `${formatNumPdf(Math.round(s.marginAmount))} €` : '—',
    ),
  ]);

  body.push([
    'Marge (%)',
    ...summaries.map((s) => (s ? `${s.marginPercent.toFixed(1)} %` : '—')),
  ]);

  body.push([
    'Budget total avec prestas',
    ...summaries.map((s) => (s ? `${formatNumPdf(s.grandTotal)} €` : '—')),
  ]);

  const lastRowIndex = body.length - 1;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('Comparaison des hypothèses', 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(simulationName, 14, 23);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(generatedAtLabel, 14, 28);

  autoTable(doc, {
    startY: 32,
    head: [headRow],
    body,
    theme: 'plain',
    headStyles: {
      fillColor: [35, 45, 63],
      textColor: [241, 245, 249],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      textColor: [15, 23, 42],
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: 'bold', textColor: [51, 65, 85] },
    },
    styles: { cellPadding: 2.5, fontSize: 8, lineColor: [226, 232, 240], lineWidth: 0.1 },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === lastRowIndex) {
        data.cell.styles.fontStyle = 'bold';
        if (data.column.index >= 1) {
          data.cell.styles.textColor = [15, 118, 110];
        }
      }
    },
  });

  const docExt = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  let finalY = docExt.lastAutoTable?.finalY ?? 40;

  if (allLeverTypes.length > 0) {
    const pageH = doc.internal.pageSize.getHeight();
    if (finalY > pageH - 40) {
      doc.addPage();
      finalY = 20;
    } else {
      finalY += 8;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('Budget par levier (€)', 14, finalY);
    finalY += 4;

    const budgetHead = ['Levier', ...labels];
    const budgetBody = allLeverTypes.map((type) => [
      type,
      ...hypotheses.map((h) => {
        const lever = h.levers.find((l) => l.type === type);
        return lever ? `${formatNumPdf(lever.budget)} €` : '—';
      }),
    ]);

    autoTable(doc, {
      startY: finalY + 2,
      head: [budgetHead],
      body: budgetBody,
      theme: 'plain',
      headStyles: {
        fillColor: [35, 45, 63],
        textColor: [241, 245, 249],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: { textColor: [15, 23, 42], fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold' } },
      styles: { cellPadding: 2.5, fontSize: 8, lineColor: [226, 232, 240], lineWidth: 0.1 },
      margin: { left: 14, right: 14 },
    });
  }

  const safe = simulationName.replace(/[/\\?%*:|"<>]/g, '-').trim().slice(0, 60) || 'simulation';
  const date = new Date().toISOString().slice(0, 10);
  doc.save(`comparaison-hypotheses-${safe}-${date}.pdf`);
}
