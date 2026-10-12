import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { api } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useRouter } from '../router.jsx'

// Groups batches by year, keeping the order from the server (newest first).
function groupByYear(batches) {
  const groups = new Map()
  for (const batch of batches) {
    if (!groups.has(batch.year)) groups.set(batch.year, [])
    groups.get(batch.year).push(batch)
  }
  return [...groups.entries()]
}

// Small dialog: the admin types a year, the server picks the batch number.
function CreateBatchDialog({ onClose, onCreated }) {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/gip/batches', { year: Number(year) })
      onCreated()
    } catch (saveError) {
      setError(saveError.message)
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogTitle sx={{ fontWeight: 800 }}>Create batch</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Year"
            type="number"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            helperText="The batch number (Batch 1, Batch 2, ...) is assigned automatically."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Creating...' : 'Create batch'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

function BatchCard({ batch, isAdmin, busy, onOpen, onToggleStatus }) {
  const isClosed = batch.status === 'closed'

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2.5, borderRadius: '18px', borderColor: '#dce8df', display: 'grid', gap: 1.5 }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main' }}>
          {batch.name}
        </Typography>
        <Chip
          size="small"
          label={isClosed ? 'Closed' : 'Open'}
          color={isClosed ? 'default' : 'secondary'}
          sx={{ fontWeight: 700 }}
        />
      </Box>

      <Typography variant="body2" color="text.secondary">
        {batch.applicantCount} {batch.applicantCount === 1 ? 'beneficiary' : 'beneficiaries'}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="contained" size="small" onClick={() => onOpen(batch)}>
          Open
        </Button>
        {isAdmin && (
          <Button size="small" disabled={busy} onClick={() => onToggleStatus(batch)}>
            {isClosed ? 'Reopen' : 'Close batch'}
          </Button>
        )}
      </Box>
    </Paper>
  )
}

// First screen of the GIP page: pick a batch (or create one if you are an admin).
export default function BatchList({ onOpen }) {
  const { user } = useAuth()
  const { navigate } = useRouter()
  const isAdmin = user?.role === 'admin'

  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const loadBatches = () =>
    api
      .get('/gip/batches')
      .then(setBatches)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false))

  useEffect(() => {
    loadBatches()
  }, [])

  const toggleStatus = async (batch) => {
    setBusyId(batch.id)
    setError('')
    try {
      const updated = await api.patch(`/gip/batches/${batch.id}`, {
        status: batch.status === 'open' ? 'closed' : 'open',
      })
      setBatches((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch (toggleError) {
      setError(toggleError.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleCreated = () => {
    setCreating(false)
    loadBatches()
  }

  const groups = useMemo(() => groupByYear(batches), [batches])

  return (
    <Box component="main" sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: 5, color: 'text.primary' }}>
      <Button
        onClick={() => navigate('/')}
        sx={{ ml: -1, mb: 1, color: 'primary.main', fontSize: '0.78rem', fontWeight: 700 }}
      >
        ← Back to Dashboard
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ color: 'secondary.main', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.14em', mb: 1 }}>
            PROGRAM TRACKING DATABASE
          </Typography>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: '-0.04em' }}>
            GIP Batches
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Choose a batch to view or encode its beneficiaries.
          </Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" onClick={() => setCreating(true)}>
            Create batch
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
          <CircularProgress size={28} color="secondary" />
        </Box>
      )}

      {!loading && !error && batches.length === 0 && (
        <Typography color="text.secondary">
          No batches yet. {isAdmin ? 'Create the first batch to begin.' : 'Ask an administrator to create one.'}
        </Typography>
      )}

      {groups.map(([year, yearBatches]) => (
        <Box component="section" key={year} sx={{ mb: 4 }}>
          <Typography component="h2" variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
            {year}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(3, minmax(0, 1fr))',
              },
            }}
          >
            {yearBatches.map((batch) => (
              <BatchCard
                key={batch.id}
                batch={batch}
                isAdmin={isAdmin}
                busy={busyId === batch.id}
                onOpen={onOpen}
                onToggleStatus={toggleStatus}
              />
            ))}
          </Box>
        </Box>
      ))}

      {creating && <CreateBatchDialog onClose={() => setCreating(false)} onCreated={handleCreated} />}
    </Box>
  )
}
