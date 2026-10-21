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

const basePath = '/bridging/applicants'

const parentStatusFields = [
  ['parentSoloParent', 'Solo Parent'], ['parentPwd', 'PWD'], ['parentSeniorCitizen', 'Senior Citizen'],
  ['parentIp', 'IP'], ['parentArmedConflictVictim', 'Victims of Armed Conflict'], ['parentRebelReturnee', 'Rebel Returnees'],
]
const yearLevelOptions = ['College Graduate', 'College Level', 'Vocational Graduate', 'Senior High School/High School Graduate']
const blankSchool = () => ({ schoolName: '', yearFrom: '', yearTo: '', yearLevel: '' })

const columns = [
  { key: 'lastName', label: 'Family Name', group: 'Applicant' },
  { key: 'firstName', label: 'First Name', group: 'Applicant' },
  { key: 'middleName', label: 'Middle Name', group: 'Applicant' },
  { key: 'street', label: 'Street', group: 'Resident Address' },
  { key: 'barangay', label: 'Barangay', group: 'Resident Address' },
  { key: 'municipality', label: 'Municipality', group: 'Resident Address' },
  { key: 'province', label: 'Province', group: 'Resident Address' },
  { key: 'mobileNo', label: 'Mobile No.', group: 'Applicant' },
  { key: 'email', label: 'Email Address', group: 'Applicant' },
  { key: 'birthTown', label: 'Place of Birth (City/Town)', group: 'Place and Date of Birth' },
  { key: 'birthCountry', label: 'Country', group: 'Place and Date of Birth' },
  { key: 'birthdate', label: 'Date of Birth', group: 'Place and Date of Birth' },
  { key: 'age', label: 'Age', group: 'Place and Date of Birth' },
  { key: 'gender', label: 'Gender', group: 'Applicant' },
  { key: 'civilStatus', label: 'Civil Status', group: 'Applicant' },
  { key: 'motherFullName', label: 'Mother (Full Name)', group: 'Parents' },
  { key: 'fatherFullName', label: 'Father (Full Name)', group: 'Parents' },
  { key: 'currentStatus', label: 'Current Status', group: 'Education' },
  { key: 'isSpesBaby', label: 'SPES Baby', group: 'Questions' },
  { key: 'spesYearOfEmployment', label: 'Year of Employment', group: 'Questions' },
  { key: 'gwa', label: 'General Weighted Average', group: 'Questions' },
  ...parentStatusFields.map(([key, label]) => ({ key, label, group: 'Status of Parent' })),
  { key: 'parentsCombinedMonthlyIncome', label: "Parents' Combined Monthly Income / Economic Status", group: 'Questions' },
  { key: 'numberOfSiblings', label: 'Number of Siblings', group: 'Questions' },
  { key: 'isIndigentFamily', label: 'Belongs to an Indigent Family', group: 'Questions' },
]

// The table only shows the key columns; everything else is in the detail window.
const tableKeys = ['lastName', 'firstName', 'middleName', 'mobileNo', 'barangay', 'municipality', 'currentStatus']
const hideOnNarrow = new Set(['middleName', 'mobileNo', 'barangay'])
const checkKeys = new Set([...parentStatusFields.map(([key]) => key), 'isSpesBaby', 'isIndigentFamily'])
const yesNoKeys = new Set(['isSpesBaby', 'isIndigentFamily'])
const dateKeys = new Set(['birthdate'])
const requiredKeys = ['lastName', 'firstName', 'gender', 'mobileNo', 'barangay', 'municipality']
const futureDateKeys = ['birthdate']
const nameKey = 'lastName'
const newRowDefaults = {}
const normalize = (row) => ({ ...row, education: row.education || [] })
const customDisplay = () => undefined
const prepare = (row) => ({
  ...row,
  spesYearOfEmployment: row.isSpesBaby ? row.spesYearOfEmployment : '',
  education: row.education.filter((school) => school.schoolName.trim()),
})

// "Family Name, First Middle"
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
function Bridging() {
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
            <Button className="gip-home-button" href="/">
            <span aria-hidden="true">←</span>
            Back to Dashboard
          </Button>
          <Box className="gip-eyebrow">PROGRAM TRACKING DATABASE</Box>
          <Typography className="gip-page-title" component="h1" variant="h5">Bridging</Typography>
          <Typography className="gip-page-hint" component="p" variant="body2">Manage, search, and review Bridging program applicants.</Typography>
        </Box>
        <Box className="gip-record-count"><strong>{rows.length}</strong><span>applicants</span></Box>
      </Box>
      <Paper className="gip-table-card" elevation={0}>
        <Box className="gip-table-toolbar">
          <Typography className="gip-section-title" component="h2" variant="h6">Bridging Applicant List</Typography>
          {error && !formRow && <Typography color="error" role="alert" variant="body2">{error}</Typography>}
          <Box className="gip-toolbar-actions">
            <TextField aria-label="Search applicants" className="gip-search" onChange={(event) => { setSearch(event.target.value); setPage(0) }} placeholder="Search applicants..." size="small" value={search} />
            <Button className="gip-add-button" variant="contained" onClick={() => { setError(''); setFormRow(emptyRow()) }}>Add Applicant</Button>
          </Box>
        </Box>
        <TableContainer className="gip-table-container sagut-table-container">
          <Table stickyHeader aria-label="Bridging applicants" className="gip-table sagut-table" size="small">
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
        <DialogTitle>{formRow?.id === null ? 'Add New Bridging Applicant' : 'Edit Bridging Applicant'}</DialogTitle>
        <DialogContent dividers>
          {formRow && <>
            <FormSection title="Applicant Information">
              <Field span={4} label="Family Name" value={formRow.lastName} onChange={(value) => updateField('lastName', value)} required />
              <Field span={4} label="First Name" value={formRow.firstName} onChange={(value) => updateField('firstName', value)} required />
              <Field span={4} label="Middle Name" value={formRow.middleName} onChange={(value) => updateField('middleName', value)} />
              <Field span={4} label="Mobile No." value={formRow.mobileNo} onChange={(value) => updateField('mobileNo', value)} required />
              <Field span={4} label="Email Address" type="email" value={formRow.email} onChange={(value) => updateField('email', value)} />
              <RadioField span={4} label="Gender" options={['Male', 'Female']} value={formRow.gender} onChange={(value) => updateField('gender', value)} required />
              <RadioField span={12} label="Civil Status" options={['Single', 'Married', 'Widow/Widower']} value={formRow.civilStatus} onChange={(value) => updateField('civilStatus', value)} />
            </FormSection>
            <FormSection title="Resident Address">
              <Field span={3} label="Street" value={formRow.street} onChange={(value) => updateField('street', value)} />
              <Field span={3} label="Barangay" value={formRow.barangay} onChange={(value) => updateField('barangay', value)} required />
              <Field span={3} label="Municipality" value={formRow.municipality} onChange={(value) => updateField('municipality', value)} required />
              <Field span={3} label="Province" value={formRow.province} onChange={(value) => updateField('province', value)} />
            </FormSection>
            <FormSection title="Place and Date of Birth">
              <Field span={3} label="City or Town" value={formRow.birthTown} onChange={(value) => updateField('birthTown', value)} />
              <Field span={3} label="Country" value={formRow.birthCountry} onChange={(value) => updateField('birthCountry', value)} />
              <Field span={4} label="Date of Birth" type="date" value={formRow.birthdate} onChange={(value) => updateField('birthdate', value)} />
              <Field span={2} label="Age" type="number" value={formRow.age} onChange={(value) => updateField('age', value)} />
            </FormSection>
            <FormSection title="Parents">
              <Field span={6} label="Mother (Full Name)" value={formRow.motherFullName} onChange={(value) => updateField('motherFullName', value)} />
              <Field span={6} label="Father (Full Name)" value={formRow.fatherFullName} onChange={(value) => updateField('fatherFullName', value)} />
            </FormSection>
            <FormSection title="Current Status">
              <RadioField span={12} label="Current Status" options={['Student', 'Out of School Youth (OSY)']} value={formRow.currentStatus} onChange={(value) => updateField('currentStatus', value)} />
            </FormSection>
            <FormSection title="Educational Attainment">
              <RepeatRows
                addLabel="Add school"
                itemLabel="school"
                items={formRow.education}
                makeBlank={blankSchool}
                onChange={(items) => updateField('education', items)}
                renderRow={(item, set) => <>
                  <Field span={5} label="Name of School" value={item.schoolName} onChange={(value) => set('schoolName', value)} />
                  <Field span={2} label="From" value={item.yearFrom} onChange={(value) => set('yearFrom', value)} />
                  <Field span={2} label="To" value={item.yearTo} onChange={(value) => set('yearTo', value)} />
                  <SelectField span={3} label="Year Level" options={yearLevelOptions} value={item.yearLevel} onChange={(value) => set('yearLevel', value)} />
                </>}
              />
            </FormSection>
            <FormSection title="SPES Baby">
              <CheckFields fields={[['isSpesBaby', 'Are you a SPES Baby?']]} row={formRow} updateField={updateField} />
              {formRow.isSpesBaby && <Field span={4} label="Year of employment" value={formRow.spesYearOfEmployment} onChange={(value) => updateField('spesYearOfEmployment', value)} />}
            </FormSection>
            <FormSection title="General Weighted Average">
              <Field span={4} label="General Weighted Average" type="number" value={formRow.gwa} onChange={(value) => updateField('gwa', value)} />
            </FormSection>
            <FormSection title="Status of Parent">
              <CheckFields fields={parentStatusFields} row={formRow} updateField={updateField} />
            </FormSection>
            <FormSection title="Family Background">
              <Field span={6} label="Parents' combined monthly income / economic status" value={formRow.parentsCombinedMonthlyIncome} onChange={(value) => updateField('parentsCombinedMonthlyIncome', value)} />
              <Field span={3} label="Number of siblings" type="number" value={formRow.numberOfSiblings} onChange={(value) => updateField('numberOfSiblings', value)} />
              <CheckFields fields={[['isIndigentFamily', 'Belongs to an indigent family']]} row={formRow} updateField={updateField} />
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
      <DetailSection title="Applicant Information"><DetailFields row={row} keys={['lastName', 'firstName', 'middleName', 'mobileNo', 'email', 'gender', 'civilStatus']} /></DetailSection>
      <DetailSection title="Resident Address"><DetailFields row={row} keys={['street', 'barangay', 'municipality', 'province']} /></DetailSection>
      <DetailSection title="Place and Date of Birth"><DetailFields row={row} keys={['birthTown', 'birthCountry', 'birthdate', 'age']} /></DetailSection>
      <DetailSection title="Parents"><DetailFields row={row} keys={['motherFullName', 'fatherFullName']} /></DetailSection>
      <DetailSection title="Current Status"><DetailFields row={row} keys={['currentStatus']} /></DetailSection>
      <DetailSection title="Educational Attainment">
        <ItemDetails items={row.education} fields={[['schoolName', 'Name of School'], ['yearFrom', 'From'], ['yearTo', 'To'], ['yearLevel', 'Year Level']]} />
      </DetailSection>
      <DetailSection title="Questions">
        <DetailFields row={row} keys={['isSpesBaby', ...(row.isSpesBaby ? ['spesYearOfEmployment'] : []), 'gwa', 'parentsCombinedMonthlyIncome', 'numberOfSiblings', 'isIndigentFamily']} />
      </DetailSection>
      <DetailSection title="Status of Parent"><ChipList row={row} fields={parentStatusFields} /></DetailSection>
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

// Rows the user can add and remove (education, vacancies, ...).
function RepeatRows({ items, onChange, makeBlank, addLabel, itemLabel, renderRow }) {
  const update = (index, key, value) => onChange(items.map((item, position) => (position === index ? { ...item, [key]: value } : item)))
  return (
    <Box className="sagut-span-12">
      {items.length === 0 && <Typography color="text.secondary" sx={{ mb: 1 }} variant="body2">Nothing added yet.</Typography>}
      {items.map((item, index) => (
        <Box key={index} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, mb: 1.5 }}>
          <Box className="sagut-form-grid">{renderRow(item, (key, value) => update(index, key, value))}</Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button color="error" onClick={() => onChange(items.filter((_, position) => position !== index))} size="small">Remove {itemLabel} {index + 1}</Button>
          </Box>
        </Box>
      ))}
      <Button onClick={() => onChange([...items, makeBlank()])} variant="outlined">{addLabel}</Button>
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

export default Bridging
