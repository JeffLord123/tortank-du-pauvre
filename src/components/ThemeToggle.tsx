import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { applyTheme, type Theme } from '../theme';

function readTheme(): Theme {
  return document.documentElement.classList.contains('light') ? 'light' : 'dark';
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(readTheme);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  };

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center justify-center p-1.5 rounded-lg text-fg/78 bg-navy-800/55 border border-fg/12 hover:text-fg/94 hover:bg-navy-800/90 transition-all ${className}`}
      aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
    >
      {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
    </button>
  );
}
