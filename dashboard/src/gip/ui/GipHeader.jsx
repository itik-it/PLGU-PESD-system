import { Box, Typography } from '@mui/material'

function GipHeader({ totalRecords }) {
  return (
    <Box className="gip-page-heading">
      <Box>
        <Box className="gip-eyebrow">PROGRAM TRACKING DATABASE</Box>
        <Typography className="gip-page-title" component="h1" variant="h5">
          GIP Beneficiary Records
        </Typography>
        <Typography className="gip-page-hint" component="p" variant="body2">
          Manage, search, and review all registered beneficiaries.
        </Typography>
      </Box>
      <Box className="gip-record-count">
        <strong>{totalRecords}</strong>
        <span>Total records</span>
      </Box>
    </Box>
  )
}

export default GipHeader