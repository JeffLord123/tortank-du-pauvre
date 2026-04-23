'use client';

import dynamic from 'next/dynamic';

// Disable SSR for the entire app — it's a pure SPA with browser-only dependencies.
const App = dynamic(() => import('../App'), { ssr: false });

export default function ClientApp() {
  return <App />;
}
