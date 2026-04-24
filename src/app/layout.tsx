import type { Metadata } from 'next';
import './globals.css';
import { THEME_STORAGE_KEY } from '../theme';

const themeBootScript = `(function(){try{var h=document.documentElement,k=${JSON.stringify(THEME_STORAGE_KEY)};h.classList.remove("light","dark");h.classList.add(localStorage.getItem(k)==="light"?"light":"dark");}catch(e){document.documentElement.classList.add("dark");}})();`;

export const metadata: Metadata = {
  title: 'Tortank',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
