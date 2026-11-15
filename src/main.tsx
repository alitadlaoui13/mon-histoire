import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

declare global {
  interface Window {
    __ORBIS_BOOTED__?: boolean;
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  window.__ORBIS_BOOTED__ = true;
  createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
