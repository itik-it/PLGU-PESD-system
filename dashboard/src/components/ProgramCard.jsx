import { Avatar, Card, CardActionArea, Typography } from '@mui/material'

export default function ProgramCard({ program, onOpen }) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: '23px',
        borderColor: 'divider',
        transition: 'border-color .15s, box-shadow .15s'
      }}
    >
      <CardActionArea
        onClick={() => onOpen(program)}
        sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}
      >
        <Avatar
          alt={`${program.name} logo`}
          src={program.image}
          sx={{
            width: 84,
            height: 84,
            bgcolor: '#f3f5f0',
            '& img': {
              objectFit: 'contain',
              padding: '4px',
            },
          }}
        >
          {!program.image && program.logo}
        </Avatar>
        <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>
          {program.name}
        </Typography>       
      </CardActionArea>
    </Card>
  )
}
