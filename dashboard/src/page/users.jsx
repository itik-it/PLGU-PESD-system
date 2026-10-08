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
  DialogTitle,
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
  Typography,
} from '@mui/material'
import { api } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'

const emptyForm = { username: '', fullName: '', password: '', role: 'staff' }

export default function Users() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState(null) // null = dialog closed
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

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
      const created = await api.post('/users', form)
      setUsers((current) => [...current, created])
      closeForm()
    } catch (saveError) {
      setFormError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }))

  return (
    <Box
      component="main"
      sx={{ maxWidth: 1000, mx: 'auto', px: { xs: 2, md: 4 }, py: 5, color: 'text.primary' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
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
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Last login</TableCell>
              <TableCell align="center">Active</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <CircularProgress size={24} color="secondary" />
                </TableCell>
              </TableRow>
            )}
            {users.map((item) => (
              <TableRow key={item.id} hover>
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
                <TableCell>{item.lastLoginAt || 'Never'}</TableCell>
                <TableCell align="center">
                  <Switch
                    checked={item.isActive}
                    onChange={() => toggleActive(item)}
                    disabled={item.id === me.id}
                    color="secondary"
                    inputProps={{ 'aria-label': `Toggle ${item.username}` }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {form && (
        <Dialog open onClose={saving ? undefined : closeForm} fullWidth maxWidth="xs">
          <Box component="form" onSubmit={saveUser} noValidate>
            <DialogTitle sx={{ fontWeight: 800 }}>Add user</DialogTitle>
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
              />
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
              <TextField
                select
                fullWidth
                margin="dense"
                label="Role"
                value={form.role}
                onChange={updateField('role')}
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
                {saving ? 'Saving...' : 'Create user'}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>
      )}
    </Box>
  )
}
