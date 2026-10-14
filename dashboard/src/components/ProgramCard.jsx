import { Avatar, Card, CardActionArea, Typography } from '@mui/material'

// Programs without a logo image get their short code on a colored circle.
// The color comes from the program name, so a program keeps the same color every time.
const initialsColors = ['#4a7c59', '#3f7f8c', '#6f7d3a', '#6b5b95', '#8a5a44', '#4a6fa5']

const colorFor = (name) => {
  let hash = 0
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) % 997
  return initialsColors[hash % initialsColors.length]
}

export default function ProgramCard({ program, onOpen }) {
  const hasImage = Boolean(program.image)
  const initials = program.logo || program.name.slice(0, 3)

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: '23px',
        borderColor: 'divider',
        transition: 'border-color .15s, box-shadow .15s, transform .15s',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0 8px 22px rgba(23, 55, 37, 0.12)',
          transform: 'translateY(-3px)',
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': { transform: 'none' },
        },
      }}
    >
      <CardActionArea
        onClick={() => onOpen(program)}
        sx={{
          p: 2.5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
          '&.Mui-focusVisible': {
            outline: '3px solid',
            outlineColor: 'primary.main',
            outlineOffset: '-3px',
          },
        }}
      >
        <Avatar
          alt={`${program.name} logo`}
          src={program.image}
          sx={{
            width: 76,
            height: 76,
            bgcolor: hasImage ? '#f3f5f0' : colorFor(program.name),
            color: '#fff',
            fontSize: initials.length > 3 ? '0.95rem' : '1.35rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            '& img': {
              objectFit: 'contain',
              padding: '4px',
            },
          }}
        >
          {!hasImage && initials}
        </Avatar>
        <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>
          {program.name}
        </Typography>
      </CardActionArea>
    </Card>
  )
}
