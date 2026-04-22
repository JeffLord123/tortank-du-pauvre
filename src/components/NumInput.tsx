import { useState, useEffect } from 'react';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

/** Returns null when the field is empty or not yet a complete number (no forced 0 while editing). */
function parseFormattedNumber(str: string): number | null {
  const cleaned = str.replace(/\s/g, '').replace(',', '.');
  if (cleaned === '' || cleaned === '-') return null;
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function snapToStep(n: number, step?: number): number {
  const s = step ?? 1;
  if (s <= 0) return n;
  const snapped = Math.round(n / s) * s;
  const dec = (s.toString().split('.')[1] || '').length;
  return dec ? parseFloat(snapped.toFixed(dec)) : snapped;
}

function formatPlainNumericDisplay(v: number, step?: number): string {
  const s = step ?? 1;
  if (s < 1) {
    const dec = (s.toString().split('.')[1] || '').length;
    return v.toFixed(dec);
  }
  return String(Math.round(v));
}

export interface PlainNumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

/** Like a native number input, but the field can be cleared while editing (no forced 0). */
export function PlainNumericInput({
  value,
  onChange,
  min,
  max,
  step,
  className,
}: PlainNumericInputProps) {
  const [display, setDisplay] = useState(() => formatPlainNumericDisplay(value, step));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDisplay(formatPlainNumericDisplay(value, step));
  }, [value, focused, step]);

  const commit = (raw: string) => {
    const parsed = parseFormattedNumber(raw);
    let n = parsed === null ? 0 : parsed;
    n = snapToStep(n, step);
    n = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, n));
    onChange(n);
    setDisplay(formatPlainNumericDisplay(n, step));
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      className={className}
      onFocus={() => {
        setFocused(true);
        setDisplay(formatPlainNumericDisplay(value, step));
      }}
      onChange={e => {
        const raw = e.target.value;
        setDisplay(raw);
        const parsed = parseFormattedNumber(raw);
        if (parsed === null) return;
        const n = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, parsed));
        onChange(n);
      }}
      onBlur={() => {
        setFocused(false);
        commit(display);
      }}
    />
  );
}

export default function NumInput({ value, onChange, min, max, className }: Props) {
  const [display, setDisplay] = useState(
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(value))
  );
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDisplay(new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(value)));
    }
  }, [value, focused]);

  const handleFocus = () => {
    setFocused(true);
    setDisplay(String(Math.round(value)));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplay(e.target.value);
    const parsed = parseFormattedNumber(e.target.value);
    if (parsed === null) return;
    const clamped = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, parsed));
    onChange(clamped);
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseFormattedNumber(display);
    const raw = parsed === null ? 0 : parsed;
    const clamped = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, raw));
    onChange(clamped);
    setDisplay(new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(clamped)));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  );
}
