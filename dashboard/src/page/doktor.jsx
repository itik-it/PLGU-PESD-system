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

const rowsPerPage = 10
const today = new Date().toISOString().slice(0, 10)

const civilStatusOptions = ['Single', 'Married', 'Widowed', 'Separated']
const gwaFields = [
  ['gwaFirstYear', '1st Year'],
  ['gwaSecondYear', '2nd Year'],
  ['gwaThirdYear', '3rd Year'],
  ['gwaFourthYear', '4th Year (Medical Clerk)'],
  ['gwaInternship', 'Internship'],
  ['gwaReviewForBoard', 'Review for Board'],
]

const columns = [
  { key: 'dateApplied', label: 'Date of Application' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'firstName', label: 'First Name' },
  { key: 'middleName', label: 'Middle Name' },
  { key: 'nameExtension', label: 'Extension Name' },
  { key: 'contactNumber', label: 'Contact No.' },
  { key: 'sex', label: 'Sex' },
  { key: 'birthdate', label: 'Birthdate' },
  { key: 'address', label: 'Address' },
  { key: 'age', label: 'Age' },
  { key: 'civilStatus', label: 'Civil Status' },
  { key: 'yearsResidency', label: 'Years of Residency in Nueva Vizcaya' },
  { key: 'premedCourse', label: 'Pre-Med Course' },
  { key: 'medExamResult', label: 'Medical School Entrance Exam Result/Rating' },
  { key: 'medExamDate', label: 'Date of Examination' },
  { key: 'nmatResult', label: 'NMAT Result/Rating' },
  { key: 'nmatExamDate', label: 'Date of Examination (NMAT)' },
  { key: 'schoolLastAttended', label: 'School Last Attended' },
  { key: 'gwa', label: 'GWA' },
  { key: 'awards', label: 'Award/s Received' },
  ...gwaFields.map(([key, label]) => ({ key, label: `GWA · ${label}` })),
]
const labelOf = Object.fromEntries(columns.map((column) => [column.key, column.label]))
const dateKeys = new Set(['dateApplied', 'birthdate', 'medExamDate', 'nmatExamDate'])
const percentKeys = new Set(['gwa', ...gwaFields.map(([key]) => key)])

// The table only shows the key columns; everything else is in the detail window.
const tableKeys = ['lastName', 'firstName', 'middleName', 'contactNumber', 'premedCourse', 'schoolLastAttended', 'gwa']
const hideOnNarrow = new Set(['middleName', 'contactNumber', 'schoolLastAttended'])
const tableColumns = tableKeys.map((key) => ({ key, label: key === 'gwa' ? 'GWA' : labelOf[key] }))

// "Last, First Middle Ext"
const fullName = (row) => {
  const given = [row.firstName, row.middleName, row.nameExtension].filter(Boolean).join(' ')
  return [row.lastName, given].filter(Boolean).join(', ')
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
const display = (row, key) => {
  if (dateKeys.has(key)) return formatDate(row[key])
  if (percentKeys.has(key)) return row[key] === '' || row[key] === null || row[key] === undefined ? '—' : `${row[key]}`
  return row[key] || '—'
}
const calcAge = (value) => {
  if (!value) return ''
  const birth = new Date(`${value}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return ''
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const month = now.getMonth() - birth.getMonth()
  if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age -= 1
  return age >= 0 ? String(age) : ''
}

function DoktorTable({ batch, onBack }) {
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
  const applicantsPath = `/doktor/batches/${batch.id}/applicants`

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

  const updateField = (key, value) => setFormRow((current) => ({
    ...current,
    [key]: value,
    ...(key === 'birthdate' ? { age: calcAge(value) } : {}),
  }))
  const saveRow = async () => {
    const required = ['dateApplied', 'lastName', 'firstName', 'sex', 'birthdate', 'address', 'contactNumber']
    if (!formRow || required.some((key) => !String(formRow[key] || '').trim())) {
      setError('Please fill in all required fields.')
      return
    }
    if (formRow.dateApplied > today || formRow.birthdate > today) {
      setError('Date of application and birthdate cannot be in the future.')
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
          <Typography className="gip-page-title" component="h1" variant="h5">Doktor ti Umili Scholarship Program · {batch.name}</Typography>
          <Typography className="gip-page-hint" component="p" variant="body2">{isClosed ? 'This batch is closed. Records are read-only until an administrator reopens it.' : 'Manage, search, and review Nueva Vizcaya Doktor ti Umili scholarship applicants.'}</Typography>
        </Box>
        <Box className="gip-record-count"><strong>{rows.length}</strong><span>applicants</span></Box>
      </Box>
      <Paper className="gip-table-card" elevation={0}>
        <Box className="gip-table-toolbar">
          <Typography className="gip-section-title" component="h2" variant="h6">Applicant List</Typography>
          {error && !formRow && <Typography color="error" role="alert" variant="body2">{error}</Typography>}
          <Box className="gip-toolbar-actions">
            <TextField aria-label="Search Doktor ti Umili applicants" className="gip-search" onChange={(event) => { setSearch(event.target.value); setPage(0) }} placeholder="Search applicants..." size="small" value={search} />
            <Button className="gip-add-button" disabled={isClosed} variant="contained" onClick={() => { setError(''); setFormRow(emptyRow()) }}>Add Applicant</Button>
          </Box>
        </Box>
        <TableContainer className="gip-table-container sagut-table-container">
          <Table stickyHeader aria-label="Doktor ti Umili applicants" className="gip-table sagut-table" size="small">
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
        <DialogTitle>{formRow?.id === null ? 'Add New Doktor ti Umili Applicant' : 'Edit Doktor ti Umili Applicant'}</DialogTitle>
        <DialogContent dividers>
          {formRow && <>
            <FormSection title="Application Info">
              <Field span={6} label="Date of Application" type="date" value={formRow.dateApplied} onChange={(value) => updateField('dateApplied', value)} required />
            </FormSection>
            <FormSection title="Applicant Information">
              <Field span={4} label="Last Name" value={formRow.lastName} onChange={(value) => updateField('lastName', value)} required />
              <Field span={4} label="First Name" value={formRow.firstName} onChange={(value) => updateField('firstName', value)} required />
              <Field span={4} label="Middle Name" value={formRow.middleName} onChange={(value) => updateField('middleName', value)} />
              <Field span={3} label="Extension Name" value={formRow.nameExtension} onChange={(value) => updateField('nameExtension', value)} />
              <Field span={3} label="Birthdate" type="date" value={formRow.birthdate} onChange={(value) => updateField('birthdate', value)} required />
              <Field span={3} label="Age" type="number" value={formRow.age} onChange={(value) => updateField('age', value)} />
              <FormControl className="sagut-span-3" required><FormLabel>Sex</FormLabel><RadioGroup row value={formRow.sex} onChange={(event) => updateField('sex', event.target.value)}><FormControlLabel control={<Radio />} label="Male" value="Male" /><FormControlLabel control={<Radio />} label="Female" value="Female" /></RadioGroup></FormControl>
              <Field span={12} label="Address" value={formRow.address} onChange={(value) => updateField('address', value)} required />
              <Field span={4} label="Contact No." value={formRow.contactNumber} onChange={(value) => updateField('contactNumber', value)} required />
              <TextField select className="sagut-span-4" label="Civil Status" value={formRow.civilStatus} onChange={(event) => updateField('civilStatus', event.target.value)}>{civilStatusOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</TextField>
              <Field span={4} label="Years of Residency in Nueva Vizcaya" type="number" value={formRow.yearsResidency} onChange={(value) => updateField('yearsResidency', value)} />
            </FormSection>
            <FormSection title="Pre-Med and Examinations">
              <Field span={12} label="Pre-Med Course" value={formRow.premedCourse} onChange={(value) => updateField('premedCourse', value)} />
              <Field span={6} label="Medical School Entrance Exam Result/Rating" value={formRow.medExamResult} onChange={(value) => updateField('medExamResult', value)} />
              <Field span={6} label="Date of Examination" type="date" value={formRow.medExamDate} onChange={(value) => updateField('medExamDate', value)} />
              <Field span={6} label="NMAT Result/Rating" value={formRow.nmatResult} onChange={(value) => updateField('nmatResult', value)} />
              <Field span={6} label="Date of Examination" type="date" value={formRow.nmatExamDate} onChange={(value) => updateField('nmatExamDate', value)} />
            </FormSection>
            <FormSection title="School and Awards">
              <Field span={6} label="School Last Attended" value={formRow.schoolLastAttended} onChange={(value) => updateField('schoolLastAttended', value)} />
              <Field span={3} label="GWA" type="number" value={formRow.gwa} onChange={(value) => updateField('gwa', value)} />
              <TextField
                fullWidth
                multiline
                minRows={2}
                className="sagut-span-12"
                label="Award/s Received (if any)"
                placeholder="e.g. Community Service Award, Socio-Cultural Award"
                value={formRow.awards ?? ''}
                onChange={(event) => updateField('awards', event.target.value)}
              />
            </FormSection>
            <FormSection title="GWA per Year Level">
              {gwaFields.map(([key, label]) => (
                <Field key={key} span={4} label={`${label}`} type="number" value={formRow[key]} onChange={(value) => updateField(key, value)} />
              ))}
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
function Field({ label, value, onChange, type = 'text', required = false, span = 4 }) {
  const isNumber = type === 'number'
  return (
    <TextField
      fullWidth
      className={`sagut-span-${span}`}
      label={label}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      slotProps={{
        inputLabel: type === 'date' ? { shrink: true } : undefined,
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
      <DetailSection title="Application Info"><DetailFields row={row} keys={['dateApplied']} /></DetailSection>
      <DetailSection title="Applicant Information"><DetailFields row={row} keys={['lastName', 'firstName', 'middleName', 'nameExtension', 'birthdate', 'age', 'sex', 'civilStatus', 'address', 'contactNumber', 'yearsResidency']} /></DetailSection>
      <DetailSection title="Pre-Med and Examinations"><DetailFields row={row} keys={['premedCourse', 'medExamResult', 'medExamDate', 'nmatResult', 'nmatExamDate']} /></DetailSection>
      <DetailSection title="School and Awards"><DetailFields row={row} keys={['schoolLastAttended', 'gwa', 'awards']} /></DetailSection>
      <DetailSection title="GWA per Year Level"><DetailFields row={row} keys={gwaFields.map(([key]) => key)} /></DetailSection>
    </>
  )
}

// Pick a batch first, then show that batch's table.
function Doktor() {
  const [batch, setBatch] = useState(null)

  if (!batch) {
    return <BatchList basePath="/doktor/batches" title="Doktor ti Umili Batches" noun="applicant" nounPlural="applicants" onOpen={setBatch} />
  }

  return <DoktorTable key={batch.id} batch={batch} onBack={() => setBatch(null)} />
}

export default Doktor