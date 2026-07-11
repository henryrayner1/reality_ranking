import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Provider } from 'react-redux'
import { store } from './redux/store.ts'
import { BrowserRouter } from 'react-router-dom'
import ScrollToTop from './utils/ScrollToTop.ts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

// Mirrors how Redux used to hold this data: fetched once, never silently
// refetched, and only ever updated by an explicit invalidateQueries call
// after a mutation (the React Query equivalent of dispatching an upsert).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <ScrollToTop />
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  </StrictMode>,
)
