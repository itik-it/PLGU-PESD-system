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
    <Box sx={{ height: '100svh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <SiteHeader compact />
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          // gip.jsx sets its own 100svh height; fit it into the space under the header instead.
          '& > .gip-page': { height: '100%' },
        }}
      >
        {route.adminOnly && user.role !== 'admin' ? (
          <Alert severity="warning" sx={{ m: 4 }}>
            Administrator access is required to open this page.
          </Alert>
        ) : (
          <Page />
        )}
      </Box>
    </Box>
  )
}

export default App
