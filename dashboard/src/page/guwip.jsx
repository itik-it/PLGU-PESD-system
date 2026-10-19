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

const rowsPerPage = 10
const today = new Date().toISOString().slice(0, 10)

const civilStatusOptions = ['Single', 'Married', 'Widowed', 'Separated']
const educationOptions = ['Senior High School Graduate', 'College Graduate', 'Post-graduate', 'Technical-Vocational Graduate']
const employmentTypeOptions = ['Permanent', 'Temporary', 'Contractual', 'Part-time']
const remarkOptions = ['Employed', 'Unemployed']
const statusFields = [
  ['freshGraduate', 'Fresh Graduate'],
  ['youngProfessional', 'Young Professional'],
  ['firstTimeJobseeker', 'First Time Jobseeker'],
  ['unemployed', 'Unemployed'],
  ['underemployed', 'Underemployed'],
]

const columns = [
  { key: 'lastName', label: 'Surname' },
  { key: 'firstName', label: 'First Name' },
  { key: 'middleName', label: 'Middle Name' },
  { key: 'nameExtension', label: 'Extension Name' },
  { key: 'birthdate', label: 'Date of Birth' },
  { key: 'age', label: 'Age' },
  { key: 'sex', label: 'Sex' },
  { key: 'civilStatus', label: 'Civil Status' },
  { key: 'street', label: 'House/Block/Lot/Street' },
  { key: 'barangay', label: 'Barangay' },
  { key: 'municipality', label: 'Municipality' },
  { key: 'province', label: 'Province' },
  { key: 'zipCode', label: 'ZIP Code' },
  { key: 'mobileNumber', label: 'Mobile No.' },
  { key: 'email', label: 'Email Address' },
  { key: 'emergencyContactPerson', label: 'Emergency Contact Person' },
  { key: 'emergencyRelationship', label: 'Relationship' },
  { key: 'emergencyContactNumber', label: 'Contact Number' },
  { key: 'highestEducation', label: 'Highest Educational Attainment' },
  { key: 'schoolName', label: 'Name of School/University' },
  { key: 'course', label: 'Course/Degree' },
  { key: 'major', label: 'Major/Specialization' },
  { key: 'yearGraduated', label: 'Year Graduated' },
  { key: 'professionalLicense', label: 'Professional License/Eligibility' },
  { key: 'employer', label: 'Employer (if underemployed)' },
  { key: 'position', label: 'Position' },
  { key: 'employmentType', label: 'Employment Status' },
  { key: 'monthlyIncome', label: 'Monthly Income' },
  { key: 'remarks', label: 'Remarks' },
]
const labelOf = Object.fromEntries(columns.map((column) => [column.key, column.label]))

// The table only shows the key columns; everything else is in the detail window.
const tableColumns = [
  { key: 'lastName', label: 'Surname' },
  { key: 'firstName', label: 'First Name' },
  { key: 'middleName', label: 'Middle Name' },
  { key: 'mobileNumber', label: 'Mobile No.' },
  { key: 'barangay', label: 'Barangay' },
  { key: 'municipality', label: 'Municipality' },
  { key: 'highestEducation', label: 'Highest Education' },
  { key: 'course', label: 'Course' },
  { key: 'employmentStatus', label: 'Current Employment Status' },
  { key: 'remarks', label: 'Remarks' },
]
const hideOnNarrow = new Set(['middleName', 'mobileNumber', 'barangay', 'course'])

// "Last, First Middle Ext"
const fullName = (row) => {
  const given = [row.firstName, row.middleName, row.nameExtension].filter(Boolean).join(' ')
  return [row.lastName, given].filter(Boolean).join(', ')
}
const activeStatuses = (row) => statusFields.filter(([key]) => row[key]).map(([, label]) => label)

const emptyTraining = () => ({ title: '', hours: '', dateConducted: '' })
const emptyRow = () => {
  const row = columns.reduce((result, column) => {
    result[column.key] = ''
    return result
  }, { id: null })
  statusFields.forEach(([key]) => { row[key] = false })
  row.province = 'Nueva Vizcaya'
  row.trainings = []
  return row
}

const fromApi = (row) => {
  const next = { ...emptyRow(), ...row, id: row.id, trainings: row.trainings || [] }
  statusFields.forEach(([key]) => { next[key] = Boolean(next[key]) })
  return next
}
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
  if (key === 'employmentStatus') return activeStatuses(row).join(', ') || '—'
  if (key === 'monthlyIncome') return formatIncome(row[key])
  if (key === 'birthdate') return formatDate(row[key])
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

function GuwipTable({ batch, onBack }) {
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
  const isClosed = batch.status === 'closed'
  const applicantsPath = `/guwip/batches/${batch.id}/applicants`

  useEffect(() => {
    api.get(applicantsPath).then((data) => setRows(data.map(fromApi))).catch((loadError) => setError(loadError.message)).finally(() => setLoading(false))
  }, [applicantsPath])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((row) => {
      const text = [
        ...columns.map(({ key }) => row[key]),
        ...activeStatuses(row),
        ...row.trainings.map((training) => training.title),
      ]
      return text.some((value) => String(value ?? '').toLowerCase().includes(query))
    })
  }, [rows, search])

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage))
  const visiblePage = Math.min(page, pageCount - 1)
  const pagedRows = filteredRows.slice(visiblePage * rowsPerPage, (visiblePage + 1) * rowsPerPage)

  const updateField = (key, value) => setFormRow((current) => ({
    ...current,
    [key]: value,
    ...(key === 'birthdate' ? { age: calcAge(value) } : {}),
  }))
  const updateTraining = (index, key, value) => setFormRow((current) => ({
    ...current,
    trainings: current.trainings.map((training, i) => (i === index ? { ...training, [key]: value } : training)),
  }))
  const addTraining = () => setFormRow((current) => ({ ...current, trainings: [...current.trainings, emptyTraining()] }))
  const removeTraining = (index) => setFormRow((current) => ({ ...current, trainings: current.trainings.filter((_, i) => i !== index) }))

  const saveRow = async () => {
    const required = ['lastName', 'firstName', 'birthdate', 'sex', 'barangay', 'municipality']
    if (!formRow || required.some((key) => !String(formRow[key] || '').trim())) {
      setError('Please fill in all required fields.')
      return
    }
    if (formRow.birthdate > today) {
      setError('Date of birth cannot be in the future.')
      return
    }
    // Skip blank training rows
    const payload = { ...formRow, trainings: formRow.trainings.filter((training) => training.title.trim()) }
    setSaving(true)
    setError('')
    try {
      const saved = payload.id === null
        ? await api.post(applicantsPath, payload)
        : await api.put(`${applicantsPath}/${payload.id}`, payload)
      const savedRow = payload.id === null ? fromApi({ ...payload, id: saved.id }) : fromApi(saved)
      setRows((current) => payload.id === null ? [...current, savedRow] : current.map((row) => row.id === savedRow.id ? savedRow : row))
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
          <Typography className="gip-page-title" component="h1" variant="h5">GUWIP – Gayyem Ti Umili Work Internship Program · {batch.name}</Typography>
          <Typography className="gip-page-hint" component="p" variant="body2">{isClosed ? 'This batch is closed. Records are read-only until an administrator reopens it.' : 'Manage, search, and review GUWIP applicants.'}</Typography>
        </Box>
        <Box className="gip-record-count"><strong>{rows.length}</strong><span>applicants</span></Box>
      </Box>
      <Paper className="gip-table-card" elevation={0}>
        <Box className="gip-table-toolbar">
          <Typography className="gip-section-title" component="h2" variant="h6">Applicant List</Typography>
          {error && !formRow && <Typography color="error" role="alert" variant="body2">{error}</Typography>}
          <Box className="gip-toolbar-actions">
            <TextField aria-label="Search GUWIP applicants" className="gip-search" onChange={(event) => { setSearch(event.target.value); setPage(0) }} placeholder="Search applicants..." size="small" value={search} />
            <Button className="gip-add-button" disabled={isClosed} variant="contained" onClick={() => { setError(''); setFormRow(emptyRow()) }}>Add Applicant</Button>
          </Box>
        </Box>
        <TableContainer className="gip-table-container sagut-table-container">
          <Table stickyHeader aria-label="GUWIP applicants" className="gip-table sagut-table" size="small">
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
        <DialogTitle>{formRow?.id === null ? 'Add New GUWIP Applicant' : 'Edit GUWIP Applicant'}</DialogTitle>
        <DialogContent dividers>
          {formRow && <>
            <FormSection title="I. Personal Information">
              <Field span={4} label="Surname" value={formRow.lastName} onChange={(value) => updateField('lastName', value)} required />
              <Field span={4} label="First Name" value={formRow.firstName} onChange={(value) => updateField('firstName', value)} required />
              <Field span={4} label="Middle Name" value={formRow.middleName} onChange={(value) => updateField('middleName', value)} />
              <Field span={3} label="Extension Name (if any)" value={formRow.nameExtension} onChange={(value) => updateField('nameExtension', value)} />
              <Field span={3} label="Date of Birth" type="date" value={formRow.birthdate} onChange={(value) => updateField('birthdate', value)} required />
              <Field span={3} label="Age" type="number" value={formRow.age} onChange={(value) => updateField('age', value)} />
              <FormControl className="sagut-span-3" required><FormLabel>Sex</FormLabel><RadioGroup row value={formRow.sex} onChange={(event) => updateField('sex', event.target.value)}><FormControlLabel control={<Radio />} label="Male" value="Male" /><FormControlLabel control={<Radio />} label="Female" value="Female" /></RadioGroup></FormControl>
              <FormControl className="sagut-span-12"><FormLabel>Civil Status</FormLabel><RadioGroup row value={formRow.civilStatus} onChange={(event) => updateField('civilStatus', event.target.value)}>{civilStatusOptions.map((option) => <FormControlLabel control={<Radio />} key={option} label={option} value={option} />)}</RadioGroup></FormControl>
            </FormSection>
            <FormSection title="Address">
              <Field span={6} label="House/Block/Lot/Street" value={formRow.street} onChange={(value) => updateField('street', value)} />
              <Field span={3} label="Barangay" value={formRow.barangay} onChange={(value) => updateField('barangay', value)} required />
              <Field span={3} label="Municipality" value={formRow.municipality} onChange={(value) => updateField('municipality', value)} required />
              <Field span={6} label="Province" value={formRow.province} onChange={(value) => updateField('province', value)} />
              <Field span={6} label="ZIP Code" value={formRow.zipCode} onChange={(value) => updateField('zipCode', value)} />
            </FormSection>
            <FormSection title="Contact Information">
              <Field span={6} label="Mobile No." value={formRow.mobileNumber} onChange={(value) => updateField('mobileNumber', value)} />
              <Field span={6} label="Email Address" type="email" value={formRow.email} onChange={(value) => updateField('email', value)} />
              <Field span={6} label="Emergency Contact Person" value={formRow.emergencyContactPerson} onChange={(value) => updateField('emergencyContactPerson', value)} />
              <Field span={3} label="Relationship" value={formRow.emergencyRelationship} onChange={(value) => updateField('emergencyRelationship', value)} />
              <Field span={3} label="Contact Number" value={formRow.emergencyContactNumber} onChange={(value) => updateField('emergencyContactNumber', value)} />
            </FormSection>
            <FormSection title="II. Educational Background">
              <FormControl className="sagut-span-12"><FormLabel>Highest Educational Attainment</FormLabel><RadioGroup row value={formRow.highestEducation} onChange={(event) => updateField('highestEducation', event.target.value)}>{educationOptions.map((option) => <FormControlLabel control={<Radio />} key={option} label={option} value={option} />)}</RadioGroup></FormControl>
              <Field span={6} label="Name of School/University" value={formRow.schoolName} onChange={(value) => updateField('schoolName', value)} />
              <Field span={6} label="Course/Degree" value={formRow.course} onChange={(value) => updateField('course', value)} />
              <Field span={6} label="Major/Specialization" value={formRow.major} onChange={(value) => updateField('major', value)} />
              <Field span={3} label="Year Graduated" type="number" value={formRow.yearGraduated} onChange={(value) => updateField('yearGraduated', value)} />
              <Field span={12} label="Professional License/Eligibility, if applicable" value={formRow.professionalLicense} onChange={(value) => updateField('professionalLicense', value)} />
            </FormSection>
            <FormSection title="Relevant Training/Certifications">
              {formRow.trainings.map((training, index) => (
                <Box key={index} sx={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '6fr 3fr 3fr auto' }, gap: 2, alignItems: 'center' }}>
                  <TextField fullWidth label="Title of Training/Seminar" value={training.title} onChange={(event) => updateTraining(index, 'title', event.target.value)} />
                  <TextField fullWidth label="Number of Hours" type="number" slotProps={{ htmlInput: { min: 0, step: 'any', inputMode: 'decimal' } }} value={training.hours ?? ''} onChange={(event) => updateTraining(index, 'hours', event.target.value)} />
                  <TextField fullWidth label="Date Conducted" value={training.dateConducted ?? ''} onChange={(event) => updateTraining(index, 'dateConducted', event.target.value)} />
                  <IconButton aria-label="Remove training" color="error" onClick={() => removeTraining(index)} size="small">×</IconButton>
                </Box>
              ))}
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Button onClick={addTraining} variant="outlined">+ Add Training</Button>
              </Box>
            </FormSection>
            <FormSection title="III. Employment Information">
              <Box className="sagut-span-12"><FormLabel>Current Employment Status</FormLabel><CheckFields fields={statusFields} row={formRow} updateField={updateField} /></Box>
              <Field span={6} label="Employer (if underemployed)" value={formRow.employer} onChange={(value) => updateField('employer', value)} />
              <Field span={6} label="Position" value={formRow.position} onChange={(value) => updateField('position', value)} />
              <FormControl className="sagut-span-12"><FormLabel>Employment Status</FormLabel><RadioGroup row value={formRow.employmentType} onChange={(event) => updateField('employmentType', event.target.value)}>{employmentTypeOptions.map((option) => <FormControlLabel control={<Radio />} key={option} label={option} value={option} />)}</RadioGroup></FormControl>
              <Field span={4} label="Monthly Income" type="number" adornment="Php" value={formRow.monthlyIncome} onChange={(value) => updateField('monthlyIncome', value)} />
            </FormSection>
            <FormSection title="Remarks">
              <FormControl className="sagut-span-12"><FormLabel>Remarks</FormLabel><Box className="sagut-option-list">{remarkOptions.map((option) => <Button key={option} variant={formRow.remarks === option ? 'contained' : 'outlined'} onClick={() => updateField('remarks', formRow.remarks === option ? '' : option)}>{option}</Button>)}</Box></FormControl>
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
function ChipList({ row, fields }) {
  const active = fields.filter(([key]) => row[key])
  return active.length
    ? <Box className="sagut-option-list">{active.map(([key, label]) => <Chip key={key} label={label} />)}</Box>
    : <Typography color="text.secondary" variant="body2">None selected</Typography>
}
function DetailView({ row }) {
  return (
    <>
      <DetailSection title="I. Personal Information"><DetailFields row={row} keys={['lastName', 'firstName', 'middleName', 'nameExtension', 'birthdate', 'age', 'sex', 'civilStatus']} /></DetailSection>
      <DetailSection title="Address"><DetailFields row={row} keys={['street', 'barangay', 'municipality', 'province', 'zipCode']} /></DetailSection>
      <DetailSection title="Contact Information"><DetailFields row={row} keys={['mobileNumber', 'email', 'emergencyContactPerson', 'emergencyRelationship', 'emergencyContactNumber']} /></DetailSection>
      <DetailSection title="II. Educational Background"><DetailFields row={row} keys={['highestEducation', 'schoolName', 'course', 'major', 'yearGraduated', 'professionalLicense']} /></DetailSection>
      <DetailSection title="Relevant Training/Certifications">
        {row.trainings.length ? (
          <Table size="small" aria-label="Relevant training and certifications">
            <TableHead>
              <TableRow><TableCell>Title of Training/Seminar</TableCell><TableCell>Number of Hours</TableCell><TableCell>Date Conducted</TableCell></TableRow>
            </TableHead>
            <TableBody>
              {row.trainings.map((training, index) => (
                <TableRow key={training.id ?? index}><TableCell>{training.title || '—'}</TableCell><TableCell>{training.hours || '—'}</TableCell><TableCell>{training.dateConducted || '—'}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        ) : <Typography color="text.secondary" variant="body2">No trainings listed</Typography>}
      </DetailSection>
      <DetailSection title="III. Employment Information">
        <Typography variant="caption">Current Employment Status</Typography>
        <ChipList row={row} fields={statusFields} />
        <Box sx={{ mt: 2 }}><DetailFields row={row} keys={['employer', 'position', 'employmentType', 'monthlyIncome']} /></Box>
      </DetailSection>
      <DetailSection title="Remarks"><DetailFields row={row} keys={['remarks']} /></DetailSection>
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

// Pick a batch first, then show that batch's table.
function Guwip() {
  const [batch, setBatch] = useState(null)

  if (!batch) {
    return <BatchList basePath="/guwip/batches" title="GUWIP Batches" noun="applicant" nounPlural="applicants" onOpen={setBatch} />
  }

  return <GuwipTable key={batch.id} batch={batch} onBack={() => setBatch(null)} />
}

export default Guwip
