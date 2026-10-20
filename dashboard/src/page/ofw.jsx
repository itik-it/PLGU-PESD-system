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

const rowsPerPage = 10
const applicantsPath = '/ofw/applicants'
const today = new Date().toISOString().slice(0, 10)

const ofwStatusOptions = [
  'For Good na OFW',
  'Naka-bakasyon / Kasalukuyang nagtatrabaho abroad / May balak pang mag-abroad',
]
const sexOptions = ['Male', 'Female']
const civilStatusOptions = ['Single', 'Married', 'Widowed', 'Separated']
const yesNoOptions = ['Yes', 'No']
const workNatureOptions = ['Land-based', 'Sea-based']
const clienteleOptions = ['PWD', '4Ps Member', 'Pregnant', 'Solo Parent', 'Elderly', 'FHONA (Family Head)', 'Not Applicable']
const relationshipOptions = ['Parent', 'Spouse', 'Child', 'Sibling', 'Others']
const employmentStatusOptions = ['Laid Off', 'Temporary Displaced', 'Currently Employed Overseas', 'End of Contract', 'On Vacation']
const repatriationOptions = ['Philippine Government', 'Recruitment Agency', 'Own Expenses', 'Employer', 'Not Applicable']

const columns = [
  { key: 'ofwStatus'},
  { key: 'lastName', label: 'Surname' },
  { key: 'firstName', label: 'Given Name' },
  { key: 'nameExtension', label: 'Suffix' },
  { key: 'middleName', label: 'Middle Name' },
  { key: 'barangay', label: 'Barangay' },
  { key: 'municipality', label: 'Municipality' },
  { key: 'passportNumber', label: 'Passport / Travel Document / Certificate of Identity No.' },
  { key: 'owwaMember', label: 'OWWA Member' },
  { key: 'birthdate', label: 'Birthdate' },
  { key: 'age', label: 'Age' },
  { key: 'sex', label: 'Sex' },
  { key: 'ethnicity', label: 'Ethnicity' },
  { key: 'religion', label: 'Religion' },
  { key: 'civilStatus', label: 'Civil Status' },
  { key: 'childrenCount', label: 'Number of Children' },
  { key: 'educationalAttainment', label: 'Highest Educational Attainment' },
  { key: 'cellphoneNumber', label: 'Cellphone Number' },
  { key: 'email', label: 'Email Address' },
  { key: 'facebook', label: 'Facebook Account' },
  { key: 'workNature', label: 'Nature of Work' },
  { key: 'occupation', label: 'Occupation / Actual Work Abroad' },
  { key: 'monthlyIncome', label: 'Monthly Income' },
  { key: 'countryOfWork', label: 'Country of Work / Flag of Vessel' },
  { key: 'employerName', label: 'Name of Employer / Company Abroad' },
  { key: 'employerAddress', label: 'Address of Company / Employer' },
  { key: 'foreignAgencyName', label: 'Name of Foreign Recruitment Agency' },
  { key: 'foreignAgencyAddress', label: 'Address of Foreign Recruitment Agency' },
  { key: 'localAgency', label: 'Recruitment / Manning Agency in the Philippines' },
  { key: 'clienteleCategory', label: 'Clientele Category' },
  { key: 'preexistingHealthCondition', label: 'Pre-Existing Health Conditions' },
  { key: 'emergencyContactName', label: 'Emergency Contact Person' },
  { key: 'emergencyContactNumber', label: 'Emergency Contact Number' },
  { key: 'emergencyRelationship', label: 'Relationship to Contact Person' },
  { key: 'emergencyRelationshipOther', label: 'Relationship (Others)' },
  { key: 'employmentStatus', label: 'Current Employment Status' },
  { key: 'yearsAbroad', label: 'Years/Months Working Abroad' },
  { key: 'arrivalDate', label: 'Date of Arrival in the Philippines' },
  { key: 'repatriationNature', label: 'Nature of Repatriation' },
]

// The table only shows the key columns; everything else is in the detail window.
const tableKeys = [
  'lastName', 'firstName', 'middleName', 'municipality', 'barangay', 'cellphoneNumber', 'countryOfWork', 'employmentStatus',
]
const hideOnNarrow = new Set(['middleName', 'barangay', 'cellphoneNumber', 'countryOfWork'])
const tableColumns = tableKeys.map((key) => columns.find((column) => column.key === key))
const labelOf = Object.fromEntries(columns.map((column) => [column.key, column.label]))

const dateKeys = new Set(['birthdate', 'arrivalDate'])
const listKeys = new Set(['clienteleCategory'])

// "Surname, First Middle Suffix"
const fullName = (row) => {
  const given = [row.firstName, row.middleName, row.nameExtension].filter(Boolean).join(' ')
  return [row.lastName, given].filter(Boolean).join(', ')
}

// Checkbox groups are saved as a comma-separated string (e.g. "PWD,Elderly").
const toList = (value) => (value ? String(value).split(',').map((item) => item.trim()).filter(Boolean) : [])
const toggleListValue = (current, option, checked, exclusive) => {
  let list = toList(current)
  if (checked) list = option === exclusive ? [option] : [...list.filter((item) => item !== exclusive), option]
  else list = list.filter((item) => item !== option)
  return list.join(',')
}

const computeAge = (birthdate) => {
  if (!birthdate) return ''
  const born = new Date(`${birthdate}T00:00:00`)
  if (Number.isNaN(born.getTime())) return ''
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age -= 1
  return age >= 0 ? String(age) : ''
}

const emptyRow = () => columns.reduce((row, column) => {
  row[column.key] = ''
  return row
}, { id: null })

const fromApi = (row) => ({ ...emptyRow(), ...row, id: row.id })
const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}
const formatIncome = (value) => {
  if (value === '' || value === null || value === undefined) return '—'
  return `Php ${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
const display = (row, key) => {
  if (dateKeys.has(key)) return formatDate(row[key])
  if (key === 'monthlyIncome') return formatIncome(row[key])
  if (listKeys.has(key)) return toList(row[key]).join(', ') || '—'
  return row[key] === '' || row[key] === null || row[key] === undefined ? '—' : row[key]
}

function Ofw() {
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
    api.get(applicantsPath).then((data) => setRows(data.map(fromApi))).catch((loadError) => setError(loadError.message)).finally(() => setLoading(false))
  }, [])

  const filteredRows = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    return query ? rows.filter((row) => columns.some(({ key }) => String(row[key] ?? '').toLowerCase().includes(query))) : rows
  }, [rows, debouncedSearch])
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage))
  const visiblePage = Math.min(page, pageCount - 1)
  const pagedRows = filteredRows.slice(visiblePage * rowsPerPage, (visiblePage + 1) * rowsPerPage)

  const updateField = (key, value) => setFormRow((current) => {
    const next = { ...current, [key]: value }
    if (key === 'birthdate') next.age = computeAge(value)
    return next
  })
  const saveRow = async () => {
    const required = ['ofwStatus', 'lastName', 'firstName', 'barangay', 'municipality']
    if (!formRow || required.some((key) => !String(formRow[key] || '').trim())) {
      setError('Please fill in all required fields.')
      return
    }
    if (formRow.birthdate > today || formRow.arrivalDate > today) {
      setError('Dates cannot be in the future.')
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
            <Button className="gip-home-button" href="/">
            <span aria-hidden="true">←</span>
            Back to Dashboard
          </Button>
          <Box className="gip-eyebrow">PROGRAM TRACKING DATABASE</Box>
          <Typography className="gip-page-title" component="h1" variant="h5">Nueva Vizcaya OFW Welfare Center Registration Form</Typography>
          <Typography className="gip-page-hint" component="p" variant="body2">Manage, search, and review Overseas Filipino Workers (OFW) records.</Typography>
        </Box>
        <Box className="gip-record-count"><strong>{rows.length}</strong><span>OFWs</span></Box>
      </Box>
      <Paper className="gip-table-card" elevation={0}>
        <Box className="gip-table-toolbar">
          <Typography className="gip-section-title" component="h2" variant="h6">OFW List</Typography>
          {error && !formRow && <Typography color="error" role="alert" variant="body2">{error}</Typography>}
          <Box className="gip-toolbar-actions">
            <TextField aria-label="Search OFW records" className="gip-search" onChange={(event) => { setSearch(event.target.value); setPage(0) }} placeholder="Search OFWs..." size="small" value={search} />
            <Button className="gip-add-button" variant="contained" onClick={() => { setError(''); setFormRow(emptyRow()) }}>Add OFW</Button>
          </Box>
        </Box>
        <TableContainer className="gip-table-container sagut-table-container">
          <Table stickyHeader aria-label="OFW records" className="gip-table sagut-table" size="small">
            <TableHead>
              <TableRow>
                {tableColumns.map((column) => <TableCell className={`gip-column-header ${hideOnNarrow.has(column.key) ? 'sagut-hide-narrow' : ''}`} key={column.key}>{column.label}</TableCell>)}
                <TableCell className="gip-column-header gip-actions-header">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? <TableRow><TableCell align="center" colSpan={tableColumns.length + 1}>Loading OFW records...</TableCell></TableRow>
                : pagedRows.length === 0 ? <TableRow><TableCell align="center" colSpan={tableColumns.length + 1}>{search ? 'No OFW records match your search.' : 'No OFW records yet. Add an OFW to begin.'}</TableCell></TableRow>
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
          <Typography variant="body2">{filteredRows.length ? `${visiblePage * rowsPerPage + 1}–${Math.min((visiblePage + 1) * rowsPerPage, filteredRows.length)} of ${filteredRows.length}` : '0 OFWs'}</Typography>
          <Button disabled={visiblePage === 0} onClick={() => setPage((current) => current - 1)}>Previous</Button>
          <Button disabled={visiblePage >= pageCount - 1} onClick={() => setPage((current) => current + 1)}>Next</Button>
        </Box>
      </Paper>

      <Dialog fullWidth maxWidth="lg" onClose={() => setFormRow(null)} open={Boolean(formRow)}>
        <DialogTitle>{formRow?.id === null ? 'Add New OFW' : 'Edit OFW'}</DialogTitle>
        <DialogContent dividers>
          {formRow && <>
            <FormSection title="OFW Status">
              <RadioField span={12} label="Status" options={ofwStatusOptions} value={formRow.ofwStatus} onChange={(value) => updateField('ofwStatus', value)} required />
            </FormSection>
            <FormSection title="Personal Information">
              <Field span={4} label="Surname" value={formRow.lastName} onChange={(value) => updateField('lastName', value)} required />
              <Field span={4} label="Given Name" value={formRow.firstName} onChange={(value) => updateField('firstName', value)} required />
              <Field span={4} label="Middle Name" value={formRow.middleName} onChange={(value) => updateField('middleName', value)} />
              <Field span={4} label="Suffix" value={formRow.nameExtension} onChange={(value) => updateField('nameExtension', value)} />
              <RadioField span={4} label="Sex" options={sexOptions} value={formRow.sex} onChange={(value) => updateField('sex', value)} />
              <Field span={4} label="Birthdate" type="date" value={formRow.birthdate} onChange={(value) => updateField('birthdate', value)} />
              <Field span={4} label="Age" type="number" value={formRow.age} onChange={(value) => updateField('age', value)} />
              <Field span={4} label="Ethnicity" value={formRow.ethnicity} onChange={(value) => updateField('ethnicity', value)} />
              <Field span={4} label="Religion" value={formRow.religion} onChange={(value) => updateField('religion', value)} />
              <RadioField span={12} label="Civil Status" options={civilStatusOptions} value={formRow.civilStatus} onChange={(value) => updateField('civilStatus', value)} />
              <Field span={6} label="Number of Children" type="number" value={formRow.childrenCount} onChange={(value) => updateField('childrenCount', value)} />
              <Field span={6} label="Highest Educational Attainment" value={formRow.educationalAttainment} onChange={(value) => updateField('educationalAttainment', value)} />
            </FormSection>
            <FormSection title="Permanent Address in the Philippines">
              <Field span={6} label="Barangay" value={formRow.barangay} onChange={(value) => updateField('barangay', value)} required />
              <Field span={6} label="Municipality" value={formRow.municipality} onChange={(value) => updateField('municipality', value)} required />
              <Field span={6} label="Passport / Travel Document / Certificate of Identity No." value={formRow.passportNumber} onChange={(value) => updateField('passportNumber', value)} />
              <RadioField span={6} label="OWWA Member" options={yesNoOptions} value={formRow.owwaMember} onChange={(value) => updateField('owwaMember', value)} />
            </FormSection>
            <FormSection title="Contact">
              <Field span={4} label="Cellphone Number" value={formRow.cellphoneNumber} onChange={(value) => updateField('cellphoneNumber', value)} />
              <Field span={4} label="Email Address" type="email" value={formRow.email} onChange={(value) => updateField('email', value)} />
              <Field span={4} label="Facebook Account" value={formRow.facebook} onChange={(value) => updateField('facebook', value)} />
            </FormSection>
            <FormSection title="Work Abroad">
              <RadioField span={6} label="Nature of Work" options={workNatureOptions} value={formRow.workNature} onChange={(value) => updateField('workNature', value)} />
              <Field span={6} label="Occupation / Actual Work Abroad" value={formRow.occupation} onChange={(value) => updateField('occupation', value)} />
              <Field span={6} label="Monthly Income" type="number" adornment="Php" value={formRow.monthlyIncome} onChange={(value) => updateField('monthlyIncome', value)} />
              <Field span={6} label="Country of Work / Flag of Vessel" value={formRow.countryOfWork} onChange={(value) => updateField('countryOfWork', value)} />
              <Field span={6} label="Name of Employer / Company Abroad" value={formRow.employerName} onChange={(value) => updateField('employerName', value)} />
              <Field span={6} label="Address of Company / Employer" value={formRow.employerAddress} onChange={(value) => updateField('employerAddress', value)} />
              <Field span={6} label="Name of Foreign Recruitment Agency" value={formRow.foreignAgencyName} onChange={(value) => updateField('foreignAgencyName', value)} />
              <Field span={6} label="Address of Foreign Recruitment Agency" value={formRow.foreignAgencyAddress} onChange={(value) => updateField('foreignAgencyAddress', value)} />
              <Field span={12} label="Recruitment / Manning Agency in the Philippines" value={formRow.localAgency} onChange={(value) => updateField('localAgency', value)} />
            </FormSection>
            <FormSection title="Clientele Category and Health">
              <CheckGroup span={12} label="(check all that apply)" options={clienteleOptions} exclusive="Not Applicable" value={formRow.clienteleCategory} onChange={(value) => updateField('clienteleCategory', value)} />
              <Field span={12} label="Pre-Existing Health Conditions" value={formRow.preexistingHealthCondition} onChange={(value) => updateField('preexistingHealthCondition', value)} />
            </FormSection>
            <FormSection title="Emergency Contact">
              <Field span={6} label="Emergency Contact Person" value={formRow.emergencyContactName} onChange={(value) => updateField('emergencyContactName', value)} />
              <Field span={6} label="Contact Number" value={formRow.emergencyContactNumber} onChange={(value) => updateField('emergencyContactNumber', value)} />
              <RadioField span={12} label="Relationship to Contact Person" options={relationshipOptions} value={formRow.emergencyRelationship} onChange={(value) => updateField('emergencyRelationship', value)} />
              {formRow.emergencyRelationship === 'Others' && <Field span={6} label="Relationship (Others)" value={formRow.emergencyRelationshipOther} onChange={(value) => updateField('emergencyRelationshipOther', value)} />}
            </FormSection>
            <FormSection title="Employment and Repatriation">
              <RadioField span={12} label="Current Employment Status" options={employmentStatusOptions} value={formRow.employmentStatus} onChange={(value) => updateField('employmentStatus', value)} />
              <Field span={6} label="Years / Months Working Abroad" type="number" value={formRow.yearsAbroad} onChange={(value) => updateField('yearsAbroad', value)} />
              <Field span={6} label="Date of Arrival in the Philippines" type="date" value={formRow.arrivalDate} onChange={(value) => updateField('arrivalDate', value)} />
              <RadioField span={12} label="Nature of Repatriation" options={repatriationOptions} value={formRow.repatriationNature} onChange={(value) => updateField('repatriationNature', value)} />
            </FormSection>
          </>}
        </DialogContent>
        <DialogActions>{error && <Typography color="error" role="alert" sx={{ mr: 'auto', pl: 1 }} variant="body2">{error}</Typography>}<Button onClick={() => { setError(''); setFormRow(null) }}>Cancel</Button><Button disabled={saving} onClick={saveRow} variant="contained">{saving ? 'Saving...' : 'Save OFW'}</Button></DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="md" onClose={() => setSelectedRow(null)} open={Boolean(selectedRow)}>
        <DialogTitle>{selectedRow && fullName(selectedRow)}</DialogTitle>
        <DialogContent dividers>{selectedRow && <DetailView row={selectedRow} />}</DialogContent>
        <DialogActions>
          <Button onClick={() => { setError(''); setFormRow({ ...selectedRow }); setSelectedRow(null) }}>Edit</Button>
          <Button onClick={() => setSelectedRow(null)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog onClose={() => setDeleteTarget(null)} open={Boolean(deleteTarget)}><DialogTitle>Delete OFW record?</DialogTitle><DialogContent>This will permanently remove {deleteTarget && fullName(deleteTarget)}.</DialogContent><DialogActions><Button onClick={() => setDeleteTarget(null)}>Cancel</Button><Button color="error" onClick={deleteRow}>Delete</Button></DialogActions></Dialog>
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
        htmlInput: isNumber ? { min: 0, step: 'any', inputMode: 'decimal' } : undefined,
      }}
      type={type}
      value={value ?? ''}
    />
  )
}
function RadioField({ label, options, value, onChange, span = 4, required = false }) {
  return (
    <FormControl className={`sagut-span-${span}`} required={required}>
      <FormLabel>{label}</FormLabel>
      <RadioGroup row value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <FormControlLabel control={<Radio />} key={option} label={option} value={option} />)}
      </RadioGroup>
    </FormControl>
  )
}
function CheckGroup({ label, options, value, onChange, exclusive, span = 12 }) {
  const selected = toList(value)
  return (
    <FormControl className={`sagut-span-${span}`}>
      <FormLabel>{label}</FormLabel>
      <Box className="sagut-check-list">
        {options.map((option) => (
          <FormControlLabel
            control={<Checkbox checked={selected.includes(option)} onChange={(event) => onChange(toggleListValue(value, option, event.target.checked, exclusive))} />}
            key={option}
            label={option}
          />
        ))}
      </Box>
    </FormControl>
  )
}
function DetailSection({ title, children }) {
  return <Box className="sagut-detail-section"><Typography className="gip-form-section-heading" component="h3" variant="subtitle1">{title}</Typography>{children}</Box>
}
function DetailFields({ row, keys }) {
  return <Box className="sagut-detail-grid">{keys.map((key) => <Box key={key}><Typography variant="caption">{labelOf[key]}</Typography><Typography>{display(row, key)}</Typography></Box>)}</Box>
}
function ChipList({ value }) {
  const items = toList(value)
  return items.length
    ? <Box className="sagut-option-list">{items.map((item) => <Chip key={item} label={item} />)}</Box>
    : <Typography color="text.secondary" variant="body2">None selected</Typography>
}
function DetailView({ row }) {
  return (
    <>
      <DetailSection title="OFW Status"><DetailFields row={row} keys={['ofwStatus']} /></DetailSection>
      <DetailSection title="Personal Information"><DetailFields row={row} keys={['lastName', 'firstName', 'middleName', 'nameExtension', 'sex', 'birthdate', 'age', 'ethnicity', 'religion', 'civilStatus', 'childrenCount', 'educationalAttainment']} /></DetailSection>
      <DetailSection title="Permanent Address in the Philippines"><DetailFields row={row} keys={['barangay', 'municipality', 'passportNumber', 'owwaMember']} /></DetailSection>
      <DetailSection title="Contact"><DetailFields row={row} keys={['cellphoneNumber', 'email', 'facebook']} /></DetailSection>
      <DetailSection title="Work Abroad"><DetailFields row={row} keys={['workNature', 'occupation', 'monthlyIncome', 'countryOfWork', 'employerName', 'employerAddress', 'foreignAgencyName', 'foreignAgencyAddress', 'localAgency']} /></DetailSection>
      <DetailSection title="Clientele Category and Health">
        <ChipList value={row.clienteleCategory} />
        <DetailFields row={row} keys={['preexistingHealthCondition']} />
      </DetailSection>
      <DetailSection title="Emergency Contact"><DetailFields row={row} keys={['emergencyContactName', 'emergencyContactNumber', 'emergencyRelationship', ...(row.emergencyRelationship === 'Others' ? ['emergencyRelationshipOther'] : [])]} /></DetailSection>
      <DetailSection title="Employment and Repatriation"><DetailFields row={row} keys={['employmentStatus', 'yearsAbroad', 'arrivalDate', 'repatriationNature']} /></DetailSection>
    </>
  )
}

export default Ofw
