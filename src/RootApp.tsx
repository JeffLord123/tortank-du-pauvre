'use client';

import { HashRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import ComparisonPrintPage from './views/ComparisonPrintPage';

export default function RootApp() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/print/comparison" element={<ComparisonPrintPage />} />
        <Route path="*" element={<App />} />
      </Routes>
    </HashRouter>
  );
}
