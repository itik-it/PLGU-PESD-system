import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'
import { api } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useRouter } from '../router.jsx'

const CURRENT_YEAR = new Date().getFullYear()

// Groups batches by year and returns summaries: [{ year, batches, total }]
function groupByYear(batches) {
  const groups = new Map()
  for (const batch of batches) {
    if (!groups.has(batch.year)) groups.set(batch.year, [])
    groups.get(batch.year).push(batch)
  }
  return [...groups.entries()].map(([year, yearBatches]) => ({
    year,
    batches: yearBatches,
    total: yearBatches.reduce((sum, batch) => sum + batch.applicantCount, 0),
  }))
}

// Order: current year first, then past years (newest first),
// then upcoming years (nearest first) - those are hidden behind a toggle.
function splitYears(groups) {
  const current = groups.filter((group) => group.year === CURRENT_YEAR)
  const past = groups.filter((group) => group.year < CURRENT_YEAR).sort((a, b) => b.year - a.year)
  const upcoming = groups.filter((group) => group.year > CURRENT_YEAR).sort((a, b) => a.year - b.year)
  return { visible: [...current, ...past], upcoming }
}

// Small dialog: the admin types a year, the server picks the batch number.
function CreateBatchDialog({ onClose, onCreated }) {
  const [year, setYear] = useState(String(CURRENT_YEAR))
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

// Closing a batch locks it for everyone, so ask once before doing it.
function ConfirmCloseDialog({ batch, busy, onCancel, onConfirm }) {
  return (
    <Dialog open onClose={busy ? undefined : onCancel} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>Close {batch.name}?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Nobody can add or edit beneficiaries in a closed batch until an administrator reopens it.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onConfirm} disabled={busy}>
          {busy ? 'Closing...' : 'Close batch'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// The whole card opens the batch. Admin actions live in the "..." menu.
function BatchCard({ batch, isAdmin, busy, onOpen, onClose, onReopen }) {
  const [anchor, setAnchor] = useState(null)
  const isClosed = batch.status === 'closed'
  const isEmpty = batch.applicantCount === 0

  return (
    <Box
      sx={{
        position: 'relative',
        border: '1px solid #dce8df',
        borderRadius: '14px',
        bgcolor: 'background.paper',
        opacity: isEmpty && !isClosed ? 0.72 : 1,
        transition: 'border-color 120ms, opacity 120ms',
        '&:hover': { borderColor: 'primary.main', opacity: 1 },
      }}
    >
      <ButtonBase
        onClick={() => onOpen(batch)}
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          justifyContent: 'stretch',
          alignContent: 'center',
          gap: 0.25,
          width: '100%',
          textAlign: 'left',
          justifyItems: 'start',
          px: 2,
          py: 1.5,
          pr: isAdmin ? 5.5 : 2,
          borderRadius: '14px',
        }}
      >
        <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
          {batch.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {batch.applicantCount} {batch.applicantCount === 1 ? 'beneficiary' : 'beneficiaries'}
          </Typography>
          <Chip
            size="small"
            label={isClosed ? 'Closed' : 'Open'}
            color={isClosed ? 'default' : 'secondary'}
            sx={{ fontWeight: 700, height: 20, fontSize: '0.68rem' }}
          />
        </Box>
      </ButtonBase>

      {isAdmin && (
        <>
          <IconButton
            size="small"
            aria-label={`Actions for ${batch.name}`}
            disabled={busy}
            onClick={(event) => setAnchor(event.currentTarget)}
            sx={{ position: 'absolute', top: 8, right: 8, fontWeight: 800 }}
          >
            ⋯
          </IconButton>
          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
            <MenuItem
              onClick={() => {
                setAnchor(null)
                if (isClosed) onReopen(batch)
                else onClose(batch)
              }}
            >
              {isClosed ? 'Reopen batch' : 'Close batch'}
            </MenuItem>
          </Menu>
        </>
      )}
    </Box>
  )
}

function YearSection({ group, expanded, onToggle, isAdmin, busyId, onOpen, onClose, onReopen }) {
  const { year, batches, total } = group
  const panelId = `year-panel-${year}`

  return (
    <Box component="section" sx={{ mb: 1 }}>
      <ButtonBase
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 1.5,
          width: '100%',
          justifyContent: 'flex-start',
          textAlign: 'left',
          py: 1,
          borderBottom: '1px solid #dce8df',
        }}
      >
        <Typography component="span" sx={{ width: 16, color: 'text.secondary' }}>
          {expanded ? '▾' : '▸'}
        </Typography>
        <Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>
          {year}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {batches.length} {batches.length === 1 ? 'batch' : 'batches'}, {total}{' '}
          {total === 1 ? 'beneficiary' : 'beneficiaries'}
        </Typography>
      </ButtonBase>

      <Collapse in={expanded} unmountOnExit>
        <Box
          id={panelId}
          sx={{
            display: 'grid',
            gap: 1.5,
            pt: 1.5,
            pb: 2,
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          }}
        >
          {batches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              isAdmin={isAdmin}
              busy={busyId === batch.id}
              onOpen={onOpen}
              onClose={onClose}
              onReopen={onReopen}
            />
          ))}
        </Box>
      </Collapse>
    </Box>
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
  const [closing, setClosing] = useState(null) // batch waiting for confirmation
  const [showUpcoming, setShowUpcoming] = useState(false)
  const [expandedYears, setExpandedYears] = useState(() => new Set([CURRENT_YEAR]))

  const loadBatches = () =>
    api
      .get('/gip/batches')
      .then(setBatches)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false))

  useEffect(() => {
    loadBatches()
  }, [])

  const setStatus = async (batch, status) => {
    setBusyId(batch.id)
    setError('')
    try {
      const updated = await api.patch(`/gip/batches/${batch.id}`, { status })
      setBatches((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch (toggleError) {
      setError(toggleError.message)
    } finally {
      setBusyId(null)
      setClosing(null)
    }
  }

  const handleCreated = () => {
    setCreating(false)
    loadBatches()
  }

  const toggleYear = (year) =>
    setExpandedYears((current) => {
      const next = new Set(current)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })

  const { visible, upcoming } = useMemo(() => splitYears(groupByYear(batches)), [batches])

  const renderYear = (group) => (
    <YearSection
      key={group.year}
      group={group}
      expanded={expandedYears.has(group.year)}
      onToggle={() => toggleYear(group.year)}
      isAdmin={isAdmin}
      busyId={busyId}
      onOpen={onOpen}
      onClose={setClosing}
      onReopen={(batch) => setStatus(batch, 'open')}
    />
  )

  return (
    <Box component="main" sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: 4, color: 'text.primary' }}>
      <Button
        onClick={() => navigate('/')}
        sx={{ ml: -1, mb: 1, color: 'primary.main', fontSize: '0.78rem', fontWeight: 700 }}
      >
        ← Back to Dashboard
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box>
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

      {visible.map(renderYear)}

      {upcoming.length > 0 && (
        <>
          <Button size="small" onClick={() => setShowUpcoming((value) => !value)} sx={{ mt: 1, mb: 1, fontWeight: 700 }}>
            {showUpcoming
              ? 'Hide upcoming years'
              : `Show upcoming years (${upcoming.map((group) => group.year).join(', ')})`}
          </Button>
          {showUpcoming && upcoming.map(renderYear)}
        </>
      )}

      {creating && <CreateBatchDialog onClose={() => setCreating(false)} onCreated={handleCreated} />}

      {closing && (
        <ConfirmCloseDialog
          batch={closing}
          busy={busyId === closing.id}
          onCancel={() => setClosing(null)}
          onConfirm={() => setStatus(closing, 'closed')}
        />
      )}
    </Box>
  )
}
