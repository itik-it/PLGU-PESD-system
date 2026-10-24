import { useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { api } from '../api/client.js'

const statusStyle = {
  new: { label: 'New', color: 'success' },
  duplicate: { label: 'Skipped', color: 'warning' },
  error: { label: 'Error', color: 'error' },
}

// Import from the GIP Excel form in 2 steps: check the file, then confirm.
// Render this only while it is open, so it starts fresh every time.
export default function ImportDialog({ batch, onClose, onImported, basePath: apiBase = '/gip/batches', hint }) {
  const fileInput = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const basePath = `${apiBase}/${batch.id}/import`

  const checkFile = async () => {
    setBusy(true)
    setError('')
    try {
      setPreview(await api.upload(`${basePath}/preview`, file))
    } catch (checkError) {
      setError(checkError.message)
    } finally {
      setBusy(false)
    }
  }

  const confirmImport = async () => {
    setBusy(true)
    setError('')
    try {
      const rows = preview.rows.filter((row) => row.status === 'new').map((row) => row.data)
      setResult(await api.post(basePath, { rows }))
      await onImported()
    } catch (importError) {
      setError(importError.message)
    } finally {
      setBusy(false)
    }
  }

  const chooseAnother = () => {
    setPreview(null)
    setFile(null)
    setError('')
  }

  const handleClose = busy ? undefined : onClose

  return (
    <Dialog open onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 800 }}>Import from Excel · {batch.name}</DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* DONE */}
        {result && (
          <Alert severity="success">
            Imported {result.imported} applicant{result.imported === 1 ? '' : 's'}
            {result.skipped ? ` (${result.skipped} skipped as duplicates)` : ''}.
          </Alert>
        )}

        {/* STEP 1: choose a file */}
        {!preview && !result && (
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {hint || (<>Upload the GIP Excel form (.xlsx). A check mark (✓ or /) means submitted or selected.
              Required: last and first name, course, birthday, contact number (11 digits), Gmail
              address and date applied. Civil status can be S, M, W or SP. Nothing is saved
              until you confirm on the next step.</>)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button variant="outlined" onClick={() => fileInput.current.click()}>
                Choose file
              </Button>
              <Typography variant="body2">{file ? file.name : 'No file chosen'}</Typography>
              <input
                ref={fileInput}
                type="file"
                accept=".xlsx"
                hidden
                onChange={(event) => {
                  setFile(event.target.files[0] || null)
                  setError('')
                }}
              />
            </Box>
          </Box>
        )}

        {/* STEP 2: preview */}
        {preview && !result && (
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip color="success" label={`${preview.summary.new} new`} />
              <Chip color="warning" label={`${preview.summary.duplicates} duplicate (skipped)`} />
              <Chip color="error" label={`${preview.summary.errors} with errors`} />
            </Box>

            {preview.summary.errors > 0 && (
              <Alert severity="info">
                Rows with errors are not imported. Fix them in the Excel file and upload it again,
                or import the new rows now.
              </Alert>
            )}

            <TableContainer sx={{ maxHeight: 360, border: '1px solid #e2eae5', borderRadius: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Row</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.rows.map((row) => (
                    <TableRow key={row.row}>
                      <TableCell>{row.row}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>
                        <Chip size="small" {...statusStyle[row.status]} />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.78rem' }}>
                        {[...row.messages, ...row.warnings].map((message) => (
                          <div key={message}>{message}</div>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {result ? (
          <Button variant="contained" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            {preview ? (
              <>
                <Button onClick={chooseAnother} disabled={busy}>
                  Choose another file
                </Button>
                <Button
                  variant="contained"
                  onClick={confirmImport}
                  disabled={busy || preview.summary.new === 0}
                >
                  {busy ? 'Importing...' : `Import ${preview.summary.new} new`}
                </Button>
              </>
            ) : (
              <Button variant="contained" onClick={checkFile} disabled={busy || !file}>
                {busy ? 'Checking...' : 'Check file'}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}
