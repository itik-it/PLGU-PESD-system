import { createTheme } from '@mui/material/styles'

// Colors carried over from the old App.css (forest green palette).
export const theme = createTheme({
  palette: {
    primary: { main: '#183d2d' },
    secondary: { main: '#4d775b' },
    background: { default: '#f1f5f2', paper: '#ffffff' },
    text: { primary: '#1f2b26', secondary: '#718078' },
    divider: '#e2eae5',
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    button: { textTransform: 'none', fontWeight: 600 },
  },
})
