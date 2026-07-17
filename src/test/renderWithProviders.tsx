import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import userReducer from "../redux/slices/userSlice";
import type { RootState } from "../redux/store";

interface RenderWithProvidersOptions {
  preloadedState?: Partial<RootState>;
  /** Initial MemoryRouter entry, e.g. "/ranking/survivor". Defaults to "/". */
  route?: string;
  /** Route pattern to mount `ui` under, e.g. "/ranking/:showSlug", so useParams() resolves. */
  routePath?: string;
  queryClient?: QueryClient;
}

// Fresh QueryClient per test — retries disabled so failed-query tests don't
// hang waiting for retry backoff, cache never expires mid-test.
export function makeTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState,
    route = "/",
    routePath,
    queryClient = makeTestQueryClient(),
  }: RenderWithProvidersOptions = {}
) {
  const store = configureStore({
    reducer: { user: userReducer },
    preloadedState,
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[route]}>
            {routePath ? (
              <Routes>
                <Route path={routePath} element={children} />
              </Routes>
            ) : (
              children
            )}
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );
  }

  return { store, queryClient, ...render(ui, { wrapper: Wrapper }) };
}
