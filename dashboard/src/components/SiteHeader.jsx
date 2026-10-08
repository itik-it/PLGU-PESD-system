import { Avatar, Box, Button, Chip, Typography } from '@mui/material'
import { useAuth } from '../auth/AuthContext.jsx'
import { useRouter } from '../router.jsx'

// Green top bar. `compact` = slim version used above program pages.
export default function SiteHeader({ compact = false }) {
  const { user, logout } = useAuth()
  const { path, navigate } = useRouter()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const logoSize = compact ? 36 : 56

  return (
    <Box
      component="header"
      sx={{
        bgcolor: 'secondary.main',
        color: '#fff',
        px: { xs: 2, md: 5 },
        py: compact ? 1 : 2.5,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
        flexShrink: 0,
      }}
    >
      <Box sx={{ display: 'flex', gap: 1 }}>
        {['LGU', 'PESO'].map((label) => (
          <Avatar
            key={label}
            aria-hidden="true"
            sx={{
              width: logoSize,
              height: logoSize,
              bgcolor: '#f5f3ed',
              color: 'secondary.main',
              fontWeight: 800,
              fontSize: compact ? 11 : 14,
            }}
          >
            {label}
          </Avatar>
        ))}
      </Box>

      <Box sx={{ flexGrow: 1 }}>
        <Typography
          component="h1"
          variant={compact ? 'subtitle1' : 'h6'}
          sx={{ fontWeight: 800, letterSpacing: 1, lineHeight: 1.2 }}
        >
          PROGRAMS TRACKING &amp; DATABASE
        </Typography>
        {!compact && (
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            LGU NUEVA VIZCAYA
          </Typography>
        )}
      </Box>

      {user && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2">{user.fullName}</Typography>
          <Chip
            size="small"
            label={user.role}
            sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', textTransform: 'capitalize' }}
          />
          {path !== '/' && (
            <Button color="inherit" size="small" onClick={() => navigate('/')}>
              Home
            </Button>
          )}
          {user.role === 'admin' && path !== '/users' && (
            <Button color="inherit" size="small" onClick={() => navigate('/users')}>
              Manage users
            </Button>
          )}
          <Button color="inherit" size="small" variant="outlined" onClick={handleLogout}>
            Log out
          </Button>
        </Box>
      )}
    </Box>
  )
}
