import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Checkbox,
  Chip,
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

const rowsPerPage = 10
const today = new Date().toISOString().slice(0, 10)

const sectorFields = [
  ['ip', 'IP'], ['women', 'Women'], ['pwd', 'PWD'], ['urbanPoor', 'Urban Poor'],
  ['soloParentChild', 'Solo Parent Child'], ['fourPs', '4Ps'],
]
const employmentFields = [
  ['employed', 'Employed'], ['unemployed', 'Unemployed'], ['selfEmployed', 'Self-Employed'],
]
const gwaFields = [
  ['firstYearFirstSem', '1st Year · 1st Sem'], ['firstYearSecondSem', '1st Year · 2nd Sem'],
  ['secondYearFirstSem', '2nd Year · 1st Sem'], ['secondYearSecondSem', '2nd Year · 2nd Sem'],
  ['thirdYearFirstSem', '3rd Year · 1st Sem'], ['thirdYearSecondSem', '3rd Year · 2nd Sem'],
  ['fourthYearFirstSem', '4th Year · 1st Sem'], ['fourthYearSecondSem', '4th Year · 2nd Sem'],
]

const gwaYears = [['firstYear', '1st Year'], ['secondYear', '2nd Year'], ['thirdYear', '3rd Year'], ['fourthYear', '4th Year']]

const columns = [
  { key: 'submissionDate', label: 'Date of Submission of Application Letter', group: 'Application Info', width: 130 },
  { key: 'lastName', label: 'Last Name', group: 'Applicant', sticky: true },
  { key: 'firstName', label: 'First Name', group: 'Applicant' },
  { key: 'middleName', label: 'Middle Name', group: 'Applicant' },
  { key: 'gender', label: 'Gender', group: 'Applicant' },
  { key: 'contactNumber', label: 'Contact Number', group: 'Applicant', width: 140 },
  { key: 'familyIncome', label: 'Average 12 Months Family Income (Php)', group: '1st Screening Requirements', width: 190 },
  { key: 'incomeSources', label: 'Sources', group: '1st Screening Requirements', width: 160 },
  { key: 'municipality', label: 'Municipality', group: '1st Screening Requirements', width: 140 },
  { key: 'barangay', label: 'Barangay', group: '1st Screening Requirements', width: 140 },
  { key: 'yearsResidency', label: 'Years of Residency in NV', group: '1st Screening Requirements', width: 140 },
  ...sectorFields.map(([key, label]) => ({ key, label, group: 'Sector' })),
  { key: 'highSchool', label: 'HS Last Attended', group: 'Education / Admission', width: 190 },
  { key: 'age', label: 'Age (as of filling date)', group: 'Education / Admission', width: 130 },
  { key: 'admissionTestDate', label: 'Date NVSU Admission Test Passed', group: 'Education / Admission', width: 180 },
  { key: 'rating', label: 'Rating', group: 'Education / Admission' },
  { key: 'course', label: 'Course', group: 'Education / Admission', width: 180 },
  { key: 'placeOfStudy', label: 'Place of Study', group: 'Education / Admission', width: 130 },
  ...gwaFields.map(([key, label]) => ({ key, label, group: 'GWA' })),
  { key: 'awardsReceived', label: 'Awards Received', group: 'Awards', width: 220 },
  ...employmentFields.map(([key, label]) => ({ key, label, group: 'Current Employment Status' })),
  { key: 'remarks', label: 'Remarks', group: 'Other', width: 140 },
  { key: 'batch', label: 'Batch', group: 'Other', width: 100 },
]

// The table only shows the key columns; everything else is in the detail window.
const tableKeys = [
  'lastName', 'firstName', 'middleName', 'contactNumber', 'municipality',
  'barangay', 'course', 'placeOfStudy', 'batch', 'remarks',
]
const hideOnNarrow = new Set(['middleName', 'contactNumber', 'barangay', 'placeOfStudy'])
const tableColumns = tableKeys.map((key) => columns.find((column) => column.key === key))
const labelOf = Object.fromEntries(columns.map((column) => [column.key, column.label]))

// "Last, First Middle"
const fullName = (row) => {
  const given = [row.firstName, row.middleName].filter(Boolean).join(' ')
  return [row.lastName, given].filter(Boolean).join(', ')
}

const emptyRow = () => columns.reduce((row, column) => {
  row[column.key] = sectorFields.concat(employmentFields).some(([key]) => key === column.key) ? false : ''
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
  if (sectorFields.concat(employmentFields).some(([field]) => field === key)) return row[key] ? '✓' : ''
  if (key === 'familyIncome') return formatIncome(row[key])
  if (key === 'submissionDate' || key === 'admissionTestDate') return formatDate(row[key])
  return row[key] || '—'
}

function Sagut() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [formRow, setFormRow] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [remarkOptions, setRemarkOptions] = useState(['Ongoing', 'Dropped'])
  const [newRemark, setNewRemark] = useState('')

  useEffect(() => {
    api.get('/sagut').then((data) => setRows(data.map(fromApi))).catch((loadError) => setError(loadError.message)).finally(() => setLoading(false))
  }, [])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return query ? rows.filter((row) => columns.some(({ key }) => String(row[key]).toLowerCase().includes(query))) : rows
  }, [rows, search])
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage))
  const visiblePage = Math.min(page, pageCount - 1)
  const pagedRows = filteredRows.slice(visiblePage * rowsPerPage, (visiblePage + 1) * rowsPerPage)

  const updateField = (key, value) => setFormRow((current) => ({ ...current, [key]: value }))
  const saveRow = async () => {
    const required = ['submissionDate', 'lastName', 'firstName', 'gender', 'contactNumber', 'municipality', 'barangay']
    if (!formRow || required.some((key) => !String(formRow[key] || '').trim())) {
      setError('Please fill in all required fields.')
      return
    }
    if (formRow.submissionDate > today || formRow.admissionTestDate > today) {
      setError('Dates cannot be in the future.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const saved = formRow.id === null
        ? await api.post('/sagut', formRow)
        : await api.put(`/sagut/${formRow.id}`, formRow)
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
      await api.delete(`/sagut/${deleteTarget.id}`)
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
          <Button className="gip-home-button" href="/">
            <span aria-hidden="true">←</span>
             Back to Dashboard
          </Button>
          <Box className="gip-eyebrow">PROGRAM TRACKING DATABASE</Box>
          <Typography className="gip-page-title" component="h1" variant="h5">SAGUT Scholarship Program</Typography>
          <Typography className="gip-page-hint" component="p" variant="body2">Manage, search, and review Provincial Scholarship of Nueva Vizcaya applicants.</Typography>
        </Box>
        <Box className="gip-record-count"><strong>{rows.length}</strong><span>applicants</span></Box>
      </Box>
      <Paper className="gip-table-card" elevation={0}>
        <Box className="gip-table-toolbar">
          <Typography className="gip-section-title" component="h2" variant="h6">Applicant List</Typography>
          {error && !formRow && <Typography color="error" role="alert" variant="body2">{error}</Typography>}
          <Box className="gip-toolbar-actions">
            <TextField aria-label="Search SAGUT applicants" className="gip-search" onChange={(event) => { setSearch(event.target.value); setPage(0) }} placeholder="Search applicants..." size="small" value={search} />
            <Button className="gip-add-button" variant="contained" onClick={() => { setError(''); setFormRow(emptyRow()) }}>Add Applicant</Button>
          </Box>
        </Box>
        <TableContainer className="gip-table-container sagut-table-container">
          <Table stickyHeader aria-label="SAGUT scholarship applicants" className="gip-table sagut-table" size="small">
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
                      <Button size="small" onClick={() => { setError(''); setFormRow({ ...row }) }}>Edit</Button>
                      {user?.role === 'admin' && <IconButton aria-label={`Delete ${fullName(row)}`} color="error" onClick={() => setDeleteTarget(row)} size="small">×</IconButton>}
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
        <DialogTitle>{formRow?.id === null ? 'Add New SAGUT Applicant' : 'Edit SAGUT Applicant'}</DialogTitle>
        <DialogContent dividers>
          {formRow && <>
            <SagutSection title="Applicant Information">
              <Field span={4} label="Date of Submission of Application Letter" type="date" value={formRow.submissionDate} onChange={(value) => updateField('submissionDate', value)} required />
              <Field span={4} label="Last Name" value={formRow.lastName} onChange={(value) => updateField('lastName', value)} required />
              <Field span={4} label="First Name" value={formRow.firstName} onChange={(value) => updateField('firstName', value)} required />
              <Field span={4} label="Middle Name" value={formRow.middleName} onChange={(value) => updateField('middleName', value)} />
              <FormControl className="sagut-span-4" required><FormLabel>Gender</FormLabel><RadioGroup row value={formRow.gender} onChange={(event) => updateField('gender', event.target.value)}><FormControlLabel control={<Radio />} label="Male" value="Male" /><FormControlLabel control={<Radio />} label="Female" value="Female" /></RadioGroup></FormControl>
              <Field span={4} label="Contact Number" value={formRow.contactNumber} onChange={(value) => updateField('contactNumber', value)} required />
            </SagutSection>
            <SagutSection title="1st Screening Requirements">
              <Field span={3} label="Average 12 Months Family Income" type="number" adornment="Php" value={formRow.familyIncome} onChange={(value) => updateField('familyIncome', value)} />
              <Field span={3} label="Years of Residency in NV" type="number" value={formRow.yearsResidency} onChange={(value) => updateField('yearsResidency', value)} />
              <Field span={6} label="Sources" value={formRow.incomeSources} onChange={(value) => updateField('incomeSources', value)} />
              <Field span={6} label="Municipality" value={formRow.municipality} onChange={(value) => updateField('municipality', value)} required />
              <Field span={6} label="Barangay" value={formRow.barangay} onChange={(value) => updateField('barangay', value)} required />
            </SagutSection>
            <SagutSection title="Sector"><CheckFields fields={sectorFields} row={formRow} updateField={updateField} /></SagutSection>
            <SagutSection title="Education / Admission">
              <Field span={6} label="HS Last Attended" value={formRow.highSchool} onChange={(value) => updateField('highSchool', value)} />
              <Field span={3} label="Age (as of filling date)" type="number" value={formRow.age} onChange={(value) => updateField('age', value)} />
              <Field span={3} label="Rating" value={formRow.rating} onChange={(value) => updateField('rating', value)} />
              <Field span={4} label="Date NVSU Admission Test Passed" type="date" value={formRow.admissionTestDate} onChange={(value) => updateField('admissionTestDate', value)} />
              <Field span={5} label="Course" value={formRow.course} onChange={(value) => updateField('course', value)} />
              <Field span={3} label="Place of Study" value={formRow.placeOfStudy} onChange={(value) => updateField('placeOfStudy', value)} />
            </SagutSection>
            <SagutSection title="GWA" gwa>
              {gwaYears.map(([prefix, yearLabel]) => (
                <Box className="sagut-gwa-year" key={prefix}>
                  <Typography className="sagut-gwa-label">{yearLabel}</Typography>
                  <Field label="1st Sem" type="number" ariaLabel={`${yearLabel} 1st Sem GWA`} value={formRow[`${prefix}FirstSem`]} onChange={(value) => updateField(`${prefix}FirstSem`, value)} />
                  <Field label="2nd Sem" type="number" ariaLabel={`${yearLabel} 2nd Sem GWA`} value={formRow[`${prefix}SecondSem`]} onChange={(value) => updateField(`${prefix}SecondSem`, value)} />
                </Box>
              ))}
            </SagutSection>
            <SagutSection title="Awards Received">
              <TextField
                fullWidth
                multiline
                minRows={2}
                className="sagut-span-12"
                placeholder="e.g. Dean's Lister, Best in Thesis"
                value={formRow.awardsReceived ?? ''}
                onChange={(event) => updateField('awardsReceived', event.target.value)}
                slotProps={{ htmlInput: { maxLength: 255 } }}
              />
            </SagutSection>
            <SagutSection title="Current Employment Status"><CheckFields fields={employmentFields} row={formRow} updateField={updateField} /></SagutSection>
            <SagutSection title="Remarks and Batch">
              <FormControl className="sagut-span-5"><FormLabel>Remarks</FormLabel><Box className="sagut-option-list">{remarkOptions.map((option) => <Button key={option} variant={formRow.remarks === option ? 'contained' : 'outlined'} onClick={() => updateField('remarks', option)}>{option}</Button>)}</Box></FormControl>
              <Box className="sagut-add-remark sagut-span-4"><TextField label="New remark option" size="small" value={newRemark} onChange={(event) => setNewRemark(event.target.value)} /><Button onClick={() => { if (newRemark.trim()) { setRemarkOptions((current) => [...new Set([...current, newRemark.trim()])]); updateField('remarks', newRemark.trim()); setNewRemark('') } }}>Add option</Button></Box>
              <TextField select className="sagut-span-3" label="Batch" value={formRow.batch} onChange={(event) => updateField('batch', event.target.value)}>{Array.from({ length: 9 }, (_, index) => <MenuItem key={index + 1} value={`Batch ${index + 1}`}>Batch {index + 1}</MenuItem>)}</TextField>
            </SagutSection>
          </>}
        </DialogContent>
        <DialogActions>{error && <Typography color="error" role="alert" sx={{ mr: 'auto', pl: 1 }} variant="body2">{error}</Typography>}<Button onClick={() => { setError(''); setFormRow(null) }}>Cancel</Button><Button disabled={saving} onClick={saveRow} variant="contained">{saving ? 'Saving...' : 'Save Applicant'}</Button></DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="md" onClose={() => setSelectedRow(null)} open={Boolean(selectedRow)}>
        <DialogTitle>{selectedRow && fullName(selectedRow)}</DialogTitle>
        <DialogContent dividers>{selectedRow && <DetailView row={selectedRow} />}</DialogContent>
        <DialogActions>
          <Button onClick={() => { setError(''); setFormRow({ ...selectedRow }); setSelectedRow(null) }}>Edit</Button>
          <Button onClick={() => setSelectedRow(null)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog onClose={() => setDeleteTarget(null)} open={Boolean(deleteTarget)}><DialogTitle>Delete applicant?</DialogTitle><DialogContent>This will permanently remove {deleteTarget && fullName(deleteTarget)}.</DialogContent><DialogActions><Button onClick={() => setDeleteTarget(null)}>Cancel</Button><Button color="error" onClick={deleteRow}>Delete</Button></DialogActions></Dialog>
    </main>
  )
}

function SagutSection({ title, children, gwa = false }) {
  return <Box className="gip-form-section"><Typography className="gip-form-section-heading" component="h2" variant="subtitle1">{title}</Typography><Box className={gwa ? 'sagut-gwa-grid' : 'sagut-form-grid'}>{children}</Box></Box>
}
function Field({ label, value, onChange, type = 'text', required = false, span = 4, adornment, ariaLabel }) {
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
        htmlInput: { ...(isNumber ? { min: 0, step: 'any', inputMode: 'decimal' } : {}), ...(ariaLabel ? { 'aria-label': ariaLabel } : {}) },
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
function ChipList({ row, fields }) {
  const active = fields.filter(([key]) => row[key])
  return active.length
    ? <Box className="sagut-option-list">{active.map(([key, label]) => <Chip key={key} label={label} />)}</Box>
    : <Typography color="text.secondary" variant="body2">None selected</Typography>
}
function DetailView({ row }) {
  return (
    <>
      <DetailSection title="Application Info"><DetailFields row={row} keys={['submissionDate']} /></DetailSection>
      <DetailSection title="Applicant"><DetailFields row={row} keys={['lastName', 'firstName', 'middleName', 'gender', 'contactNumber']} /></DetailSection>
      <DetailSection title="1st Screening Requirements"><DetailFields row={row} keys={['familyIncome', 'incomeSources', 'municipality', 'barangay', 'yearsResidency']} /></DetailSection>
      <DetailSection title="Sector"><ChipList row={row} fields={sectorFields} /></DetailSection>
      <DetailSection title="Education / Admission"><DetailFields row={row} keys={['highSchool', 'age', 'admissionTestDate', 'rating', 'course', 'placeOfStudy']} /></DetailSection>
      <DetailSection title="GWA">
        <Box className="sagut-gwa-grid">
          {gwaYears.map(([prefix, yearLabel]) => (
            <Box className="sagut-gwa-year" key={prefix}>
              <Typography className="sagut-gwa-label">{yearLabel}</Typography>
              {['FirstSem', 'SecondSem'].map((sem) => (
                <Box key={sem}><Typography variant="caption">{sem === 'FirstSem' ? '1st Sem' : '2nd Sem'}</Typography><Typography>{row[`${prefix}${sem}`] === '' ? '—' : row[`${prefix}${sem}`]}</Typography></Box>
              ))}
            </Box>
          ))}
        </Box>
      </DetailSection>
      <DetailSection title="Awards Received"><DetailFields row={row} keys={['awardsReceived']} /></DetailSection>
      <DetailSection title="Current Employment Status"><ChipList row={row} fields={employmentFields} /></DetailSection>
      <DetailSection title="Remarks and Batch"><DetailFields row={row} keys={['remarks', 'batch']} /></DetailSection>
    </>
  )
}
function CheckFields({ fields, row, updateField }) {
  return (
    <Box className="sagut-check-list">
      {fields.map(([key, label]) => (
        <FormControlLabel
          control={<Checkbox checked={Boolean(row[key])} onChange={(event) => updateField(key, event.target.checked)} />}
          key={key}
          label={label}
        />
      ))}
    </Box>
  )
}

export default Sagut
