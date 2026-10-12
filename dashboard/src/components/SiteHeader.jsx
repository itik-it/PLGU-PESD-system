import { Box, Button, Chip, Typography } from '@mui/material'
import { useAuth } from '../auth/AuthContext.jsx'
import { useRouter } from '../router.jsx'
import nvLogo from '../assets/NV Logo.jpg'
import pesdLogo from '../assets/pesd.jpg'

// Green top bar. `compact` = slim version used above program pages.
export default function SiteHeader({ compact = false }) {
  const { user, logout } = useAuth()
  const { path, navigate } = useRouter()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const logoSize = compact ? 38 : 64
  const logos = [
    { alt: 'Province of Nueva Vizcaya official seal', src: nvLogo },
    { alt: 'PESD logo', src: pesdLogo },
  ]

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
        flexShrink: 0,
        minWidth: 0,
      }}
    >
      <Box sx={{ display: 'flex', gap: compact ? 0.75 : 1, flexShrink: 0 }}>
        {logos.map((logo) => (
          <Box
            key={logo.alt}
            component="span"
            role="img"
            aria-label={logo.alt}
            sx={{
              width: logoSize,
              height: logoSize,
              display: 'grid',
              placeItems: 'center',
              overflow: 'hidden',
              borderRadius: '50%',
              flexShrink: 0,
              bgcolor: '#f5f3ed',
              border: '2px solid rgba(255, 255, 255, 0.68)',
            }}
          >
            <Box
              alt=""
              component="img"
              src={logo.src}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                padding: compact ? '2px' : '4px',
              }}
            />
          </Box>
        ))}
      </Box>

      <Box sx={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden' }}>
        <Typography
          component="h1"
          variant={compact ? 'subtitle1' : 'h6'}
          sx={{
            fontWeight: 800,
            letterSpacing: 1,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', flexShrink: 0 }}>
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
