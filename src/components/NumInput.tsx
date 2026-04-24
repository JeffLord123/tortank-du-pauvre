import { useState, useEffect, type KeyboardEvent } from 'react';

/** Blur the field on Enter so the same commit path runs as on outside click (formatting, history, etc.). */
export function blurOnEnter(e: KeyboardEvent<HTMLInputElement>) {
  if (e.key === 'Enter') {
    e.preventDefault();
    e.currentTarget.blur();
  }
}

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
  title?: string;
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
        if (value === 0) {
          setDisplay('');
        } else {
          setDisplay(formatPlainNumericDisplay(value, step));
        }
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
      onKeyDown={blurOnEnter}
    />
  );
}

export default function NumInput({ value, onChange, min, max, className, disabled, title }: Props) {
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
    if (disabled) return;
    setFocused(true);
    const rounded = Math.round(value);
    setDisplay(rounded === 0 ? '' : String(rounded));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    setDisplay(e.target.value);
    const parsed = parseFormattedNumber(e.target.value);
    if (parsed === null) return;
    const clamped = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, parsed));
    onChange(clamped);
  };

  const handleBlur = () => {
    if (disabled) return;
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
      disabled={disabled}
      title={title}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={blurOnEnter}
      className={className}
    />
  );
}
