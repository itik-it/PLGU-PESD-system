import {
  Box, Dialog, DialogContent, DialogTitle, Typography,
} from '@mui/material'
import { columns, requirementKeys } from '../gipSettings'
import { displayValue, formatDate } from '../gipHelpers'

function GipDetailsDialog({ row, onClose }) {
  return (
    <Dialog fullWidth maxWidth="md" onClose={onClose} open={Boolean(row)}>
      <DialogTitle>Complete beneficiary information</DialogTitle>
      <DialogContent dividers>
        <Box className="gip-details-grid">
          {row &&
            columns.map((column) => (
              <Box className="gip-detail" key={column.key}>
                <Typography component="dt" variant="caption">{column.label}</Typography>
                <Typography component="dd" variant="body2">
                  {requirementKeys.has(column.key)
                    ? row[column.key] ? 'Submitted' : 'Not submitted'
                    : column.key === 'birthday' || column.key === 'dateApplied'
                    ? formatDate(row[column.key]).replace('—', 'Not provided')
                    : displayValue(row[column.key], 'Not provided')}
                </Typography>
              </Box>
            ))}
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default GipDetailsDialog