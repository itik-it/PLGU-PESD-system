import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { api } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'

const emptyForm = { username: '', fullName: '', password: '', role: 'staff' }

// "2026-10-15 12:18:42" -> "Today, 12:18 PM" / "Yesterday, ..." / "3 days ago" / "Oct 2, 2026"
function formatLastLogin(value) {
  if (!value) return 'Never'
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return String(value)

  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const dayDiff = Math.round((startOfToday - new Date(date).setHours(0, 0, 0, 0)) / 86400000)

  if (dayDiff <= 0) return `Today, ${time}`
  if (dayDiff === 1) return `Yesterday, ${time}`
  if (dayDiff < 7) return `${dayDiff} days ago`
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function Users() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState(null) // null = dialog closed; form.id set = editing
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [menu, setMenu] = useState(null) // { anchor, user }
  const [deleting, setDeleting] = useState(null) // user waiting for delete confirmation
  const [deleteBusy, setDeleteBusy] = useState(false)

  useEffect(() => {
    api
      .get('/users')
      .then(setUsers)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false))
  }, [])

  const toggleActive = async (target) => {
    setError('')
    try {
      const updated = await api.patch(`/users/${target.id}`, { isActive: !target.isActive })
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch (toggleError) {
      setError(toggleError.message)
    }
  }

  const closeForm = () => {
    setForm(null)
    setFormError('')
  }

  const saveUser = async (event) => {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      if (form.id) {
        const updated = await api.put(`/users/${form.id}`, {
          fullName: form.fullName,
          role: form.role,
        })
        setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      } else {
        const created = await api.post('/users', form)
        setUsers((current) => [...current, created])
      }
      closeForm()
    } catch (saveError) {
      setFormError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    setDeleteBusy(true)
    setError('')
    try {
      await api.delete(`/users/${deleting.id}`)
      setUsers((current) => current.filter((item) => item.id !== deleting.id))
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setDeleteBusy(false)
      setDeleting(null)
    }
  }

  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }))

  const isEditing = Boolean(form?.id)
  const isEditingSelf = isEditing && form.id === me.id

  return (
    <Box
      component="main"
      sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: 4, color: 'text.primary' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Button className="gip-home-button" href="/">
            <span aria-hidden="true">←</span>
            Back to Dashboard
          </Button>
          <Typography component="h2" variant="h5" sx={{ fontWeight: 800 }}>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Accounts that can log in to the system
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => setForm(emptyForm)}>
          Add user
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Last login</TableCell>
              <TableCell align="center">Active</TableCell>
              <TableCell align="right" sx={{ width: 64 }}>
                <span style={{ position: 'absolute', left: -9999 }}>Actions</span>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress size={24} color="secondary" />
                </TableCell>
              </TableRow>
            )}
            {users.map((item) => {
              const isMe = item.id === me.id
              return (
                <TableRow
                  key={item.id}
                  hover
                  sx={{ '& > td:nth-of-type(-n+4)': { opacity: item.isActive ? 1 : 0.5 } }}
                >
                  <TableCell>{item.fullName}</TableCell>
                  <TableCell>{item.username}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={item.role}
                      color={item.role === 'admin' ? 'primary' : 'default'}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={item.lastLoginAt || ''} placement="top-start">
                      <span>{formatLastLogin(item.lastLoginAt)}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={isMe ? "You can't deactivate your own account" : ''}>
                      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        <Switch
                          checked={item.isActive}
                          onChange={() => toggleActive(item)}
                          disabled={isMe}
                          color="secondary"
                          inputProps={{ 'aria-label': `Toggle ${item.username}` }}
                        />
                        {!item.isActive && (
                          <Typography variant="caption" color="text.secondary">
                            Inactive
                          </Typography>
                        )}
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      aria-label={`Actions for ${item.username}`}
                      onClick={(event) => setMenu({ anchor: event.currentTarget, user: item })}
                      sx={{ fontWeight: 800 }}
                    >
                      ⋯
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            const target = menu.user
            setMenu(null)
            setForm({ id: target.id, fullName: target.fullName, username: target.username, role: target.role })
          }}
        >
          Edit user
        </MenuItem>
        <MenuItem
          disabled={menu?.user.id === me.id}
          sx={{ color: 'error.main' }}
          onClick={() => {
            const target = menu.user
            setMenu(null)
            setDeleting(target)
          }}
        >
          Delete user
        </MenuItem>
      </Menu>

      {deleting && (
        <Dialog open onClose={deleteBusy ? undefined : () => setDeleting(null)} fullWidth maxWidth="xs">
          <DialogTitle sx={{ fontWeight: 800 }}>Delete {deleting.fullName}?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              This permanently removes the account ({deleting.username}). If you only want to stop them from
              logging in, turn off their Active switch instead.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDeleting(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button variant="contained" color="error" onClick={confirmDelete} disabled={deleteBusy}>
              {deleteBusy ? 'Deleting...' : 'Delete user'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {form && (
        <Dialog open onClose={saving ? undefined : closeForm} fullWidth maxWidth="xs">
          <Box component="form" onSubmit={saveUser} noValidate>
            <DialogTitle sx={{ fontWeight: 800 }}>{isEditing ? 'Edit user' : 'Add user'}</DialogTitle>
            <DialogContent>
              {formError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {formError}
                </Alert>
              )}
              <TextField
                autoFocus
                fullWidth
                margin="dense"
                label="Full name"
                value={form.fullName}
                onChange={updateField('fullName')}
              />
              <TextField
                fullWidth
                margin="dense"
                label="Username"
                autoComplete="off"
                value={form.username}
                onChange={updateField('username')}
                disabled={isEditing}
              />
              {!isEditing && (
                <TextField
                  fullWidth
                  margin="dense"
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  helperText="At least 8 characters"
                  value={form.password}
                  onChange={updateField('password')}
                />
              )}
              <TextField
                select
                fullWidth
                margin="dense"
                label="Role"
                value={form.role}
                onChange={updateField('role')}
                disabled={isEditingSelf}
                helperText={isEditingSelf ? "You can't change your own role." : undefined}
              >
                <MenuItem value="staff">Staff</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </TextField>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={closeForm} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Create user'}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>
      )}
    </Box>
  )
}
