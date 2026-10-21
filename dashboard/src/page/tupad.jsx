import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
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
import BatchList from '../components/BatchList.jsx'
import { useDebounce } from '../utils/useDebounce.js'

// Server routes: GET and POST /tupad/batches/:batchId/applicants, PUT and DELETE .../applicants/:id


const rowsPerPage = 10
const today = new Date().toISOString().slice(0, 10)

const civilStatusOptions = ['Single', 'Married', 'Widowed', 'Separated']
const beneficiaryTypes = ['Father', 'Mother', 'Son', 'Daughter']
const remarkOptions = ['Qualified', 'Disqualified']

const columns = [
  { key: 'lastName', label: 'Last Name' },
  { key: 'firstName', label: 'First Name' },
  { key: 'middleName', label: 'Middle Name' },
  { key: 'nameExtension', label: 'Extension Name' },
  { key: 'birthdate', label: 'Birthdate' },
  { key: 'address', label: 'Address' },
  { key: 'idType', label: 'Type of ID' },
  { key: 'idNumber', label: 'I.D. Number' },
  { key: 'contactNumber', label: 'Contact Number' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'sex', label: 'Sex' },
  { key: 'civilStatus', label: 'Civil Status' },
  { key: 'averageMonthlyIncome', label: 'Average Monthly Income' },
  { key: 'beneficiaryType', label: 'Type of Beneficiary' },
  { key: 'beneficiaryLastName', label: 'Beneficiary Last Name' },
  { key: 'beneficiaryFirstName', label: 'Beneficiary First Name' },
  { key: 'beneficiaryMiddleName', label: 'Beneficiary Middle Name' },
  { key: 'skillsTrainingNeed', label: 'Skills Training Need' },
  { key: 'yearLevel', label: 'Year Level' },
  { key: 'remarks'},
]
const labelOf = Object.fromEntries(columns.map((column) => [column.key, column.label]))

// The table only shows the key columns; everything else is in the detail window.
const tableColumns = [
  { key: 'lastName', label: 'Last Name' },
  { key: 'firstName', label: 'First Name' },
  { key: 'middleName', label: 'Middle Name' },
  { key: 'contactNumber', label: 'Contact Number' },
  { key: 'address', label: 'Address' },
  { key: 'beneficiaryType', label: 'Beneficiary Type' },
  { key: 'beneficiaryName', label: 'Beneficiary Name' },
  { key: 'skillsTrainingNeed', label: 'Skills Training Need' },
  { key: 'yearLevel', label: 'Year Level' },
  { key: 'remarks', label: 'Remarks' },
]
const hideOnNarrow = new Set(['middleName', 'contactNumber', 'address', 'yearLevel'])

// "Last, First Middle Ext"
const fullName = (row) => {
  const given = [row.firstName, row.middleName, row.nameExtension].filter(Boolean).join(' ')
  return [row.lastName, given].filter(Boolean).join(', ')
}
const beneficiaryName = (row) => {
  const given = [row.beneficiaryFirstName, row.beneficiaryMiddleName].filter(Boolean).join(' ')
  return [row.beneficiaryLastName, given].filter(Boolean).join(', ')
}

const emptyRow = () => columns.reduce((row, column) => {
  row[column.key] = ''
  return row
}, { id: null })

const fromApi = (row) => ({ ...emptyRow(), ...row, id: row.id })
const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}
const formatIncome = (value) => {
  if (value === '' || value === null || value === undefined) return '—'
  return `Php ${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
const display = (row, key) => {
  if (key === 'averageMonthlyIncome') return formatIncome(row[key])
  if (key === 'birthdate') return formatDate(row[key])
  if (key === 'beneficiaryName') return beneficiaryName(row) || '—'
  return row[key] || '—'
}

function TupadTable({ batch, onBack }) {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(0)
  const [formRow, setFormRow] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const isClosed = batch.status === 'closed'
  const applicantsPath = `/tupad/batches/${batch.id}/applicants`

  useEffect(() => {
    api.get(applicantsPath).then((data) => setRows(data.map(fromApi))).catch((loadError) => setError(loadError.message)).finally(() => setLoading(false))
  }, [applicantsPath])

const filteredRows = useMemo(() => {
  const query = debouncedSearch.trim().toLowerCase()
    return query ? rows.filter((row) => columns.some(({ key }) => String(row[key] ?? '').toLowerCase().includes(query))) : rows
  }, [rows, debouncedSearch])

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage))
  const visiblePage = Math.min(page, pageCount - 1)
  const pagedRows = filteredRows.slice(visiblePage * rowsPerPage, (visiblePage + 1) * rowsPerPage)

  const updateField = (key, value) => setFormRow((current) => ({ ...current, [key]: value }))
  const saveRow = async () => {
    const required = [
      'lastName', 'firstName', 'birthdate', 'address', 'sex', 'civilStatus',
      'beneficiaryType', 'beneficiaryLastName', 'beneficiaryFirstName',
    ]
    if (!formRow || required.some((key) => !String(formRow[key] || '').trim())) {
      setError('Please fill in all required fields.')
      return
    }
    if (formRow.birthdate > today) {
      setError('Birthdate cannot be in the future.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const saved = formRow.id === null
        ? await api.post(applicantsPath, formRow)
        : await api.put(`${applicantsPath}/${formRow.id}`, formRow)
      const savedRow = formRow.id === null ? fromApi({ ...formRow, id: saved.id }) : fromApi(saved)
      setRows((current) => formRow.id === null ? [...current, savedRow] : current.map((row) => row.id === savedRow.id ? savedRow : row))
      setFormRow(null)
      setPage(0)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }
  const deleteRow = async () => {
    try {
      await api.delete(`${applicantsPath}/${deleteTarget.id}`)
      setRows((current) => current.filter((row) => row.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  return (
    <main className="gip-page sagut-page">
      <Box className="gip-page-heading">
        <Box>
            <Button className="gip-home-button" onClick={onBack}>
            <span aria-hidden="true">←</span>
            All batches
          </Button>
          <Box className="gip-eyebrow">PROGRAM TRACKING DATABASE</Box>
          <Typography className="gip-page-title" component="h1" variant="h5">Tupad · {batch.name}</Typography>
          <Typography className="gip-page-hint" component="p" variant="body2">{isClosed ? 'This batch is closed. Records are read-only until an administrator reopens it.' : 'Manage, search, and review Tupad applicant information.'}</Typography>
        </Box>
        <Box className="gip-record-count"><strong>{rows.length}</strong><span>applicants</span></Box>
      </Box>
      <Paper className="gip-table-card" elevation={0}>
        <Box className="gip-table-toolbar">
          <Typography className="gip-section-title" component="h2" variant="h6">Applicant List</Typography>
          {error && !formRow && <Typography color="error" role="alert" variant="body2">{error}</Typography>}
          <Box className="gip-toolbar-actions">
            <TextField aria-label="Search Tupad applicants" className="gip-search" onChange={(event) => { setSearch(event.target.value); setPage(0) }} placeholder="Search applicants..." size="small" value={search} />
            <Button className="gip-add-button" disabled={isClosed} variant="contained" onClick={() => { setError(''); setFormRow(emptyRow()) }}>Add Applicant</Button>
          </Box>
        </Box>
        <TableContainer className="gip-table-container sagut-table-container">
          <Table stickyHeader aria-label="Tupad applicants" className="gip-table sagut-table" size="small">
            <TableHead>
              <TableRow>
                {tableColumns.map((column) => <TableCell className={`gip-column-header ${hideOnNarrow.has(column.key) ? 'sagut-hide-narrow' : ''}`} key={column.key}>{column.label}</TableCell>)}
                <TableCell className="gip-column-header gip-actions-header">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? <TableRow><TableCell align="center" colSpan={tableColumns.length + 1}>Loading applicants...</TableCell></TableRow>
                : pagedRows.length === 0 ? <TableRow><TableCell align="center" colSpan={tableColumns.length + 1}>{search ? 'No applicants match your search.' : 'No applicants yet. Add an applicant to begin.'}</TableCell></TableRow>
                  : pagedRows.map((row) => <TableRow className="gip-data-row" hover key={row.id} onClick={() => setSelectedRow(row)}>
                    {tableColumns.map((column) => <TableCell className={`${column.key === 'lastName' ? 'sagut-name-cell' : ''} ${hideOnNarrow.has(column.key) ? 'sagut-hide-narrow' : ''}`} key={column.key}>{display(row, column.key)}</TableCell>)}
                    <TableCell className="gip-actions-cell" onClick={(event) => event.stopPropagation()}>
                      <Button disabled={isClosed} size="small" onClick={() => { setError(''); setFormRow({ ...row }) }}>Edit</Button>
                      {user?.role === 'admin' && !isClosed && <IconButton aria-label={`Delete ${fullName(row)}`} color="error" onClick={() => setDeleteTarget(row)} size="small">×</IconButton>}
                    </TableCell>
                  </TableRow>)}
            </TableBody>
          </Table>
        </TableContainer>
        <Box className="sagut-pagination">
          <Typography variant="body2">{filteredRows.length ? `${visiblePage * rowsPerPage + 1}–${Math.min((visiblePage + 1) * rowsPerPage, filteredRows.length)} of ${filteredRows.length}` : '0 applicants'}</Typography>
          <Button disabled={visiblePage === 0} onClick={() => setPage((current) => current - 1)}>Previous</Button>
          <Button disabled={visiblePage >= pageCount - 1} onClick={() => setPage((current) => current + 1)}>Next</Button>
        </Box>
      </Paper>

      <Dialog fullWidth maxWidth="lg" onClose={() => setFormRow(null)} open={Boolean(formRow)}>
        <DialogTitle>{formRow?.id === null ? 'Add New Tupad Applicant' : 'Edit Tupad Applicant'}</DialogTitle>
        <DialogContent dividers>
          {formRow && <>
            <FormSection title="Applicant Information">
              <Field span={4} label="Last Name" value={formRow.lastName} onChange={(value) => updateField('lastName', value)} required />
              <Field span={4} label="First Name" value={formRow.firstName} onChange={(value) => updateField('firstName', value)} required />
              <Field span={4} label="Middle Name" value={formRow.middleName} onChange={(value) => updateField('middleName', value)} />
              <Field span={3} label="Extension Name" value={formRow.nameExtension} onChange={(value) => updateField('nameExtension', value)} />
              <Field span={3} label="Birthdate" type="date" value={formRow.birthdate} onChange={(value) => updateField('birthdate', value)} required />
              <FormControl className="sagut-span-3" required><FormLabel>Sex</FormLabel><RadioGroup row value={formRow.sex} onChange={(event) => updateField('sex', event.target.value)}><FormControlLabel control={<Radio />} label="Male" value="Male" /><FormControlLabel control={<Radio />} label="Female" value="Female" /></RadioGroup></FormControl>
              <TextField select required className="sagut-span-3" label="Civil Status" value={formRow.civilStatus} onChange={(event) => updateField('civilStatus', event.target.value)}>{civilStatusOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</TextField>
              <Field span={12} label="Address" value={formRow.address} onChange={(value) => updateField('address', value)} required />
              <Field span={3} label="Type of ID" value={formRow.idType} onChange={(value) => updateField('idType', value)} />
              <Field span={3} label="I.D. Number" value={formRow.idNumber} onChange={(value) => updateField('idNumber', value)} />
              <Field span={3} label="Contact Number" value={formRow.contactNumber} onChange={(value) => updateField('contactNumber', value)} />
              <Field span={3} label="Occupation" value={formRow.occupation} onChange={(value) => updateField('occupation', value)} />
              <Field span={4} label="Average Monthly Income" type="number" adornment="Php" value={formRow.averageMonthlyIncome} onChange={(value) => updateField('averageMonthlyIncome', value)} />
            </FormSection>
            <FormSection title="Complete Information of Beneficiary (18 Above)">
              <TextField select required className="sagut-span-4" label="Type of Beneficiary" value={formRow.beneficiaryType} onChange={(event) => updateField('beneficiaryType', event.target.value)}>{beneficiaryTypes.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</TextField>
              <Field span={4} label="Last Name" value={formRow.beneficiaryLastName} onChange={(value) => updateField('beneficiaryLastName', value)} required />
              <Field span={4} label="First Name" value={formRow.beneficiaryFirstName} onChange={(value) => updateField('beneficiaryFirstName', value)} required />
              <Field span={4} label="Middle Name" value={formRow.beneficiaryMiddleName} onChange={(value) => updateField('beneficiaryMiddleName', value)} />
              <Field span={4} label="Skills Training Need" value={formRow.skillsTrainingNeed} onChange={(value) => updateField('skillsTrainingNeed', value)} />
              <Field span={4} label="Year Level" value={formRow.yearLevel} onChange={(value) => updateField('yearLevel', value)} />
            </FormSection>
            <FormSection title="Remarks">
              <FormControl className="sagut-span-12"><Box className="sagut-option-list">{remarkOptions.map((option) => <Button key={option} variant={formRow.remarks === option ? 'contained' : 'outlined'} onClick={() => updateField('remarks', formRow.remarks === option ? '' : option)}>{option}</Button>)}</Box></FormControl>
            </FormSection>
          </>}
        </DialogContent>
        <DialogActions>{error && <Typography color="error" role="alert" sx={{ mr: 'auto', pl: 1 }} variant="body2">{error}</Typography>}<Button onClick={() => { setError(''); setFormRow(null) }}>Cancel</Button><Button disabled={saving} onClick={saveRow} variant="contained">{saving ? 'Saving...' : 'Save Applicant'}</Button></DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="md" onClose={() => setSelectedRow(null)} open={Boolean(selectedRow)}>
        <DialogTitle>{selectedRow && fullName(selectedRow)}</DialogTitle>
        <DialogContent dividers>{selectedRow && <DetailView row={selectedRow} />}</DialogContent>
        <DialogActions>
          <Button disabled={isClosed} onClick={() => { setError(''); setFormRow({ ...selectedRow }); setSelectedRow(null) }}>Edit</Button>
          <Button onClick={() => setSelectedRow(null)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog onClose={() => setDeleteTarget(null)} open={Boolean(deleteTarget)}><DialogTitle>Delete applicant?</DialogTitle><DialogContent>This will permanently remove {deleteTarget && fullName(deleteTarget)}.</DialogContent><DialogActions><Button onClick={() => setDeleteTarget(null)}>Cancel</Button><Button color="error" onClick={deleteRow}>Delete</Button></DialogActions></Dialog>
    </main>
  )
}

function FormSection({ title, children }) {
  return <Box className="gip-form-section"><Typography className="gip-form-section-heading" component="h2" variant="subtitle1">{title}</Typography><Box className="sagut-form-grid">{children}</Box></Box>
}
function Field({ label, value, onChange, type = 'text', required = false, span = 4, adornment }) {
  const isNumber = type === 'number'
  return (
    <TextField
      fullWidth
      className={`sagut-span-${span}`}
      label={label}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      slotProps={{
        inputLabel: type === 'date' || adornment ? { shrink: true } : undefined,
        input: adornment ? { startAdornment: <InputAdornment position="start">{adornment}</InputAdornment> } : undefined,
        htmlInput: isNumber ? { min: 0, step: 'any', inputMode: 'decimal' } : {},
      }}
      type={type}
      value={value ?? ''}
    />
  )
}
function DetailSection({ title, children }) {
  return <Box className="sagut-detail-section"><Typography className="gip-form-section-heading" component="h3" variant="subtitle1">{title}</Typography>{children}</Box>
}
function DetailFields({ row, keys }) {
  return <Box className="sagut-detail-grid">{keys.map((key) => <Box key={key}><Typography variant="caption">{labelOf[key]}</Typography><Typography>{display(row, key)}</Typography></Box>)}</Box>
}
function DetailView({ row }) {
  return (
    <>
      <DetailSection title="Applicant Information"><DetailFields row={row} keys={['lastName', 'firstName', 'middleName', 'nameExtension', 'birthdate', 'sex', 'civilStatus', 'address', 'contactNumber']} /></DetailSection>
      <DetailSection title="ID, Occupation and Income"><DetailFields row={row} keys={['idType', 'idNumber', 'occupation', 'averageMonthlyIncome']} /></DetailSection>
      <DetailSection title="Beneficiary Information"><DetailFields row={row} keys={['beneficiaryType', 'beneficiaryLastName', 'beneficiaryFirstName', 'beneficiaryMiddleName', 'skillsTrainingNeed', 'yearLevel']} /></DetailSection>
      <DetailSection title="Remarks"><DetailFields row={row} keys={['remarks']} /></DetailSection>
    </>
  )
}


// Pick a batch first, then show that batch's table.
function Tupad() {
  const [batch, setBatch] = useState(null)

  if (!batch) {
    return <BatchList basePath="/tupad/batches" title="Tupad Batches" noun="applicant" nounPlural="applicants" onOpen={setBatch} />
  }

  return <TupadTable key={batch.id} batch={batch} onBack={() => setBatch(null)} />
}

export default Tupad