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
import { useDebounce } from '../utils/useDebounce.js'
import BatchList from '../components/BatchList.jsx'


const disabilityFields = [
  ['disabilityVisual', 'Visual'], ['disabilitySpeech', 'Speech'], ['disabilityHearing', 'Hearing'],
  ['disabilityPhysical', 'Physical'], ['disabilityOthers', 'Others'],
]
const civilStatusOptions = ['Single', 'Married', 'Widowed', 'Separated', 'Live-in']
const employmentOptions = [
  ['Wage Employed', 'Employed · Wage Employed'],
  ['Self Employed', 'Employed · Self Employed'],
  ['New Entrant/Fresh Graduate', 'Unemployed · New Entrant/Fresh Graduate'],
  ['Finished Contract', 'Unemployed · Finished Contract'],
  ['Resigned', 'Unemployed · Resigned'],
  ['Retired', 'Unemployed · Retired'],
  ['Terminated/Laid-off (Local)', 'Unemployed · Terminated/Laid-off (Local)'],
  ['Terminated/Laid-off (Abroad)', 'Unemployed · Terminated/Laid-off (Abroad)'],
  ['Others', 'Unemployed · Others'],
]

const columns = [
  { key: 'lastName', label: 'Surname', group: 'Personal Information' },
  { key: 'firstName', label: 'First Name', group: 'Personal Information' },
  { key: 'middleName', label: 'Middle Name', group: 'Personal Information' },
  { key: 'suffix', label: 'Suffix', group: 'Personal Information' },
  { key: 'birthdate', label: 'Date of Birth', group: 'Personal Information' },
  { key: 'sex', label: 'Sex', group: 'Personal Information' },
  { key: 'placeOfBirth', label: 'Place of Birth', group: 'Personal Information' },
  { key: 'religion', label: 'Religion', group: 'Personal Information' },
  { key: 'civilStatus', label: 'Civil Status', group: 'Personal Information' },
  { key: 'height', label: 'Height', group: 'Personal Information' },
  { key: 'houseNoStreet', label: 'House No./Street', group: 'Present Address' },
  { key: 'barangay', label: 'Barangay', group: 'Present Address' },
  { key: 'municipalityCity', label: 'Municipality/City', group: 'Present Address' },
  { key: 'province', label: 'Province', group: 'Present Address' },
  { key: 'tin', label: 'TIN', group: 'Government IDs' },
  { key: 'gsisSssIdNo', label: 'GSIS/SSS ID No.', group: 'Government IDs' },
  { key: 'pagibigNo', label: 'PAG-IBIG No.', group: 'Government IDs' },
  { key: 'philhealthNo', label: 'PhilHealth No.', group: 'Government IDs' },
  { key: 'email', label: 'Email Address', group: 'Contact' },
  { key: 'landlineNumber', label: 'Landline Number', group: 'Contact' },
  { key: 'cellphoneNumber', label: 'Cellphone Number', group: 'Contact' },
  ...disabilityFields.map(([key, label]) => ({ key, label, group: 'Disability' })),
  { key: 'disabilityOthersSpecify', label: 'Others, specify', group: 'Disability' },
  { key: 'employmentStatus', label: 'Employment Status / Type', group: 'Employment' },
  { key: 'laidoffAbroadCountry', label: 'Country (Laid-off Abroad)', group: 'Employment' },
  { key: 'employmentOthersSpecify', label: 'Others, specify', group: 'Employment' },
]

// The table only shows the key columns; everything else is in the detail window.
const tableKeys = ['lastName', 'firstName', 'middleName', 'cellphoneNumber', 'barangay', 'municipalityCity', 'employmentStatus']
const hideOnNarrow = new Set(['middleName', 'cellphoneNumber', 'barangay'])
const checkKeys = new Set(disabilityFields.map(([key]) => key))
const yesNoKeys = new Set()
const dateKeys = new Set(['birthdate'])
const requiredKeys = ['lastName', 'firstName', 'birthdate', 'sex', 'barangay', 'municipalityCity']
const futureDateKeys = ['birthdate']
const nameKey = 'lastName'
const newRowDefaults = {}
const normalize = (row) => row
const customDisplay = () => undefined
const prepare = (row) => ({
  ...row,
  disabilityOthersSpecify: row.disabilityOthers ? row.disabilityOthersSpecify : '',
  laidoffAbroadCountry: row.employmentStatus === 'Terminated/Laid-off (Abroad)' ? row.laidoffAbroadCountry : '',
  employmentOthersSpecify: row.employmentStatus === 'Others' ? row.employmentOthersSpecify : '',
})

// "Surname, First Middle"
const fullName = (row) => {
  const given = [row.firstName, row.middleName, row.suffix].filter(Boolean).join(' ')
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
function JobseekerForm({ batch, onBack }) {
  const basePath = `/jobseeker/batches/${batch.id}/applicants`
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
    const query = debouncedSearch.trim()
    api.get(`${basePath}${query ? `?search=${encodeURIComponent(query)}` : ''}`)
      .then((data) => setRows(data.map(fromApi)))
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false))
  }, [debouncedSearch])

  const filteredRows = useMemo(() => {
    return rows
  }, [rows])
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage))
  const visiblePage = Math.min(page, pageCount - 1)
  const pagedRows = filteredRows.slice(visiblePage * rowsPerPage, (visiblePage + 1) * rowsPerPage)

  const updateField = (key, value) => setFormRow((current) => ({ ...current, [key]: value }))
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
            <Button className="gip-home-button" onClick={onBack}>
            <span aria-hidden="true">←</span>
            Back to Dashboard
          </Button>
          <Box className="gip-eyebrow">PROGRAM TRACKING DATABASE</Box>
          <Typography className="gip-page-title" component="h1" variant="h5">Job Seeker</Typography>
          <Typography className="gip-page-hint" component="p" variant="body2">Manage, search, and review PESO Employment Information System registrants.</Typography>
        </Box>
        <Box className="gip-record-count"><strong>{rows.length}</strong><span>job seekers</span></Box>
      </Box>
      <Paper className="gip-table-card" elevation={0}>
        <Box className="gip-table-toolbar">
          <Typography className="gip-section-title" component="h2" variant="h6">Job Seeker List</Typography>
          {error && !formRow && <Typography color="error" role="alert" variant="body2">{error}</Typography>}
          <Box className="gip-toolbar-actions">
            <TextField aria-label="Search job seekers" className="gip-search" onChange={(event) => { setSearch(event.target.value); setPage(0) }} placeholder="Search job seekers..." size="small" value={search} />
            <Button className="gip-add-button" variant="contained" onClick={() => { setError(''); setFormRow(emptyRow()) }}>Add Job Seeker</Button>
          </Box>
        </Box>
        <TableContainer className="gip-table-container sagut-table-container">
          <Table stickyHeader aria-label="Job Seeker job seekers" className="gip-table sagut-table" size="small">
            <TableHead>
              <TableRow>
                {tableColumns.map((column) => <TableCell className={`gip-column-header ${hideOnNarrow.has(column.key) ? 'sagut-hide-narrow' : ''}`} key={column.key}>{column.label}</TableCell>)}
                <TableCell className="gip-column-header gip-actions-header">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? <TableRow><TableCell align="center" colSpan={tableColumns.length + 1}>Loading job seekers...</TableCell></TableRow>
                : pagedRows.length === 0 ? <TableRow><TableCell align="center" colSpan={tableColumns.length + 1}>{search ? 'No job seekers match your search.' : 'No job seekers yet. Add a job seeker to begin.'}</TableCell></TableRow>
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
          <Typography variant="body2">{filteredRows.length ? `${visiblePage * rowsPerPage + 1}–${Math.min((visiblePage + 1) * rowsPerPage, filteredRows.length)} of ${filteredRows.length}` : '0 job seekers'}</Typography>
          <Button disabled={visiblePage === 0} onClick={() => setPage((current) => current - 1)}>Previous</Button>
          <Button disabled={visiblePage >= pageCount - 1} onClick={() => setPage((current) => current + 1)}>Next</Button>
        </Box>
      </Paper>

      <Dialog fullWidth maxWidth="lg" onClose={() => setFormRow(null)} open={Boolean(formRow)}>
        <DialogTitle>{formRow?.id === null ? 'Add New Job Seeker' : 'Edit Job Seeker'}</DialogTitle>
        <DialogContent dividers>
          {formRow && <>
            <FormSection title="Personal Information">
              <Field span={4} label="Surname" value={formRow.lastName} onChange={(value) => updateField('lastName', value)} required />
              <Field span={3} label="First Name" value={formRow.firstName} onChange={(value) => updateField('firstName', value)} required />
              <Field span={3} label="Middle Name" value={formRow.middleName} onChange={(value) => updateField('middleName', value)} />
              <Field span={2} label="Suffix (Sr., Jr., III)" value={formRow.suffix} onChange={(value) => updateField('suffix', value)} />
              <Field span={3} label="Date of Birth" type="date" value={formRow.birthdate} onChange={(value) => updateField('birthdate', value)} required />
              <RadioField span={3} label="Sex" options={['Male', 'Female']} value={formRow.sex} onChange={(value) => updateField('sex', value)} required />
              <SelectField span={3} label="Civil Status" options={civilStatusOptions} value={formRow.civilStatus} onChange={(value) => updateField('civilStatus', value)} />
              <Field span={3} label="Height" value={formRow.height} onChange={(value) => updateField('height', value)} />
              <Field span={6} label="Place of Birth" value={formRow.placeOfBirth} onChange={(value) => updateField('placeOfBirth', value)} />
              <Field span={6} label="Religion" value={formRow.religion} onChange={(value) => updateField('religion', value)} />
            </FormSection>
            <FormSection title="Present Address">
              <Field span={6} label="House No./Street" value={formRow.houseNoStreet} onChange={(value) => updateField('houseNoStreet', value)} />
              <Field span={4} label="Barangay" value={formRow.barangay} onChange={(value) => updateField('barangay', value)} required />
              <Field span={4} label="Municipality/City" value={formRow.municipalityCity} onChange={(value) => updateField('municipalityCity', value)} required />
              <Field span={4} label="Province" value={formRow.province} onChange={(value) => updateField('province', value)} />
            </FormSection>
            <FormSection title="Government IDs">
              <Field span={3} label="TIN" value={formRow.tin} onChange={(value) => updateField('tin', value)} />
              <Field span={3} label="GSIS/SSS ID No." value={formRow.gsisSssIdNo} onChange={(value) => updateField('gsisSssIdNo', value)} />
              <Field span={3} label="PAG-IBIG No." value={formRow.pagibigNo} onChange={(value) => updateField('pagibigNo', value)} />
              <Field span={3} label="PhilHealth No." value={formRow.philhealthNo} onChange={(value) => updateField('philhealthNo', value)} />
            </FormSection>
            <FormSection title="Contact">
              <Field span={4} label="Email Address" type="email" value={formRow.email} onChange={(value) => updateField('email', value)} />
              <Field span={4} label="Landline Number" value={formRow.landlineNumber} onChange={(value) => updateField('landlineNumber', value)} />
              <Field span={4} label="Cellphone Number" value={formRow.cellphoneNumber} onChange={(value) => updateField('cellphoneNumber', value)} />
            </FormSection>
            <FormSection title="Disability">
              <CheckFields fields={disabilityFields} row={formRow} updateField={updateField} />
              {formRow.disabilityOthers && <Field span={6} label="Others, specify" value={formRow.disabilityOthersSpecify} onChange={(value) => updateField('disabilityOthersSpecify', value)} />}
            </FormSection>
            <FormSection title="Employment Status / Type">
              <SelectField span={6} label="Employment Status / Type" options={employmentOptions} value={formRow.employmentStatus} onChange={(value) => updateField('employmentStatus', value)} />
              {formRow.employmentStatus === 'Terminated/Laid-off (Abroad)' && <Field span={6} label="Specify country" value={formRow.laidoffAbroadCountry} onChange={(value) => updateField('laidoffAbroadCountry', value)} />}
              {formRow.employmentStatus === 'Others' && <Field span={6} label="Others, specify" value={formRow.employmentOthersSpecify} onChange={(value) => updateField('employmentOthersSpecify', value)} />}
            </FormSection>
          </>}
        </DialogContent>
        <DialogActions>{error && <Typography color="error" role="alert" sx={{ mr: 'auto', pl: 1 }} variant="body2">{error}</Typography>}<Button onClick={() => { setError(''); setFormRow(null) }}>Cancel</Button><Button disabled={saving} onClick={saveRow} variant="contained">{saving ? 'Saving...' : 'Save Job Seeker'}</Button></DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="md" onClose={() => setSelectedRow(null)} open={Boolean(selectedRow)}>
        <DialogTitle>{selectedRow && fullName(selectedRow)}</DialogTitle>
        <DialogContent dividers>{selectedRow && <DetailView row={selectedRow} />}</DialogContent>
        <DialogActions>
          <Button onClick={() => { setError(''); setFormRow({ ...selectedRow }); setSelectedRow(null) }}>Edit</Button>
          <Button onClick={() => setSelectedRow(null)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog onClose={() => setDeleteTarget(null)} open={Boolean(deleteTarget)}><DialogTitle>Delete job seeker?</DialogTitle><DialogContent>This will permanently remove {deleteTarget && fullName(deleteTarget)}.</DialogContent><DialogActions><Button onClick={() => setDeleteTarget(null)}>Cancel</Button><Button color="error" onClick={deleteRow}>Delete</Button></DialogActions></Dialog>
    </main>
  )
}

function DetailView({ row }) {
  return (
    <>
      <DetailSection title="Personal Information"><DetailFields row={row} keys={['lastName', 'firstName', 'middleName', 'suffix', 'birthdate', 'sex', 'civilStatus', 'height', 'placeOfBirth', 'religion']} /></DetailSection>
      <DetailSection title="Present Address"><DetailFields row={row} keys={['houseNoStreet', 'barangay', 'municipalityCity', 'province']} /></DetailSection>
      <DetailSection title="Government IDs"><DetailFields row={row} keys={['tin', 'gsisSssIdNo', 'pagibigNo', 'philhealthNo']} /></DetailSection>
      <DetailSection title="Contact"><DetailFields row={row} keys={['email', 'landlineNumber', 'cellphoneNumber']} /></DetailSection>
      <DetailSection title="Disability">
        <ChipList row={row} fields={disabilityFields} />
        {row.disabilityOthers && row.disabilityOthersSpecify && <DetailFields row={row} keys={['disabilityOthersSpecify']} />}
      </DetailSection>
      <DetailSection title="Employment Status / Type">
        <DetailFields row={row} keys={['employmentStatus', ...(row.laidoffAbroadCountry ? ['laidoffAbroadCountry'] : []), ...(row.employmentOthersSpecify ? ['employmentOthersSpecify'] : [])]} />
      </DetailSection>
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

function SelectField({ label, value, onChange, options, required = false, span = 4 }) {
  return (
    <TextField fullWidth select className={`sagut-span-${span}`} label={label} onChange={(event) => onChange(event.target.value)} required={required} value={value ?? ''}>
      {options.map((option) => {
        const [optionValue, optionLabel] = Array.isArray(option) ? option : [option, option]
        return <MenuItem key={optionValue} value={optionValue}>{optionLabel}</MenuItem>
      })}
    </TextField>
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

export default function Jobseeker() {
  const [batch, setBatch] = useState(null)
  if (!batch) return <BatchList basePath="/jobseeker/batches" noun="job seeker" nounPlural="job seekers" onOpen={setBatch} title="Job Seeker Groups" />
  return <JobseekerForm batch={batch} onBack={() => setBatch(null)} />
}
