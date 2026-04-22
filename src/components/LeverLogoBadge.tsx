import { Monitor, Laptop, Search, Ghost, Pin, Music, Share2, CirclePlay } from 'lucide-react';
import type { LeverConfig } from '../types';

/** Noms d’icônes stockés en config ; Facebook/Youtube ne sont pas dans Lucide, on mappe vers des équivalents. */
const LEVER_ICONS: Record<string, React.ElementType> = {
  Monitor, Laptop, Search, Ghost, Pin, Music,
  Facebook: Share2,
  Youtube: CirclePlay,
};

type Props = {
  cfg: LeverConfig | undefined;
  className?: string;
  iconClassName?: string;
};

/**
 * Affiche un logo image (upload ou fichier `/levers/…`) ou l’icône Lucide dans le même cadre « avatar ».
 */
export default function LeverLogoBadge({ cfg, className = 'w-7 h-7', iconClassName = 'w-4 h-4' }: Props) {
  const color = cfg?.color ?? '#94a3b8';
  const iconKey = cfg?.icon || 'Monitor';
  const Icon = LEVER_ICONS[iconKey] || Monitor;
  const logoUrl = cfg?.logoUrl;

  const showImage = typeof logoUrl === 'string' && logoUrl.length > 0;

  return (
    <div
      className={`rounded-lg flex items-center justify-center shrink-0 overflow-hidden border border-fg/10 ${className}`}
      style={{ backgroundColor: `${color}18` }}
    >
      {showImage ? (
        <img src={logoUrl} alt="" className="w-full h-full object-contain p-0.5" draggable={false} />
      ) : (
        <Icon className={iconClassName} style={{ color }} />
      )}
    </div>
  );
}
