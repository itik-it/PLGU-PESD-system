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
import { useDebounce } from '../utils/useDebounce.js'
import BatchList from '../components/BatchList.jsx'


const employerTypeOptions = [
  ['National Government Agency', 'Public · National Government Agency'],
  ['Local Government Unit', 'Public · Local Government Unit'],
  ['Government-owned and Controlled Corporation', 'Public · Government-owned and Controlled Corporation'],
  ['State/Local University or College', 'Public · State/Local University or College'],
  ['Direct Hire', 'Private · Direct Hire'],
  ['Local Recruitment Agency', 'Private · Local Recruitment Agency'],
  ['Overseas Recruitment Agency', 'Private · Overseas Recruitment Agency'],
  ['D.O. 174', 'Private · D.O. 174'],
]
const publicEmployerTypes = new Set(employerTypeOptions.slice(0, 4).map(([value]) => value))
const workForceOptions = ['Micro (1-9)', 'Small (10-99)', 'Medium (100-199)', 'Large (200 and up)']
const natureOfWorkOptions = ['Permanent', 'Contractual', 'Project-based', 'Internship/OJT', 'Part-time', 'Work from home / Online job']
const blankVacancy = () => ({ positionTitle: '', jobDescription: '', natureOfWork: '', placeOfWork: '', salary: '', vacancyCount: '' })

const columns = [
  { key: 'businessName', label: 'Business Name', group: 'Establishment Details' },
  { key: 'tradeName', label: 'Trade Name', group: 'Establishment Details' },
  { key: 'acronym', label: 'Acronym/Abbreviation', group: 'Establishment Details' },
  { key: 'officeType', label: 'Office Type', group: 'Establishment Details' },
  { key: 'tin', label: 'Tax Identification Number', group: 'Establishment Details' },
  { key: 'employerType', label: 'Employer Type', group: 'Establishment Details' },
  { key: 'employerSector', label: 'Sector', group: 'Establishment Details' },
  { key: 'workForceSize', label: 'Total Work Force', group: 'Establishment Details' },
  { key: 'lineOfBusiness', label: 'Line of Business/Industry (BIR 2303)', group: 'Establishment Details' },
  { key: 'streetVillage', label: 'Street/Village', group: 'Address' },
  { key: 'barangay', label: 'Barangay', group: 'Address' },
  { key: 'municipalityCity', label: 'Municipality/City', group: 'Address' },
  { key: 'province', label: 'Province', group: 'Address' },
  { key: 'ownerFullName', label: 'Name of Owner/President', group: 'Contact Details' },
  { key: 'contactPerson', label: 'Contact Person', group: 'Contact Details' },
  { key: 'contactPosition', label: 'Position', group: 'Contact Details' },
  { key: 'telephoneNumber', label: 'Telephone Number', group: 'Contact Details' },
  { key: 'mobileNumber', label: 'Mobile Number', group: 'Contact Details' },
  { key: 'faxNumber', label: 'Fax Number', group: 'Contact Details' },
  { key: 'email', label: 'E-mail Address', group: 'Contact Details' },
  { key: 'totalVacancies', label: 'Total Vacancies', group: 'Vacancy Details', derived: true },
]

// The table only shows the key columns; everything else is in the detail window.
const tableKeys = ['businessName', 'tradeName', 'municipalityCity', 'contactPerson', 'mobileNumber', 'totalVacancies']
const hideOnNarrow = new Set(['tradeName', 'contactPerson', 'mobileNumber'])
const checkKeys = new Set()
const yesNoKeys = new Set()
const dateKeys = new Set()
const requiredKeys = ['businessName', 'barangay', 'municipalityCity', 'contactPerson']
const futureDateKeys = []
const nameKey = 'businessName'
const newRowDefaults = { vacancies: [blankVacancy()] }
const normalize = (row) => ({ ...row, vacancies: row.vacancies || [] })
const totalVacancies = (row) => (row.vacancies || []).reduce((sum, vacancy) => sum + (Number(vacancy.vacancyCount) || 0), 0)
const customDisplay = (row, key) => (key === 'totalVacancies' ? totalVacancies(row) : undefined)
const prepare = (row) => ({
  ...row,
  employerSector: row.employerType ? (publicEmployerTypes.has(row.employerType) ? 'Public' : 'Private') : '',
  vacancies: row.vacancies.filter((vacancy) => vacancy.positionTitle.trim()),
})

const fullName = (row) => row.businessName || ''

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
function JobVacancyForm({ batch, onBack }) {
  const basePath = `/jobvacancy/batches/${batch.id}/applicants`
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
          <Typography className="gip-page-title" component="h1" variant="h5">Job Vacancy</Typography>
          <Typography className="gip-page-hint" component="p" variant="body2">Manage, search, and review registered establishments and their job vacancies.</Typography>
        </Box>
        <Box className="gip-record-count"><strong>{rows.length}</strong><span>employers</span></Box>
      </Box>
      <Paper className="gip-table-card" elevation={0}>
        <Box className="gip-table-toolbar">
          <Typography className="gip-section-title" component="h2" variant="h6">Employer List</Typography>
          {error && !formRow && <Typography color="error" role="alert" variant="body2">{error}</Typography>}
          <Box className="gip-toolbar-actions">
            <TextField aria-label="Search employers" className="gip-search" onChange={(event) => { setSearch(event.target.value); setPage(0) }} placeholder="Search employers..." size="small" value={search} />
            <Button className="gip-add-button" variant="contained" onClick={() => { setError(''); setFormRow(emptyRow()) }}>Add Employer</Button>
          </Box>
        </Box>
        <TableContainer className="gip-table-container sagut-table-container">
          <Table stickyHeader aria-label="Job Vacancy employers" className="gip-table sagut-table" size="small">
            <TableHead>
              <TableRow>
                {tableColumns.map((column) => <TableCell className={`gip-column-header ${hideOnNarrow.has(column.key) ? 'sagut-hide-narrow' : ''}`} key={column.key}>{column.label}</TableCell>)}
                <TableCell className="gip-column-header gip-actions-header">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? <TableRow><TableCell align="center" colSpan={tableColumns.length + 1}>Loading employers...</TableCell></TableRow>
                : pagedRows.length === 0 ? <TableRow><TableCell align="center" colSpan={tableColumns.length + 1}>{search ? 'No employers match your search.' : 'No employers yet. Add an employer to begin.'}</TableCell></TableRow>
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
          <Typography variant="body2">{filteredRows.length ? `${visiblePage * rowsPerPage + 1}–${Math.min((visiblePage + 1) * rowsPerPage, filteredRows.length)} of ${filteredRows.length}` : '0 employers'}</Typography>
          <Button disabled={visiblePage === 0} onClick={() => setPage((current) => current - 1)}>Previous</Button>
          <Button disabled={visiblePage >= pageCount - 1} onClick={() => setPage((current) => current + 1)}>Next</Button>
        </Box>
      </Paper>

      <Dialog fullWidth maxWidth="lg" onClose={() => setFormRow(null)} open={Boolean(formRow)}>
        <DialogTitle>{formRow?.id === null ? 'Add New Employer' : 'Edit Employer'}</DialogTitle>
        <DialogContent dividers>
          {formRow && <>
            <FormSection title="Establishment Details">
              <Field span={5} label="Business Name" value={formRow.businessName} onChange={(value) => updateField('businessName', value)} required />
              <Field span={4} label="Trade Name" value={formRow.tradeName} onChange={(value) => updateField('tradeName', value)} />
              <Field span={3} label="Acronym/Abbreviation" value={formRow.acronym} onChange={(value) => updateField('acronym', value)} />
              <RadioField span={4} label="Office Type" options={['Main Office', 'Branch']} value={formRow.officeType} onChange={(value) => updateField('officeType', value)} />
              <Field span={4} label="Tax Identification Number" value={formRow.tin} onChange={(value) => updateField('tin', value)} />
              <SelectField span={4} label="Total Work Force" options={workForceOptions} value={formRow.workForceSize} onChange={(value) => updateField('workForceSize', value)} />
              <SelectField span={6} label="Employer Type" options={employerTypeOptions} value={formRow.employerType} onChange={(value) => updateField('employerType', value)} />
              <Field span={6} label="Line of Business/Industry (BIR 2303)" value={formRow.lineOfBusiness} onChange={(value) => updateField('lineOfBusiness', value)} />
            </FormSection>
            <FormSection title="Address">
              <Field span={3} label="Street/Village" value={formRow.streetVillage} onChange={(value) => updateField('streetVillage', value)} />
              <Field span={3} label="Barangay" value={formRow.barangay} onChange={(value) => updateField('barangay', value)} required />
              <Field span={3} label="Municipality/City" value={formRow.municipalityCity} onChange={(value) => updateField('municipalityCity', value)} required />
              <Field span={3} label="Province" value={formRow.province} onChange={(value) => updateField('province', value)} />
            </FormSection>
            <FormSection title="Establishment Contact Details">
              <Field span={6} label="Name of Owner/President (Full Name)" value={formRow.ownerFullName} onChange={(value) => updateField('ownerFullName', value)} />
              <Field span={6} label="Contact Person (Full Name)" value={formRow.contactPerson} onChange={(value) => updateField('contactPerson', value)} required />
              <Field span={6} label="Position" value={formRow.contactPosition} onChange={(value) => updateField('contactPosition', value)} />
              <Field span={6} label="E-mail Address" type="email" value={formRow.email} onChange={(value) => updateField('email', value)} />
              <Field span={4} label="Telephone Number" value={formRow.telephoneNumber} onChange={(value) => updateField('telephoneNumber', value)} />
              <Field span={4} label="Mobile Number" value={formRow.mobileNumber} onChange={(value) => updateField('mobileNumber', value)} />
              <Field span={4} label="Fax Number" value={formRow.faxNumber} onChange={(value) => updateField('faxNumber', value)} />
            </FormSection>
            <FormSection title="Vacancy Details">
              <RepeatRows
                addLabel="Add vacancy"
                itemLabel="vacancy"
                items={formRow.vacancies}
                makeBlank={blankVacancy}
                onChange={(items) => updateField('vacancies', items)}
                renderRow={(item, set) => <>
                  <Field span={6} label="Position Title" value={item.positionTitle} onChange={(value) => set('positionTitle', value)} />
                  <SelectField span={6} label="Nature of Work" options={natureOfWorkOptions} value={item.natureOfWork} onChange={(value) => set('natureOfWork', value)} />
                  <Field span={12} multiline label="Job Description" value={item.jobDescription} onChange={(value) => set('jobDescription', value)} />
                  <Field span={5} label="Place of Work" value={item.placeOfWork} onChange={(value) => set('placeOfWork', value)} />
                  <Field span={4} label="Salary" value={item.salary} onChange={(value) => set('salary', value)} />
                  <Field span={3} label="Vacancy Count" type="number" value={item.vacancyCount} onChange={(value) => set('vacancyCount', value)} />
                </>}
              />
            </FormSection>
          </>}
        </DialogContent>
        <DialogActions>{error && <Typography color="error" role="alert" sx={{ mr: 'auto', pl: 1 }} variant="body2">{error}</Typography>}<Button onClick={() => { setError(''); setFormRow(null) }}>Cancel</Button><Button disabled={saving} onClick={saveRow} variant="contained">{saving ? 'Saving...' : 'Save Employer'}</Button></DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="md" onClose={() => setSelectedRow(null)} open={Boolean(selectedRow)}>
        <DialogTitle>{selectedRow && fullName(selectedRow)}</DialogTitle>
        <DialogContent dividers>{selectedRow && <DetailView row={selectedRow} />}</DialogContent>
        <DialogActions>
          <Button onClick={() => { setError(''); setFormRow({ ...selectedRow }); setSelectedRow(null) }}>Edit</Button>
          <Button onClick={() => setSelectedRow(null)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog onClose={() => setDeleteTarget(null)} open={Boolean(deleteTarget)}><DialogTitle>Delete employer?</DialogTitle><DialogContent>This will permanently remove {deleteTarget && fullName(deleteTarget)}.</DialogContent><DialogActions><Button onClick={() => setDeleteTarget(null)}>Cancel</Button><Button color="error" onClick={deleteRow}>Delete</Button></DialogActions></Dialog>
    </main>
  )
}

function DetailView({ row }) {
  return (
    <>
      <DetailSection title="Establishment Details"><DetailFields row={row} keys={['businessName', 'tradeName', 'acronym', 'officeType', 'tin', 'employerType', 'workForceSize', 'lineOfBusiness']} /></DetailSection>
      <DetailSection title="Address"><DetailFields row={row} keys={['streetVillage', 'barangay', 'municipalityCity', 'province']} /></DetailSection>
      <DetailSection title="Establishment Contact Details"><DetailFields row={row} keys={['ownerFullName', 'contactPerson', 'contactPosition', 'telephoneNumber', 'mobileNumber', 'faxNumber', 'email']} /></DetailSection>
      <DetailSection title="Vacancy Details">
        <ItemDetails items={row.vacancies} fields={[['positionTitle', 'Position Title'], ['natureOfWork', 'Nature of Work'], ['placeOfWork', 'Place of Work'], ['salary', 'Salary'], ['vacancyCount', 'Vacancy Count'], ['jobDescription', 'Job Description']]} />
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

export default function JobVacancy() {
  const [batch, setBatch] = useState(null)
  if (!batch) return <BatchList basePath="/jobvacancy/batches" noun="employer" nounPlural="employers" onOpen={setBatch} title="Job Vacancy Groups" />
  return <JobVacancyForm batch={batch} onBack={() => setBatch(null)} />
}
