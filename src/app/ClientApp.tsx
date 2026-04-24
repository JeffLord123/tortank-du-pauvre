'use client';

import dynamic from 'next/dynamic';

// Disable SSR for the entire app — it's a pure SPA with browser-only dependencies.
const RootApp = dynamic(() => import('../RootApp'), { ssr: false });

export default function ClientApp() {
  return <RootApp />;
}
