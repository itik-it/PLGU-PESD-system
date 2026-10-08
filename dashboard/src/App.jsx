import { Alert, Box, CircularProgress } from '@mui/material'
import { useAuth } from './auth/AuthContext.jsx'
import SiteHeader from './components/SiteHeader.jsx'
import { routes } from './config/routes.js'
import Home from './page/home.jsx'
import { useRouter } from './router.jsx'
// Still needed: gip.jsx uses the gip-* classes in this file until it is moved to MUI.
import './App.css'

function App() {
  const { user, loading } = useAuth()
  const { path } = useRouter()

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100svh' }}>
        <CircularProgress color="secondary" />
      </Box>
    )
  }

  const route = routes.find((item) => item.path === path)

  // "/" or an unknown path -> home cards
  if (!route) return <Home />

  // Page needs a login -> show home with the login dialog for that page
  if (!user) return <Home initialProgram={route} />

  const Page = route.component

  // Slim header on top; the page fills the rest of the screen.
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-logos" aria-label="LGU and system logo placeholders">
          <div className="header-logo" aria-hidden="true">LGU</div>
          <div className="header-logo" aria-hidden="true">PESO</div>
        </div>
        <div className="header-copy">
          <h1>PROGRAMS TRACKING &amp; DATABASE</h1>
          <p>LGU NUEVA VIZCAYA</p>
        </div>
      </header>

      <main className="main-content">
        <div className="intro">
          <h2>PROGRAMS</h2>
          <p>Select a program to view its tracking database</p>
        </div>

        <section className="program-grid" aria-label="Programs">
          {programs.map((program) => (
            <a
              className="program-card"
              href={programRoutes[program.name]?.path || '#'}
              key={program.name}
            >
              <div className="program-logo" aria-label={`${program.name} logo placeholder`}>
                <span>{program.logo}</span>
              </div>
              <h3>{program.name}</h3>
              <span className="open-link">Open <span aria-hidden="true">→</span></span>
            </a>
          ))}
        </section>
      </main>
    </div>
  )
}

export default App
