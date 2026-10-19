import { Box, Button, Chip, Typography } from '@mui/material'
import { useAuth } from '../auth/AuthContext.jsx'
import { useRouter } from '../router.jsx'
import nvLogo from '../assets/NV Logo.png'
import pesdLogo from '../assets/pesd.png'

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

  // Shared button hover and focus styles
  const navButtonSx = {
    borderRadius: 2,
    transition: 'all 0.2s ease-in-out',

    '&:hover': {
      bgcolor: 'rgba(255, 255, 255, 0.22)',
      boxShadow: '0 3px 10px rgba(0, 0, 0, 0.15)',
      transform: 'translateY(-2px)',
    },

    '&:active': {
      bgcolor: 'rgba(255, 255, 255, 0.3)',
      transform: 'translateY(0)',
    },

    '&:focus-visible': {
      outline: '2px solid #fff',
      outlineOffset: '3px',
    },
  }

  // Active page button style
  const getActiveButtonSx = (active) => ({
    ...navButtonSx,
    bgcolor: active ? 'rgba(255, 255, 255, 0.22)' : 'transparent',
    fontWeight: active ? 700 : 400,
    ...(active && {
      borderBottom: '2px solid #fff',
      borderRadius: '4px 4px 0 0',
    }),
  })

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
      {/* Logos */}
      <Box sx={{ display: 'flex', gap: 0.5 }}>
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
                p: compact ? '2px' : '4px',
              }}
            />
          </Box>
        ))}
      </Box>

      {/* Header title */}
      <Box
        sx={{
          flex: '1 1 auto',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
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

      {/* User actions */}
      {user && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <Typography variant="body2">
            {user.fullName}
          </Typography>

          <Chip
            size="small"
            label={user.role}
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.18)',
              color: '#fff',
              textTransform: 'capitalize',
            }}
          />

          {/* Manage users button (admin only) */}
          {user.role === 'admin' && path !== '/users' && (
            <Button
              color="inherit"
              size="small"
              sx={getActiveButtonSx(path === '/users')}
              onClick={() => navigate('/users')}
            >
              Manage users
            </Button>
          )}

          {/* Log out button */}
          <Button
            color="inherit"
            size="small"
            variant="outlined"
            sx={{
              ...navButtonSx,
              borderColor: 'rgba(255, 255, 255, 0.65)',

              '&:hover': {
                ...navButtonSx['&:hover'],
                borderColor: '#fff',
                bgcolor: 'rgba(255, 255, 255, 0.22)',
              },
            }}
            onClick={handleLogout}
          >
            Log out
          </Button>
        </Box>
      )}
    </Box>
  )
}