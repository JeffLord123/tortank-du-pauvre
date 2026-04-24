import { useRef, useEffect, type ReactNode, type CSSProperties } from 'react';

/** Pulse ambre (classe `animate-alert-flash` dans index.css) — relance si `active` / `animKey` change. */
export default function AlertFieldFlash({
  active,
  animKey,
  className = '',
  style,
  children,
}: {
  active: boolean;
  animKey: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!active) {
      el.classList.remove('animate-alert-flash');
      return;
    }
    el.classList.remove('animate-alert-flash');
    void el.getBoundingClientRect();
    el.classList.add('animate-alert-flash');
  }, [active, animKey]);
  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
