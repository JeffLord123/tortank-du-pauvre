import type { InputHTMLAttributes } from 'react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function SliderWithTooltip({ value, min, max, label, style, className, ...rest }: Props) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className="relative w-full" style={{ paddingTop: '22px' }}>
      <div
        className="absolute pointer-events-none flex flex-col items-center"
        style={{
          left: `${pct}%`,
          top: 0,
          transform: 'translateX(-50%)',
        }}
      >
        <span
          style={{
            display: 'block',
            background: 'var(--color-navy-800)',
            color: 'var(--color-fg)',
            fontSize: '12px',
            fontFamily: 'monospace',
            fontWeight: 700,
            lineHeight: 1,
            padding: '2px 5px',
            borderRadius: '3px',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
        <span
          style={{
            display: 'block',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '4px solid var(--color-navy-800)',
          }}
        />
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        style={style}
        className={className}
        {...rest}
      />
    </div>
  );
}
