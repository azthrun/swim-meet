import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { Layout } from './components/Layout'
import { I18nProvider } from './i18n/I18nProvider'
import { AddEntries } from './screens/AddEntries'
import { EditEntry } from './screens/EditEntry'
import { Home } from './screens/Home'
import { MeetScreen } from './screens/Meet'
import { EditMeet } from './screens/MeetForm'
import { NotFound } from './screens/NotFound'
import { SignIn } from './screens/SignIn'
import { SwimmerScreen } from './screens/Swimmer'
import { SwimmerPersonalBests } from './screens/SwimmerPersonalBests'
import { SwimmerResults } from './screens/SwimmerResults'
import { AddSwimmer, SwimmerSettings } from './screens/SwimmerSettings'
import { SwimmerUpcoming } from './screens/SwimmerUpcoming'

const queryClient = new QueryClient({
  defaultOptions: {
    // Pool signal is unreliable: keep showing what loaded, and refresh it when the phone wakes.
    queries: { staleTime: 30_000, retry: 1 },
    // Offline, a write must fail where the editor can see it, not wait unseen for signal.
    mutations: { networkMode: 'always' },
  },
})

// Hash routing, because GitHub Pages serves one static index.html.
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <HashRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="sign-in" element={<SignIn />} />
                <Route path="swimmers/new" element={<AddSwimmer />} />
                <Route path="swimmers/:slug/settings" element={<SwimmerSettings />} />
                <Route path="swimmers/:slug" element={<SwimmerScreen />}>
                  <Route index element={<Navigate to="upcoming" replace />} />
                  <Route path="upcoming" element={<SwimmerUpcoming />} />
                  <Route path="results" element={<SwimmerResults />} />
                  <Route path="personal-bests" element={<SwimmerPersonalBests />} />
                </Route>
                <Route path="meets/:meetId" element={<MeetScreen />} />
                <Route path="meets/:meetId/edit" element={<EditMeet />} />
                <Route path="entries/new" element={<AddEntries />} />
                <Route path="entries/:entryId/edit" element={<EditEntry />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </HashRouter>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  )
}
