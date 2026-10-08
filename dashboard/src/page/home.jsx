import { useState } from 'react'
import { Box, Typography } from '@mui/material'
import LoginDialog from '../auth/LoginDialog.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import ProgramCard from '../components/ProgramCard.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { programs } from '../config/routes.js'
import { useRouter } from '../router.jsx'

// `initialProgram` = someone opened /gip (etc.) without being logged in.
export default function Home({ initialProgram = null }) {
  const { user } = useAuth()
  const { navigate } = useRouter()
  const [pending, setPending] = useState(initialProgram)

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

  return (
    <Box sx={{ minHeight: '100svh', bgcolor: 'background.default', color: 'text.primary' }}>
      <SiteHeader />

      <Box component="main" sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: 6 }}>
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography component="h2" variant="h4" sx={{ fontWeight: 800 }}>
            PROGRAMS
          </Typography>
          <Typography color="text.secondary">
            Select a program to view its tracking database
          </Typography>
        </Box>

        <Box
          component="section"
          aria-label="Programs"
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
          {programs.map((program) => (
            <ProgramCard key={program.name} program={program} onOpen={openProgram} />
          ))}
        </Box>
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
