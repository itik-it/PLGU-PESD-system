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
const applicantsPath = '/livelihood/applicants'
const today = new Date().toISOString().slice(0, 10)

const projectTypeOptions = ['Individual', 'Group']
const projectComponentOptions = ['Formation', 'Restoration', 'Enhancement']
const implementationModeOptions = ['ACP', 'Direct Admin']
const sexOptions = ['Male', 'Female']
const civilStatusOptions = ['Single', 'Married', 'Widowed', 'Separated', 'Others']
const disabilityOptions = ['None', 'Hearing', 'Speech', 'Visual', 'Physical', 'Others']
const overseasWorkOptions = ['Currently OFW', 'Former OFW', 'Did not work abroad']
const yesNoOptions = ['Yes', 'No']

const columns = [
  { key: 'dateApplied', label: 'Date Applied' },
  { key: 'projectName', label: 'Name/Title of Project' },
  { key: 'projectLocation', label: 'Project Location' },
  { key: 'projectType', label: 'Type of Project' },
  { key: 'projectComponent', label: 'Project Component' },
  { key: 'implementationMode', label: 'Mode of Implementation' },
  { key: 'lastName', label: 'Surname' },
  { key: 'firstName', label: 'Given Name' },
  { key: 'middleName', label: 'Middle Name' },
  { key: 'nameExtension', label: 'Extension Name (Jr, Sr)' },
  { key: 'houseBlockLot', label: 'House/Block/Lot No.' },
  { key: 'street', label: 'Street' },
  { key: 'barangay', label: 'Barangay' },
  { key: 'municipality', label: 'City/Municipality' },
  { key: 'province', label: 'Province' },
  { key: 'sex', label: 'Sex' },
  { key: 'civilStatus', label: 'Civil Status' },
  { key: 'civilStatusOther', label: 'Civil Status (Others)' },
  { key: 'birthdate', label: 'Birthdate' },
  { key: 'birthplace', label: 'Birthplace' },
  { key: 'disability', label: 'Disability' },
  { key: 'disabilityOther', label: 'Disability (Others)' },
  { key: 'contactNumber', label: 'Contact Number' },
  { key: 'beneficiaryType', label: 'Type of Beneficiary' },
  { key: 'overseasWork', label: 'Did you work overseas?' },
  { key: 'tesdaGraduate', label: 'Graduate of TESDA Training Program?' },
  { key: 'tesdaCertificate', label: 'TESDA Certificate Acquired' },
  { key: 'monthlyNetIncome', label: 'Estimated Monthly Net Income' },
  { key: 'childrenCount', label: 'Number of Children Living with the Family' },
  { key: 'is4psBeneficiary', label: "4P's Beneficiary?" },
  { key: 'beneficiaryName', label: 'Name of Beneficiary' },
  { key: 'beneficiaryContactNumber', label: 'Beneficiary Contact Number' },
  { key: 'is4psGraduate', label: "Graduate of 4P's?" },
  { key: 'idType', label: 'Type of ID Presented' },
  { key: 'idNumber', label: 'ID Number' },
  { key: 'hasCertIndigency', label: 'Certificate of Indigency?' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'email', label: 'Email Address' },
]

// The table only shows the key columns; everything else is in the detail window.
const tableKeys = [
  'projectName', 'lastName', 'firstName', 'middleName', 'contactNumber', 'barangay', 'municipality', 'dateApplied',
]
const hideOnNarrow = new Set(['middleName', 'contactNumber', 'barangay', 'dateApplied'])
const tableColumns = tableKeys.map((key) => columns.find((column) => column.key === key))
const labelOf = Object.fromEntries(columns.map((column) => [column.key, column.label]))

const dateKeys = new Set(['dateApplied', 'birthdate'])
const listKeys = new Set(['disability'])

// "Last, First Middle Ext"
const fullName = (row) => {
  const given = [row.firstName, row.middleName, row.nameExtension].filter(Boolean).join(' ')
  return [row.lastName, given].filter(Boolean).join(', ')
}

// Checkbox groups are saved as a comma-separated string (e.g. "Hearing,Visual").
const toList = (value) => (value ? String(value).split(',').map((item) => item.trim()).filter(Boolean) : [])
const toggleListValue = (current, option, checked, exclusive) => {
  let list = toList(current)
  if (checked) list = option === exclusive ? [option] : [...list.filter((item) => item !== exclusive), option]
  else list = list.filter((item) => item !== option)
  return list.join(',')
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
  if (key === 'monthlyNetIncome') return formatIncome(row[key])
  if (listKeys.has(key)) return toList(row[key]).join(', ') || '—'
  return row[key] === '' || row[key] === null || row[key] === undefined ? '—' : row[key]
}

function Livelihood() {
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

  const updateField = (key, value) => setFormRow((current) => ({ ...current, [key]: value }))
  const saveRow = async () => {
    const required = [
      'dateApplied', 'projectName', 'projectType', 'projectComponent', 'implementationMode',
      'lastName', 'firstName', 'barangay', 'municipality', 'sex', 'birthdate',
    ]
    if (!formRow || required.some((key) => !String(formRow[key] || '').trim())) {
      setError('Please fill in all required fields.')
      return
    }
    if (formRow.dateApplied > today || formRow.birthdate > today) {
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
          <Typography className="gip-page-title" component="h1" variant="h5">DOLE Integrated Livelihood Program</Typography>
          <Typography className="gip-page-hint" component="p" variant="body2">Manage, search, and review Livelihood program applicants and beneficiaries.</Typography>
        </Box>
        <Box className="gip-record-count"><strong>{rows.length}</strong><span>applicants</span></Box>
      </Box>
      <Paper className="gip-table-card" elevation={0}>
        <Box className="gip-table-toolbar">
          <Typography className="gip-section-title" component="h2" variant="h6">Applicant List</Typography>
          {error && !formRow && <Typography color="error" role="alert" variant="body2">{error}</Typography>}
          <Box className="gip-toolbar-actions">
            <TextField aria-label="Search Livelihood applicants" className="gip-search" onChange={(event) => { setSearch(event.target.value); setPage(0) }} placeholder="Search applicants..." size="small" value={search} />
            <Button className="gip-add-button" variant="contained" onClick={() => { setError(''); setFormRow(emptyRow()) }}>Add Applicant</Button>
          </Box>
        </Box>
        <TableContainer className="gip-table-container sagut-table-container">
          <Table stickyHeader aria-label="Livelihood applicants" className="gip-table sagut-table" size="small">
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
        <DialogTitle>{formRow?.id === null ? 'Add New Livelihood Applicant' : 'Edit Livelihood Applicant'}</DialogTitle>
        <DialogContent dividers>
          {formRow && <>
            <FormSection title="Project">
              <Field span={6} label="Date Applied" type="date" value={formRow.dateApplied} onChange={(value) => updateField('dateApplied', value)} required />
              <Field span={6} label="Name/Title of Project" value={formRow.projectName} onChange={(value) => updateField('projectName', value)} required />
              <Field span={12} label="Project Location" value={formRow.projectLocation} onChange={(value) => updateField('projectLocation', value)} />
              <RadioField span={4} label="Type of Project" options={projectTypeOptions} value={formRow.projectType} onChange={(value) => updateField('projectType', value)} required />
              <RadioField span={4} label="Project Component" options={projectComponentOptions} value={formRow.projectComponent} onChange={(value) => updateField('projectComponent', value)} required />
              <RadioField span={4} label="Mode of Implementation" options={implementationModeOptions} value={formRow.implementationMode} onChange={(value) => updateField('implementationMode', value)} required />
            </FormSection>
            <FormSection title="Applicant Information">
              <Field span={4} label="Surname" value={formRow.lastName} onChange={(value) => updateField('lastName', value)} required />
              <Field span={4} label="Given Name" value={formRow.firstName} onChange={(value) => updateField('firstName', value)} required />
              <Field span={4} label="Middle Name" value={formRow.middleName} onChange={(value) => updateField('middleName', value)} />
              <Field span={4} label="Extension Name (Jr, Sr)" value={formRow.nameExtension} onChange={(value) => updateField('nameExtension', value)} />
              <RadioField span={4} label="Sex" options={sexOptions} value={formRow.sex} onChange={(value) => updateField('sex', value)} required />
              <Field span={4} label="Birthdate" type="date" value={formRow.birthdate} onChange={(value) => updateField('birthdate', value)} required />
              <Field span={6} label="Birthplace" value={formRow.birthplace} onChange={(value) => updateField('birthplace', value)} />
              <Field span={6} label="Type of Beneficiary" value={formRow.beneficiaryType} onChange={(value) => updateField('beneficiaryType', value)} />
              <Field span={4} label="House/Block/Lot No." value={formRow.houseBlockLot} onChange={(value) => updateField('houseBlockLot', value)} />
              <Field span={4} label="Street" value={formRow.street} onChange={(value) => updateField('street', value)} />
              <Field span={4} label="Barangay" value={formRow.barangay} onChange={(value) => updateField('barangay', value)} required />
              <Field span={6} label="City/Municipality" value={formRow.municipality} onChange={(value) => updateField('municipality', value)} required />
              <Field span={6} label="Province" value={formRow.province} onChange={(value) => updateField('province', value)} />
              <Field span={6} label="Contact Number" value={formRow.contactNumber} onChange={(value) => updateField('contactNumber', value)} />
              <RadioField span={12} label="Civil Status" options={civilStatusOptions} value={formRow.civilStatus} onChange={(value) => updateField('civilStatus', value)} />
              {formRow.civilStatus === 'Others' && <Field span={6} label="Civil Status (Others)" value={formRow.civilStatusOther} onChange={(value) => updateField('civilStatusOther', value)} />}
            </FormSection>
            <FormSection title="Disability">
              <CheckGroup span={12} label="Check all that apply" options={disabilityOptions} exclusive="None" value={formRow.disability} onChange={(value) => updateField('disability', value)} />
              {toList(formRow.disability).includes('Others') && <Field span={6} label="Disability (Others)" value={formRow.disabilityOther} onChange={(value) => updateField('disabilityOther', value)} />}
            </FormSection>
            <FormSection title="Background">
              <RadioField span={12} label="Did you work overseas?" options={overseasWorkOptions} value={formRow.overseasWork} onChange={(value) => updateField('overseasWork', value)} />
              <RadioField span={6} label="Are you a graduate of TESDA Training Program?" options={yesNoOptions} value={formRow.tesdaGraduate} onChange={(value) => updateField('tesdaGraduate', value)} />
              {formRow.tesdaGraduate === 'Yes' && <Field span={6} label="Certificate Acquired" value={formRow.tesdaCertificate} onChange={(value) => updateField('tesdaCertificate', value)} />}
              <Field span={6} label="Estimated Monthly Net Income" type="number" adornment="Php" value={formRow.monthlyNetIncome} onChange={(value) => updateField('monthlyNetIncome', value)} />
              <Field span={6} label="Number of Children Living with the Family" type="number" value={formRow.childrenCount} onChange={(value) => updateField('childrenCount', value)} />
            </FormSection>
            <FormSection title="4P's and Requirements">
              <RadioField span={6} label="Are you a 4P's Beneficiary?" options={yesNoOptions} value={formRow.is4psBeneficiary} onChange={(value) => updateField('is4psBeneficiary', value)} />
              {formRow.is4psBeneficiary === 'Yes' && <Field span={6} label="Name of Beneficiary" value={formRow.beneficiaryName} onChange={(value) => updateField('beneficiaryName', value)} />}
              {formRow.is4psBeneficiary === 'Yes' && <Field span={6} label="Beneficiary Contact Number" value={formRow.beneficiaryContactNumber} onChange={(value) => updateField('beneficiaryContactNumber', value)} />}
              <RadioField span={6} label="Are you a graduate of 4P's?" options={yesNoOptions} value={formRow.is4psGraduate} onChange={(value) => updateField('is4psGraduate', value)} />
              <RadioField span={6} label="Do you have a Certificate of Indigency?" options={yesNoOptions} value={formRow.hasCertIndigency} onChange={(value) => updateField('hasCertIndigency', value)} />
              <Field span={6} label="Type of ID Presented" value={formRow.idType} onChange={(value) => updateField('idType', value)} />
              <Field span={6} label="ID Number" value={formRow.idNumber} onChange={(value) => updateField('idNumber', value)} />
            </FormSection>
            <FormSection title="Social Media Accounts">
              <Field span={4} label="Facebook" value={formRow.facebook} onChange={(value) => updateField('facebook', value)} />
              <Field span={4} label="Instagram" value={formRow.instagram} onChange={(value) => updateField('instagram', value)} />
              <Field span={4} label="Email Address" type="email" value={formRow.email} onChange={(value) => updateField('email', value)} />
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
      <DetailSection title="Project"><DetailFields row={row} keys={['dateApplied', 'projectName', 'projectLocation', 'projectType', 'projectComponent', 'implementationMode']} /></DetailSection>
      <DetailSection title="Applicant Information"><DetailFields row={row} keys={['lastName', 'firstName', 'middleName', 'nameExtension', 'sex', 'birthdate', 'birthplace', 'beneficiaryType', 'houseBlockLot', 'street', 'barangay', 'municipality', 'province', 'contactNumber', 'civilStatus', ...(row.civilStatus === 'Others' ? ['civilStatusOther'] : [])]} /></DetailSection>
      <DetailSection title="Disability">
        <ChipList value={row.disability} />
        {toList(row.disability).includes('Others') && <DetailFields row={row} keys={['disabilityOther']} />}
      </DetailSection>
      <DetailSection title="Background"><DetailFields row={row} keys={['overseasWork', 'tesdaGraduate', ...(row.tesdaGraduate === 'Yes' ? ['tesdaCertificate'] : []), 'monthlyNetIncome', 'childrenCount']} /></DetailSection>
      <DetailSection title="4P's and Requirements"><DetailFields row={row} keys={['is4psBeneficiary', ...(row.is4psBeneficiary === 'Yes' ? ['beneficiaryName', 'beneficiaryContactNumber'] : []), 'is4psGraduate', 'hasCertIndigency', 'idType', 'idNumber']} /></DetailSection>
      <DetailSection title="Social Media Accounts"><DetailFields row={row} keys={['facebook', 'instagram', 'email']} /></DetailSection>
    </>
  )
}

export default Livelihood
