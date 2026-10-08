import { Avatar, Card, CardActionArea, Typography } from '@mui/material'

export default function ProgramCard({ program, onOpen }) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: '23px',
        borderColor: 'divider',
        transition: 'border-color .15s, box-shadow .15s',
        '&:hover': { borderColor: '#a7c4b0', boxShadow: '0 8px 24px rgba(24, 61, 45, 0.1)' },
      }}
    >
      <CardActionArea
        onClick={() => onOpen(program)}
        sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}
      >
        <Avatar
          aria-label={`${program.name} logo placeholder`}
          sx={{
            width: 84,
            height: 84,
            bgcolor: '#f3f5f0',
            color: 'secondary.main',
            fontWeight: 800,
            fontSize: program.logo.length > 3 ? 15 : 20,
          }}
        >
          {program.logo}
        </Avatar>
        <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>
          {program.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Open <span aria-hidden="true">→</span>
        </Typography>
      </CardActionArea>
    </Card>
  )
}
