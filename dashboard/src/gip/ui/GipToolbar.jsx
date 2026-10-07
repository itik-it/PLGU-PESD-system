import { Box, Button, TextField, Typography } from '@mui/material'

function GipToolbar({ search, onSearchChange, shownCount, error, onAdd }) {
  return (
    <Box className="gip-table-toolbar">
      <Box>
        <Typography className="gip-section-title" component="h2" variant="h6">
          Applicant list
        </Typography>
        <Typography className="gip-section-hint" component="p" variant="body2">
          {shownCount} {shownCount === 1 ? 'record' : 'records'} shown
        </Typography>
      </Box>

      {error && (
        <Typography color="error" role="alert" variant="body2">
          {error}
        </Typography>
      )}

      <Box className="gip-toolbar-actions">
        <TextField
          aria-label="Search applicants"
          className="gip-search"
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search applicants..."
          size="small"
          value={search}
        />
        <Button className="gip-add-button" variant="contained" onClick={onAdd}>
          <span aria-hidden="true" className="gip-button-symbol">+</span>
          Add Applicant
        </Button>
      </Box>
    </Box>
  )
}

export default GipToolbar