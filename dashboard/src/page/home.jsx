import { useState } from 'react'
import { Box, TextField, Typography } from '@mui/material'
import LoginDialog from '../auth/LoginDialog.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import ProgramCard from '../components/ProgramCard.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { programs } from '../config/routes.js'
import { useRouter } from '../router.jsx'

// Section order on the page. Any group not listed here is added after these;
// programs without a `group` go under "Programs".
const groupOrder = ['Employment', 'Livelihood', 'Scholarships', 'OFW Services']
const fallbackGroup = 'Programs'

// Used when a program in routes.js has no `group` of its own. A `group` set in
// routes.js always wins, so new programs can just set one there.
const defaultGroups = {
  GIP: 'Employment',
  SPES: 'Employment',
  TUPAD: 'Employment',
  JOBSEEKERS: 'Employment',
  JOBVACANCY: 'Employment',
  LIVELIHOOD: 'Livelihood',
  BRIDGING: 'Livelihood',
  GUWIP: 'Livelihood',
  SAGUT: 'Scholarships',
  DOKTOR: 'Scholarships',
  OFW: 'OFW Services',
}

const groupOf = (program) => program.group || defaultGroups[program.name] || fallbackGroup

// `initialProgram` = someone opened /gip (etc.) without being logged in.
export default function Home({ initialProgram = null }) {
  const { user } = useAuth()
  const { navigate } = useRouter()
  const [pending, setPending] = useState(initialProgram)
  const [query, setQuery] = useState('')

  // Logged in -> go straight in. Not logged in -> ask for login first.
  const openProgram = (program) => {
    if (user) navigate(program.path)
    else setPending(program)
  }

  const closeLogin = () => {
    setPending(null)
    if (initialProgram) navigate('/')
  }

  const handleLoginSuccess = () => {
    const target = pending
    setPending(null)
    navigate(target.path)
  }

  // Search filters the cards; the sections stay in the same order and empty ones are hidden.
  const search = query.trim().toLowerCase()
  const matches = programs.filter((program) => program.name.toLowerCase().includes(search))
  const titles = [...new Set([...groupOrder, ...programs.map(groupOf)])]
  const sections = titles
    .map((title) => ({ title, items: matches.filter((program) => groupOf(program) === title) }))
    .filter((section) => section.items.length > 0)

  // Enter opens the program when the search has narrowed it down to one.
  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter' && matches.length === 1) openProgram(matches[0])
  }

  return (
    <Box sx={{ minHeight: '100svh', bgcolor: 'background.default', color: 'text.primary' }}>
      <SiteHeader />

      <Box component="main" sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: 6 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography component="h2" variant="h4" sx={{ fontWeight: 800 }}>
            PROGRAMS
          </Typography>
          <Typography color="text.secondary">
            Select a program to view its tracking database
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 5 }}>
          <TextField
            aria-label="Search programs"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search programs..."
            size="small"
            sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper', borderRadius: 1 }}
            value={query}
          />
        </Box>

        {sections.length === 0 && (
          <Typography align="center" color="text.secondary">
            No programs match "{query.trim()}".
          </Typography>
        )}

        {sections.map((section) => (
          <Box
            aria-labelledby={`programs-${section.title}`}
            component="section"
            key={section.title}
            sx={{ mb: 5 }}
          >
            <Typography
              color="text.secondary"
              component="h3"
              id={`programs-${section.title}`}
              sx={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.12em', mb: 2, textTransform: 'uppercase' }}
            >
              {section.title}
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  sm: 'repeat(3, minmax(0, 1fr))',
                  md: 'repeat(5, minmax(0, 1fr))',
                },
              }}
            >
              {section.items.map((program) => (
                <ProgramCard key={program.name} program={program} onOpen={openProgram} />
              ))}
            </Box>
          </Box>
        ))}
      </Box>

      {pending && (
        <LoginDialog
          programName={pending.name}
          onClose={closeLogin}
          onSuccess={handleLoginSuccess}
        />
      )}
    </Box>
  )
}
