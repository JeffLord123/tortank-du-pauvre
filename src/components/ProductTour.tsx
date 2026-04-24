import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { PRODUCT_TOUR_STEPS } from '../productTour/tourSteps';
import { markProductTourDone } from '../productTour/storage';

const OVERLAY_Z = 200;
const TOOLTIP_Z = 201;
const PAD = 10;
const RADIUS = 10;

type Props = {
  open: boolean;
  onClose: () => void;
  profileId: string | null;
  /** Si true (visite lancée à la création), enregistrer la fin pour ne plus proposer l’auto-tour. */
  markCompleteOnFinish?: boolean;
};

function roundedHolePath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2);
  return [
    `M${x + rr},${y}`,
    `H${x + w - rr}`,
    `Q${x + w},${y} ${x + w},${y + rr}`,
    `V${y + h - rr}`,
    `Q${x + w},${y + h} ${x + w - rr},${y + h}`,
    `H${x + rr}`,
    `Q${x},${y + h} ${x},${y + h - rr}`,
    `V${y + rr}`,
    `Q${x},${y} ${x + rr},${y}`,
    'Z',
  ].join(' ');
}

export default function ProductTour({ open, onClose, profileId, markCompleteOnFinish = false }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [hole, setHole] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{
    top: number;
    left: number;
    placement: 'below' | 'above';
    centered: boolean;
  }>({
    top: 0,
    left: 0,
    placement: 'below',
    centered: false,
  });

  const step = PRODUCT_TOUR_STEPS[stepIndex];
  const selector = useMemo(() => `[data-tour="${step?.id}"]`, [step?.id]);

  const updateGeometry = useCallback(() => {
    if (!open || !step) return;
    const el = document.querySelector(selector) as HTMLElement | null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (!el) {
      setHole(null);
      setTooltipPos({
        top: 0,
        left: 0,
        placement: 'below',
        centered: true,
      });
      return;
    }

    el.scrollIntoView({ block: 'center', behavior: 'smooth' });

    const r = el.getBoundingClientRect();
    const x = Math.max(0, r.left - PAD);
    const y = Math.max(0, r.top - PAD);
    const w = Math.min(vw, r.width + PAD * 2);
    const h = Math.min(vh, r.height + PAD * 2);
    setHole({ x, y, w, h });

    const tooltipWidth = Math.min(360, vw - 32);
    const tooltipGuessH = 200;
    let top = r.bottom + 16;
    let placement: 'below' | 'above' = 'below';
    if (top + tooltipGuessH > vh - 16) {
      top = r.top - 16 - tooltipGuessH;
      placement = 'above';
      if (top < 16) {
        top = Math.min(r.bottom + 16, vh - tooltipGuessH - 16);
        placement = 'below';
      }
    }
    let left = r.left + r.width / 2 - tooltipWidth / 2;
    left = Math.max(16, Math.min(left, vw - tooltipWidth - 16));
    setTooltipPos({ top, left, placement, centered: false });
  }, [open, step, selector]);

  useLayoutEffect(() => {
    if (!open) return;
    updateGeometry();
  }, [open, stepIndex, updateGeometry]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(updateGeometry, 400);
    return () => clearTimeout(t);
  }, [open, stepIndex, updateGeometry]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => updateGeometry();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, updateGeometry]);

  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  const finish = useCallback(() => {
    if (markCompleteOnFinish) {
      markProductTourDone(profileId);
    }
    onClose();
  }, [markCompleteOnFinish, onClose, profileId]);

  const next = () => {
    if (stepIndex >= PRODUCT_TOUR_STEPS.length - 1) finish();
    else setStepIndex(i => i + 1);
  };

  const prev = () => setStepIndex(i => Math.max(0, i - 1));

  if (!open) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const outer = `M0,0 H${vw} V${vh} H0 Z`;
  const inner = hole ? roundedHolePath(hole.x, hole.y, hole.w, hole.h, RADIUS) : '';
  const pathD = inner ? `${outer} ${inner}` : outer;

  return createPortal(
    <>
      <svg
        className="fixed inset-0 w-full h-full pointer-events-auto"
        style={{ zIndex: OVERLAY_Z }}
        aria-hidden
      >
        <path d={pathD} fill="rgba(0,0,0,0.55)" fillRule="evenodd" />
      </svg>

      {hole && (
        <div
          className="fixed pointer-events-none rounded-[10px] ring-2 ring-sky-400/90 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
          style={{
            zIndex: OVERLAY_Z + 1,
            top: hole.y,
            left: hole.x,
            width: hole.w,
            height: hole.h,
          }}
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-tour-title"
        className="fixed rounded-lg shadow-2xl text-white pointer-events-auto max-w-[360px] w-[calc(100vw-32px)] border border-sky-300/40"
        style={
          tooltipPos.centered
            ? {
                zIndex: TOOLTIP_Z,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'linear-gradient(180deg, #0ea5e9 0%, #0284c7 100%)',
              }
            : {
                zIndex: TOOLTIP_Z,
                top: tooltipPos.top,
                left: tooltipPos.left,
                transform: 'none',
                background: 'linear-gradient(180deg, #0ea5e9 0%, #0284c7 100%)',
              }
        }
      >
        {!tooltipPos.centered && tooltipPos.placement === 'above' && (
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-sky-600"
            aria-hidden
          />
        )}
        {!tooltipPos.centered && tooltipPos.placement === 'below' && (
          <div
            className="absolute left-1/2 -translate-x-1/2 -top-2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-sky-500"
            aria-hidden
          />
        )}

        <div className="p-4 pt-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p id="product-tour-title" className="text-sm font-bold leading-tight pr-6">
              {step.title}
            </p>
            <button
              type="button"
              onClick={finish}
              className="shrink-0 p-1 rounded-md hover:bg-white/15 transition-colors -mr-1 -mt-1"
              aria-label="Fermer la visite"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[13px] leading-relaxed text-white/95">{step.body}</p>
          <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-white/20">
            <span className="text-[11px] text-white/80 tabular-nums">
              {stepIndex + 1} / {PRODUCT_TOUR_STEPS.length}
            </span>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={prev}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors"
                >
                  Retour
                </button>
              )}
              <button
                type="button"
                onClick={next}
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white text-sky-700 hover:bg-white/90 transition-colors"
              >
                {stepIndex >= PRODUCT_TOUR_STEPS.length - 1 ? 'Terminer' : 'Suivant'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
