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
import { useDebounce } from '../utils/useDebounce.js'

const basePath = '/spes/applicants'

const parentStatusFields = [
  ['parentsLivingTogether', 'Living Together'], ['parentsSoloParent', 'Solo Parent'], ['parentsSeparated', 'Separated'],
  ['parentsPwd', 'Persons with Disability'], ['parentsSeniorCitizen', 'Senior Citizen'],
  ['parentsSugarPlantationWorker', 'Sugar Plantation Worker'], ['parentsIndigenousPeople', 'Indigenous People'],
  ['parentsDisplacedWorker', 'Displaced Worker'], ['parents4psBeneficiary', '4Ps Beneficiary (1)'],
  ['parentsLocal', 'Local (2)'], ['parentsOfw', 'OFW'],
]
const educationLevels = ['Elementary', 'Secondary', 'Tertiary', 'Tech-Voc']
const ordinals = ['1st', '2nd', '3rd', '4th']
const blankEducation = (level) => ({ level, schoolName: '', course: '', yearLevel: '', dateOfAttendance: '' })
const blankAvailment = (availmentNo) => ({ availmentNo, establishmentName: '', yearAvailed: '', spesIdNo: '' })

const columns = [
  { key: 'lastName', label: 'Last Name', group: 'Applicant' },
  { key: 'firstName', label: 'First Name', group: 'Applicant' },
  { key: 'middleName', label: 'Middle Name', group: 'Applicant' },
  { key: 'sex', label: 'Sex', group: 'Applicant' },
  { key: 'birthdate', label: 'Date of Birth', group: 'Applicant' },
  { key: 'placeOfBirth', label: 'Place of Birth', group: 'Applicant' },
  { key: 'civilStatus', label: 'Status', group: 'Applicant' },
  { key: 'citizenship', label: 'Citizenship', group: 'Applicant' },
  { key: 'email', label: 'Email Address', group: 'Applicant' },
  { key: 'socialMediaAccount', label: 'Social Media Account', group: 'Applicant' },
  { key: 'gsisBeneficiary', label: 'GSIS Beneficiary', group: 'Applicant' },
  { key: 'gsisRelationship', label: 'Relationship', group: 'Applicant' },
  { key: 'contactNumber', label: 'Contact Number', group: 'Applicant' },
  { key: 'presentAddress', label: 'Present Address', group: 'Applicant' },
  { key: 'permanentAddress', label: 'Permanent Address', group: 'Applicant' },
  { key: 'applicantCategory', label: "Applicant's Category", group: 'Applicant' },
  { key: 'fatherName', label: "Father's Name", group: 'Parents' },
  { key: 'fatherContactNo', label: 'Contact No.', group: 'Parents' },
  { key: 'fatherOccupation', label: 'Occupation', group: 'Parents' },
  { key: 'motherName', label: "Mother's Name", group: 'Parents' },
  { key: 'motherContactNo', label: 'Contact No.', group: 'Parents' },
  { key: 'motherOccupation', label: 'Occupation', group: 'Parents' },
  ...parentStatusFields.map(([key, label]) => ({ key, label, group: 'Current Status of Parents' })),
  { key: 'specialSkills', label: 'Special Skills', group: 'Other' },
  { key: 'otherDoleInterventions', label: 'Other related information/requests/interventions from DOLE', group: 'Other' },
]

// The table only shows the key columns; everything else is in the detail window.
const tableKeys = ['lastName', 'firstName', 'middleName', 'sex', 'contactNumber', 'applicantCategory']
const hideOnNarrow = new Set(['middleName', 'sex', 'contactNumber'])
const checkKeys = new Set(parentStatusFields.map(([key]) => key))
const yesNoKeys = new Set()
const dateKeys = new Set(['birthdate'])
const requiredKeys = ['lastName', 'firstName', 'sex', 'birthdate', 'contactNumber', 'applicantCategory']
const futureDateKeys = ['birthdate']
const nameKey = 'lastName'
const newRowDefaults = {}
// Education always has the four levels; availment history always has four slots.
const normalize = (row) => ({
  ...row,
  education: educationLevels.map((level) => ({ ...blankEducation(level), ...(row.education || []).find((item) => item.level === level) })),
  availmentHistory: ordinals.map((_, index) => ({ ...blankAvailment(index + 1), ...(row.availmentHistory || []).find((item) => Number(item.availmentNo) === index + 1) })),
})
const customDisplay = () => undefined
const hasData = (item, keys) => keys.some((key) => String(item[key] || '').trim())
const prepare = (row) => ({
  ...row,
  education: row.education.filter((item) => hasData(item, ['schoolName', 'course', 'yearLevel', 'dateOfAttendance'])),
  availmentHistory: row.availmentHistory.filter((item) => hasData(item, ['establishmentName', 'yearAvailed', 'spesIdNo'])),
})

// "Last, First Middle"
const fullName = (row) => {
  const given = [row.firstName, row.middleName].filter(Boolean).join(' ')
  return [row.lastName, given].filter(Boolean).join(', ')
}

const rowsPerPage = 10
const today = new Date().toISOString().slice(0, 10)
const labelOf = Object.fromEntries(columns.map((column) => [column.key, column.label]))
const tableColumns = tableKeys.map((key) => columns.find((column) => column.key === key))

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}
const display = (row, key) => {
  const custom = customDisplay(row, key)
  if (custom !== undefined) return custom
  if (yesNoKeys.has(key)) return row[key] ? 'Yes' : 'No'
  if (checkKeys.has(key)) return row[key] ? '✓' : ''
  if (dateKeys.has(key)) return formatDate(row[key])
  return row[key] === '' || row[key] === null || row[key] === undefined ? '—' : row[key]
}

const blankRow = () => columns.filter((column) => !column.derived).reduce((row, column) => {
  row[column.key] = checkKeys.has(column.key) ? false : ''
  return row
}, { id: null })
const emptyRow = () => normalize({ ...blankRow(), ...newRowDefaults })
const fromApi = (row) => normalize({ ...blankRow(), ...row, id: row.id })
function Spes() {
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

  useEffect(() => {
    api.get(basePath).then((data) => setRows(data.map(fromApi))).catch((loadError) => setError(loadError.message)).finally(() => setLoading(false))
  }, [])

  const filteredRows = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    return query ? rows.filter((row) => columns.some(({ key }) => String(row[key] ?? '').toLowerCase().includes(query))) : rows
  }, [rows, debouncedSearch])
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage))
  const visiblePage = Math.min(page, pageCount - 1)
  const pagedRows = filteredRows.slice(visiblePage * rowsPerPage, (visiblePage + 1) * rowsPerPage)

  const updateField = (key, value) => setFormRow((current) => ({ ...current, [key]: value }))
  const updateItem = (listKey, index, key, value) => setFormRow((current) => ({
    ...current,
    [listKey]: current[listKey].map((item, position) => (position === index ? { ...item, [key]: value } : item)),
  }))
  const saveRow = async () => {
    if (!formRow || requiredKeys.some((key) => !String(formRow[key] || '').trim())) {
      setError('Please fill in all required fields.')
      return
    }
    if (futureDateKeys.some((key) => formRow[key] > today)) {
      setError('Dates cannot be in the future.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = prepare(formRow)
      const saved = formRow.id === null
        ? await api.post(basePath, payload)
        : await api.put(`${basePath}/${formRow.id}`, payload)
      const savedRow = fromApi({ ...payload, ...saved, id: formRow.id === null ? saved.id : formRow.id })
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
      await api.delete(`${basePath}/${deleteTarget.id}`)
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
          <Typography className="gip-page-title" component="h1" variant="h5">Special Program For Employment Of Students (SPES)</Typography>
          <Typography className="gip-page-hint" component="p" variant="body2">Manage, search, and review SPES applicants.</Typography>
        </Box>
        <Box className="gip-record-count"><strong>{rows.length}</strong><span>applicants</span></Box>
      </Box>
      <Paper className="gip-table-card" elevation={0}>
        <Box className="gip-table-toolbar">
          <Typography className="gip-section-title" component="h2" variant="h6">SPES Applicant List</Typography>
          {error && !formRow && <Typography color="error" role="alert" variant="body2">{error}</Typography>}
          <Box className="gip-toolbar-actions">
            <TextField aria-label="Search applicants" className="gip-search" onChange={(event) => { setSearch(event.target.value); setPage(0) }} placeholder="Search applicants..." size="small" value={search} />
            <Button className="gip-add-button" variant="contained" onClick={() => { setError(''); setFormRow(emptyRow()) }}>Add Applicant</Button>
          </Box>
        </Box>
        <TableContainer className="gip-table-container sagut-table-container">
          <Table stickyHeader aria-label="SPES applicants" className="gip-table sagut-table" size="small">
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
                    {tableColumns.map((column) => <TableCell className={`${column.key === nameKey ? 'sagut-name-cell' : ''} ${hideOnNarrow.has(column.key) ? 'sagut-hide-narrow' : ''}`} key={column.key}>{display(row, column.key)}</TableCell>)}
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
        <DialogTitle>{formRow?.id === null ? 'Add New SPES Applicant' : 'Edit SPES Applicant'}</DialogTitle>
        <DialogContent dividers>
          {formRow && <>
            <FormSection title="Student / Applicant's Information">
              <Field span={4} label="Last Name" value={formRow.lastName} onChange={(value) => updateField('lastName', value)} required />
              <Field span={4} label="First Name" value={formRow.firstName} onChange={(value) => updateField('firstName', value)} required />
              <Field span={4} label="Middle Name" value={formRow.middleName} onChange={(value) => updateField('middleName', value)} />
              <RadioField span={3} label="Sex" options={['Male', 'Female']} value={formRow.sex} onChange={(value) => updateField('sex', value)} required />
              <Field span={3} label="Date of Birth" type="date" value={formRow.birthdate} onChange={(value) => updateField('birthdate', value)} required />
              <Field span={6} label="Place of Birth" value={formRow.placeOfBirth} onChange={(value) => updateField('placeOfBirth', value)} />
              <Field span={3} label="Status" value={formRow.civilStatus} onChange={(value) => updateField('civilStatus', value)} />
              <Field span={3} label="Citizenship" value={formRow.citizenship} onChange={(value) => updateField('citizenship', value)} />
              <Field span={3} label="Contact Number" value={formRow.contactNumber} onChange={(value) => updateField('contactNumber', value)} required />
              <Field span={3} label="Email Address" type="email" value={formRow.email} onChange={(value) => updateField('email', value)} />
              <Field span={6} label="Social Media Account (Facebook / Instagram / X / etc.)" value={formRow.socialMediaAccount} onChange={(value) => updateField('socialMediaAccount', value)} />
              <Field span={3} label="GSIS Beneficiary" value={formRow.gsisBeneficiary} onChange={(value) => updateField('gsisBeneficiary', value)} />
              <Field span={3} label="Relationship" value={formRow.gsisRelationship} onChange={(value) => updateField('gsisRelationship', value)} />
              <Field span={6} label="Present Address" value={formRow.presentAddress} onChange={(value) => updateField('presentAddress', value)} />
              <Field span={6} label="Permanent Address" value={formRow.permanentAddress} onChange={(value) => updateField('permanentAddress', value)} />
              <RadioField span={12} label="Applicant's Category" options={['Student', 'ALS Student', 'Out of School Youth']} value={formRow.applicantCategory} onChange={(value) => updateField('applicantCategory', value)} required />
            </FormSection>
            <FormSection title="Education">
              {formRow.education.map((item, index) => (
                <Box className="sagut-span-12" key={item.level}>
                  <Typography sx={{ fontWeight: 600, mb: 1 }} variant="body2">{item.level}</Typography>
                  <Box className="sagut-form-grid">
                    <Field span={5} label="Name of School" value={item.schoolName} onChange={(value) => updateItem('education', index, 'schoolName', value)} />
                    <Field span={3} label="Course" value={item.course} onChange={(value) => updateItem('education', index, 'course', value)} />
                    <Field span={2} label="Year Level" value={item.yearLevel} onChange={(value) => updateItem('education', index, 'yearLevel', value)} />
                    <Field span={2} label="Date of Attendance" value={item.dateOfAttendance} onChange={(value) => updateItem('education', index, 'dateOfAttendance', value)} />
                  </Box>
                </Box>
              ))}
            </FormSection>
            <FormSection title="Parents">
              <Field span={5} label="Father's Name" value={formRow.fatherName} onChange={(value) => updateField('fatherName', value)} />
              <Field span={3} label="Contact No." value={formRow.fatherContactNo} onChange={(value) => updateField('fatherContactNo', value)} />
              <Field span={4} label="Occupation" value={formRow.fatherOccupation} onChange={(value) => updateField('fatherOccupation', value)} />
              <Field span={5} label="Mother's Name" value={formRow.motherName} onChange={(value) => updateField('motherName', value)} />
              <Field span={3} label="Contact No." value={formRow.motherContactNo} onChange={(value) => updateField('motherContactNo', value)} />
              <Field span={4} label="Occupation" value={formRow.motherOccupation} onChange={(value) => updateField('motherOccupation', value)} />
            </FormSection>
            <FormSection title="Current Status of Parents">
              <CheckFields fields={parentStatusFields} row={formRow} updateField={updateField} />
            </FormSection>
            <FormSection title="Special Skills">
              <Field span={12} multiline label="Special Skills" value={formRow.specialSkills} onChange={(value) => updateField('specialSkills', value)} />
            </FormSection>
            <FormSection title="History of SPES Availment & Name of Establishment">
              {formRow.availmentHistory.map((item, index) => (
                <Box className="sagut-span-12" key={item.availmentNo}>
                  <Typography sx={{ fontWeight: 600, mb: 1 }} variant="body2">{ordinals[index]} Availment</Typography>
                  <Box className="sagut-form-grid">
                    <Field span={6} label="Name of Establishment" value={item.establishmentName} onChange={(value) => updateItem('availmentHistory', index, 'establishmentName', value)} />
                    <Field span={3} label="Year" value={item.yearAvailed} onChange={(value) => updateItem('availmentHistory', index, 'yearAvailed', value)} />
                    <Field span={3} label="SPES ID No. (if applicable)" value={item.spesIdNo} onChange={(value) => updateItem('availmentHistory', index, 'spesIdNo', value)} />
                  </Box>
                </Box>
              ))}
            </FormSection>
            <FormSection title="Other Related Information">
              <Field span={12} multiline label="Other related information/requests/interventions from DOLE" value={formRow.otherDoleInterventions} onChange={(value) => updateField('otherDoleInterventions', value)} />
            </FormSection>
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

function DetailView({ row }) {
  return (
    <>
      <DetailSection title="Student / Applicant's Information"><DetailFields row={row} keys={['lastName', 'firstName', 'middleName', 'sex', 'birthdate', 'placeOfBirth', 'civilStatus', 'citizenship', 'contactNumber', 'email', 'socialMediaAccount', 'gsisBeneficiary', 'gsisRelationship', 'presentAddress', 'permanentAddress', 'applicantCategory']} /></DetailSection>
      <DetailSection title="Education">
        <ItemDetails items={row.education} fields={[['level', 'Level'], ['schoolName', 'Name of School'], ['course', 'Course'], ['yearLevel', 'Year Level'], ['dateOfAttendance', 'Date of Attendance']]} />
      </DetailSection>
      <DetailSection title="Parents"><DetailFields row={row} keys={['fatherName', 'fatherContactNo', 'fatherOccupation', 'motherName', 'motherContactNo', 'motherOccupation']} /></DetailSection>
      <DetailSection title="Current Status of Parents"><ChipList row={row} fields={parentStatusFields} /></DetailSection>
      <DetailSection title="Special Skills"><DetailFields row={row} keys={['specialSkills']} /></DetailSection>
      <DetailSection title="History of SPES Availment">
        <ItemDetails items={row.availmentHistory.map((item) => ({ ...item, availment: `${ordinals[Number(item.availmentNo) - 1] || item.availmentNo} Availment` }))} fields={[['availment', 'Availment'], ['establishmentName', 'Name of Establishment'], ['yearAvailed', 'Year'], ['spesIdNo', 'SPES ID No.']]} />
      </DetailSection>
      <DetailSection title="Other Related Information"><DetailFields row={row} keys={['otherDoleInterventions']} /></DetailSection>
    </>
  )
}

function FormSection({ title, children }) {
  return <Box className="gip-form-section"><Typography className="gip-form-section-heading" component="h2" variant="subtitle1">{title}</Typography><Box className="sagut-form-grid">{children}</Box></Box>
}

function Field({ label, value, onChange, type = 'text', required = false, span = 4, adornment, multiline = false }) {
  const isNumber = type === 'number'
  return (
    <TextField
      fullWidth
      className={`sagut-span-${span}`}
      label={label}
      minRows={multiline ? 2 : undefined}
      multiline={multiline}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      slotProps={{
        inputLabel: type === 'date' || adornment ? { shrink: true } : undefined,
        input: adornment ? { startAdornment: <InputAdornment position="start">{adornment}</InputAdornment> } : undefined,
        htmlInput: isNumber ? { min: 0, step: 'any', inputMode: 'decimal' } : undefined,
      }}
      type={type}
      value={value ?? ''}
    />
  )
}

function RadioField({ label, value, onChange, options, required = false, span = 4 }) {
  return (
    <FormControl className={`sagut-span-${span}`} required={required}>
      <FormLabel>{label}</FormLabel>
      <RadioGroup row value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <FormControlLabel control={<Radio />} key={option} label={option} value={option} />)}
      </RadioGroup>
    </FormControl>
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

function ItemDetails({ items, fields }) {
  if (!items?.length) return <Typography color="text.secondary" variant="body2">None added</Typography>
  return (
    <>
      {items.map((item, index) => (
        <Box className="sagut-detail-grid" key={index} sx={{ mb: 1.5 }}>
          {fields.map(([key, label]) => <Box key={key}><Typography variant="caption">{label}</Typography><Typography>{item[key] || '—'}</Typography></Box>)}
        </Box>
      ))}
    </>
  )
}

export default Spes
