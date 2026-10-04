import { useEffect, useState } from 'react'
import Gip from './page/gip.jsx'
import Sagut from './page/sagut.jsx'
import Bridging from './page/bridging.jsx'
import Doktor from './page/doktor.jsx'
import Livelihood from './page/livelihood.jsx'
import Jobseekers from './page/jobseeker.jsx'
import Jobvacancy from './page/jobvacancy.jsx'
import Ofw from './page/ofw.jsx'
import Spes from './page/spes.jsx'
import Tupad from './page/tupad.jsx'
import './App.css'

const programRoutes = {
  GIP: { path: '/gip', component: Gip },
  SAGUT: { path: '/sagut', component: Sagut },
  BRIDGING: { path: '/bridging', component: Bridging },
  DOKTOR: { path: '/doktor', component: Doktor },
  LIVELIHOOD: { path: '/livelihood', component: Livelihood },
  JOBSEEKERS: { path: '/jobseeker', component: Jobseekers },
  JOBVACANCY: { path: '/jobvacancy', component: Jobvacancy },
  OFW: { path: '/ofw', component: Ofw },
  SPES: { path: '/spes', component: Spes },
  TUPAD: { path: '/tupad', component: Tupad },
}

const programs = [
  { name: 'GIP', logo: 'GIP' },
  { name: 'SAGUT', logo: 'SAGUT' },
  { name: 'BRIDGING', logo: 'BR' },
  { name: 'DOKTOR', logo: 'DOK' },
  { name: 'LIVELIHOOD', logo: 'LIV' },
  { name: 'JOBSEEKERS', logo: 'JS' },
  { name: 'JOBVACANCY', logo: 'JV' },
  { name: 'OFW', logo: 'OFW' },
  { name: 'SPES', logo: 'SPES' },
  { name: 'TUPAD', logo: 'TUPAD' },
]

function App() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const activeRoute = Object.values(programRoutes).find(
    (route) => route.path === path,
  )

  if (activeRoute) {
    const Page = activeRoute.component
    return <Page />
  }

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
