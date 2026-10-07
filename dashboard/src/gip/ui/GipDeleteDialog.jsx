import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'

function GipDeleteDialog({ target, onCancel, onConfirm }) {
  return (
    <Dialog onClose={onCancel} open={Boolean(target)}>
      <DialogTitle>Delete applicant?</DialogTitle>
      <DialogContent>
        This applicant record will be permanently removed from the table.
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button color="error" onClick={onConfirm} variant="contained">Delete</Button>
      </DialogActions>
    </Dialog>
  )
}

export default GipDeleteDialog