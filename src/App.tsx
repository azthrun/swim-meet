import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { I18nProvider } from './i18n/I18nProvider'
import { Home } from './screens/Home'
import { MeetScreen } from './screens/Meet'
import { NotFound } from './screens/NotFound'
import { SwimmerScreen } from './screens/Swimmer'
import { SwimmerPersonalBests } from './screens/SwimmerPersonalBests'
import { SwimmerResults } from './screens/SwimmerResults'
import { SwimmerUpcoming } from './screens/SwimmerUpcoming'

const queryClient = new QueryClient({
  defaultOptions: {
    // Pool signal is unreliable: keep showing what loaded, and refresh it when the phone wakes.
    queries: { staleTime: 30_000, retry: 1 },
  },
})

// Hash routing, because GitHub Pages serves one static index.html.
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="swimmers/:slug" element={<SwimmerScreen />}>
                <Route index element={<Navigate to="upcoming" replace />} />
                <Route path="upcoming" element={<SwimmerUpcoming />} />
                <Route path="results" element={<SwimmerResults />} />
                <Route path="personal-bests" element={<SwimmerPersonalBests />} />
              </Route>
              <Route path="meets/:meetId" element={<MeetScreen />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </HashRouter>
      </I18nProvider>
    </QueryClientProvider>
  )
}
