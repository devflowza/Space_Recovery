import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import './lib/i18n';

// Anti-flash: apply the user's last-seen theme synchronously before React mounts,
// so returning visitors don't see a Royal-default paint before their saved theme loads.
// First-time visitors fall through to the :root default (Royal) in index.css.
const themeHint = localStorage.getItem('xsuite_theme_hint');
if (themeHint === 'royal' || themeHint === 'burgundy' || themeHint === 'scarlet') {
  document.documentElement.dataset.theme = themeHint;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 0,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
