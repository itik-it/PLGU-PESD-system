import { useEffect, useMemo, useState } from 'react';
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
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

const columns = [
  { key: 'lastName', label: 'Last Name', group: 'beneficiary' },
  { key: 'firstName', label: 'First Name', group: 'beneficiary' },
  { key: 'middleName', label: 'Middle Name', group: 'beneficiary' },
  { key: 'extensionName', label: 'Extension Name', group: 'beneficiary' },
  { key: 'birthday', label: 'Birthday (DD/MM/YY)', group: 'beneficiary' },
  { key: 'address', label: 'Address', group: 'beneficiary' },
  { key: 'barangay', label: 'Barangay', group: 'beneficiary' },
  { key: 'cityMunicipality', label: 'City/Municipality', group: 'beneficiary' },
  { key: 'province', label: 'Province', group: 'beneficiary' },
  { key: 'course', label: 'Course', group: 'beneficiary' },
  { key: 'email', label: 'E-mail Address', group: 'beneficiary' },
  { key: 'contactNo', label: 'Contact No.', group: 'beneficiary' },
  { key: 'sex', label: 'Sex', group: 'beneficiary' },
  { key: 'civilStatus', label: 'Civil Status', group: 'beneficiary' },
  { key: 'age', label: 'Age', group: 'beneficiary' },
  { key: 'remarks', label: 'Remarks', group: 'beneficiary' },
  { key: 'gipForm', label: 'GIP Form', group: 'requirements' },
  { key: 'resume', label: 'Resume', group: 'requirements' },
  { key: 'validId', label: 'Valid ID', group: 'requirements' },
  { key: 'psa', label: 'PSA', group: 'requirements' },
  { key: 'diploma', label: 'Diploma', group: 'requirements' },
  { key: 'tor', label: 'TOR', group: 'requirements' },
  { key: 'supportingDocs', label: 'Supporting Docs', group: 'requirements' },
  { key: 'employmentStatus', label: 'Current Employment', group: 'employment' },
  { key: 'dateApplied', label: 'Date Applied', group: 'employment' },
]

const employmentOptions = [
  'Fresh Graduate',
  'First Time Job Seeker',
  'Young Professional',
]

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const fromApiApplicant = (applicant) => ({
  id: applicant.id,
  lastName: applicant.lastName || '',
  firstName: applicant.firstName || '',
  middleName: applicant.middleName || '',
  extensionName: applicant.extensionName || '',
  birthday: applicant.birthdate || '',
  address: applicant.address || '',
  barangay: applicant.barangay || '',
  cityMunicipality: applicant.municipality || '',
  province: applicant.province || '',
  course: applicant.course || '',
  email: applicant.email || '',
  contactNo: applicant.contactNumber || '',
  sex: applicant.sex || '',
  civilStatus: applicant.civilStatus || '',
  age: applicant.age === null || applicant.age === undefined ? '' : String(applicant.age),
  remarks: applicant.remarks || '',
  gipForm: Boolean(applicant.requirements?.gipForm),
  resume: Boolean(applicant.requirements?.resume),
  validId: Boolean(applicant.requirements?.validId),
  psa: Boolean(applicant.requirements?.psa),
  diploma: Boolean(applicant.requirements?.diploma),
  tor: Boolean(applicant.requirements?.tor),
  supportingDocs: applicant.supportingDocuments || '',
  employmentStatus: applicant.classifications || [],
  dateApplied: applicant.dateApplied || '',
})

const toApiApplicant = (applicant) => ({
  lastName: applicant.lastName,
  firstName: applicant.firstName,
  middleName: applicant.middleName,
  extensionName: applicant.extensionName,
  birthdate: applicant.birthday,
  age: applicant.age,
  sex: applicant.sex,
  civilStatus: applicant.civilStatus,
  address: applicant.address,
  barangay: applicant.barangay,
  municipality: applicant.cityMunicipality,
  province: applicant.province,
  course: applicant.course,
  email: applicant.email,
  contactNumber: applicant.contactNo,
  classifications: applicant.employmentStatus,
  dateApplied: applicant.dateApplied,
  remarks: applicant.remarks,
  requirements: {
    gipForm: applicant.gipForm,
    resume: applicant.resume,
    validId: applicant.validId,
    psa: applicant.psa,
    diploma: applicant.diploma,
    tor: applicant.tor,
  },
  supportingDocuments: applicant.supportingDocs,
})

const request = async (path, options = {}) => {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || 'The server could not complete the request.')
  }
  return response.status === 204 ? null : response.json()
}

const groupLabels = {
  beneficiary: 'BENEFICIARY INFORMATION',
  requirements: 'REQUIREMENTS',
  employment: 'CURRENT EMPLOYMENT',
}

const formGroupDescriptions = {
  beneficiary: 'Personal and contact information',
  requirements: 'Documents submitted by the applicant',
  employment: 'Employment history and application details',
}

const requirementKeys = new Set(
  columns
    .filter((column) => column.group === 'requirements' && column.key !== 'supportingDocs')
    .map((column) => column.key),
)

const createEmptyRow = (id = null) => columns.reduce((row, column) => {
  if (column.key === 'employmentStatus') {
    row[column.key] = []
  } else if (requirementKeys.has(column.key)) {
    row[column.key] = false
  } else {
    row[column.key] = ''
  }
  return row
}, { id })

const displayValue = (value, fallback) => {
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback
  return value || fallback
}

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-GB')
}

const calculateAge = (birthday) => {
  if (!birthday) return ''

  const birthDate = new Date(`${birthday}T00:00:00`)
  if (Number.isNaN(birthDate.getTime())) return ''

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const birthdayThisYear = new Date(
    today.getFullYear(),
    birthDate.getMonth(),
    birthDate.getDate(),
  )

  if (today < birthdayThisYear) age -= 1
  return age >= 0 ? String(age) : ''
}

function Gip() {
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [selectedRow, setSelectedRow] = useState(null)
  const [formRow, setFormRow] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadApplicants = async () => {
      try {
        const applicants = await request('/gip/applicants')
        setRows(applicants.map(fromApiApplicant))
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setLoading(false)
      }
    }
    loadApplicants()
  }, [])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((row) => columns.some((column) => (
      String(row[column.key]).toLowerCase().includes(query)
    )))
  }, [rows, search])

  const openAddForm = () => setFormRow(createEmptyRow())
  const openEditForm = (row) => setFormRow({ ...row })
  const closeForm = () => setFormRow(null)

  const saveRow = async () => {
    setSaving(true)
    setError('')
    try {
      const isNew = formRow.id === null
      const saveResponse = await request(
        isNew ? '/gip/applicants' : `/gip/applicants/${formRow.id}`,
        {
          method: isNew ? 'POST' : 'PUT',
          body: JSON.stringify(toApiApplicant(formRow)),
        },
      )
      let savedRow
      if (isNew) {
        savedRow = { ...formRow, id: saveResponse.applicantId }
      } else {
        const applicants = await request('/gip/applicants')
        const updatedApplicant = applicants.find((row) => row.id === formRow.id)
        if (!updatedApplicant) throw new Error('Updated applicant could not be loaded.')
        savedRow = fromApiApplicant(updatedApplicant)
      }
      setRows((currentRows) => isNew
        ? [...currentRows, savedRow]
        : currentRows.map((row) => (row.id === savedRow.id ? savedRow : row)))
      setSearch('')
      closeForm()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteRow = async () => {
    try {
      setError('')
      await request(`/gip/applicants/${deleteTarget.id}`, { method: 'DELETE' })
      setRows((currentRows) => currentRows.filter((row) => row.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  return (
    <main className="gip-page">
      <Box className="gip-page-heading">
        <Box>
          <Box className="gip-eyebrow">PROGRAM TRACKING DATABASE</Box>
          <Typography className="gip-page-title" component="h1" variant="h5">
            GIP Beneficiary Records
          </Typography>
          <Typography className="gip-page-hint" component="p" variant="body2">
            Manage, search, and review all registered beneficiaries.
          </Typography>
        </Box>
        <Box className="gip-record-count">
          <strong>{rows.length}</strong>
          <span>Total records</span>
        </Box>
      </Box>

      <Paper className="gip-table-card" elevation={0}>
        <Box className="gip-table-toolbar">
          <Box>
            <Typography className="gip-section-title" component="h2" variant="h6">
              Applicant list
            </Typography>
            <Typography className="gip-section-hint" component="p" variant="body2">
              {filteredRows.length} {filteredRows.length === 1 ? 'record' : 'records'} shown
            </Typography>
          </Box>
          {error && (
            <Typography color="error" role="alert" variant="body2">
              {error}
            </Typography>
          )}
          <Box className="gip-toolbar-actions">
            <TextField
              aria-label="Search applicants"
              className="gip-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search applicants..."
              size="small"
              value={search}
            />
            <Button className="gip-add-button" variant="contained" onClick={openAddForm}>
              <span aria-hidden="true" className="gip-button-symbol">+</span>
              Add Applicant
            </Button>
          </Box>
        </Box>

        <TableContainer className="gip-table-container">
          <Table stickyHeader aria-label="GIP beneficiary records" className="gip-table" size="small">
          <TableHead>
            <TableRow>
              {Object.entries(groupLabels).map(([group, label]) => (
                <TableCell
                  align="center"
                  colSpan={columns.filter((column) => column.group === group).length}
                  key={group}
                  className="gip-group-header"
                >
                  {label}
                </TableCell>
              ))}
              <TableCell align="center" className="gip-group-header">ACTIONS</TableCell>
            </TableRow>
            <TableRow>
              {columns.map((column) => (
                <TableCell className="gip-column-header" key={column.key}>
                  {column.label}
                </TableCell>
              ))}
              <TableCell className="gip-column-header">Manage</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell align="center" colSpan={columns.length + 1}>Loading applicants...</TableCell></TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableCell align="center" colSpan={columns.length + 1}>
                  {search ? 'No applicants match your search.' : 'No applicants yet. Add an applicant to begin.'}
                </TableCell>
              </TableRow>
            ) : filteredRows.map((row) => (
              <TableRow
                hover
                className="gip-data-row"
                key={row.id}
                onClick={() => setSelectedRow(row)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedRow(row)
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {columns.map((column) => {
                  if (column.key === 'employmentStatus') {
                    return (
                      <TableCell key={column.key}>
                        <Box className="gip-employment-chips">
                          {row[column.key]?.length
                            && Array.isArray(row[column.key])
                            ? row[column.key].map((status) => (
                              <Chip className="gip-employment-chip" key={status} label={status} size="small" />
                            ))
                            : '—'}
                        </Box>
                      </TableCell>
                    )
                  }

                  let value
                  if (requirementKeys.has(column.key)) {
                    value = row[column.key] ? '✓' : '—'
                  } else if (column.key === 'birthday' || column.key === 'dateApplied') {
                    value = formatDate(row[column.key])
                  } else {
                    value = displayValue(row[column.key], '—')
                  }
                  return <TableCell key={column.key}>{value}</TableCell>
                })}
                <TableCell className="gip-actions-cell" onClick={(event) => event.stopPropagation()}>
                  <IconButton aria-label="Edit applicant" color="primary" onClick={() => openEditForm(row)} size="small">
                    <span aria-hidden="true">✎</span>
                  </IconButton>
                  <IconButton aria-label="Delete applicant" color="error" onClick={() => setDeleteTarget(row)} size="small">
                    <span aria-hidden="true">×</span>
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog fullWidth maxWidth="md" onClose={() => setSelectedRow(null)} open={Boolean(selectedRow)}>
        <DialogTitle>Complete beneficiary information</DialogTitle>
        <DialogContent dividers>
          <Box className="gip-details-grid">
            {selectedRow && columns.map((column) => (
              <Box className="gip-detail" key={column.key}>
                <Typography component="dt" variant="caption">{column.label}</Typography>
                <Typography component="dd" variant="body2">
                  {requirementKeys.has(column.key)
                    ? selectedRow[column.key] ? 'Submitted' : 'Not submitted'
                    : column.key === 'birthday' || column.key === 'dateApplied'
                    ? formatDate(selectedRow[column.key]).replace('—', 'Not provided')
                    : displayValue(selectedRow[column.key], 'Not provided')}
                </Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog
        fullWidth
        maxWidth="lg"
        onClose={closeForm}
        open={Boolean(formRow)}
        PaperProps={{ className: 'gip-form-dialog' }}
      >
        <DialogTitle className="gip-form-title">
          <Typography component="span" variant="h6">
            {formRow?.id === null ? 'Add New Applicant' : 'Edit Applicant'}
          </Typography>
          <Typography component="span" variant="body2">
            Complete the applicant information below.
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {formRow && Object.entries(groupLabels).map(([group, label]) => (
            <Box className="gip-form-section" key={group}>
              <Box className="gip-form-section-heading">
                <Typography component="h2" variant="subtitle1">{label}</Typography>
                <Typography component="p" variant="caption">{formGroupDescriptions[group]}</Typography>
              </Box>
              <Box className="gip-form-grid">
                {columns.filter((column) => column.group === group).map((column) => {
                  const updateField = (event) => {
                    const value = event.target.value
                    setFormRow({
                      ...formRow,
                      [column.key]: value,
                      ...(column.key === 'birthday' ? { age: calculateAge(value) } : {}),
                    })
                  }

                  if (column.key === 'employmentStatus') {
                    const selectedEmployment = Array.isArray(formRow[column.key])
                      ? formRow[column.key]
                      : formRow[column.key] ? [formRow[column.key]] : []
                    return (
                      <FormControl className="gip-employment-control" key={column.key} required>
                        <Typography className="gip-field-label" component="span">
                          {column.label}
                        </Typography>
                        <Box
                          aria-label={column.label}
                          className="gip-employment-options"
                          role="group"
                        >
                          {employmentOptions.map((option) => (
                            <FormControlLabel
                              control={(
                                <Checkbox
                                  checked={selectedEmployment.includes(option)}
                                  onChange={(event) => {
                                    const nextValues = event.target.checked
                                      ? [...selectedEmployment, option]
                                      : selectedEmployment.filter((value) => value !== option)
                                    setFormRow({ ...formRow, [column.key]: nextValues })
                                  }}
                                  size="small"
                                />
                              )}
                              key={option}
                              label={option}
                            />
                          ))}
                        </Box>
                      </FormControl>
                    )
                  }

                  if (requirementKeys.has(column.key)) {
                    return (
                      <FormControlLabel
                        className="gip-requirement-checkbox"
                        control={(
                          <Checkbox
                            checked={Boolean(formRow[column.key])}
                            onChange={(event) => setFormRow({
                              ...formRow,
                              [column.key]: event.target.checked,
                            })}
                            size="small"
                          />
                        )}
                        key={column.key}
                        label={column.label}
                      />
                    )
                  }

                  if (column.key === 'age') {
                    return (
                      <TextField
                        disabled
                        helperText="Calculated from birthday"
                        key={column.key}
                        label={column.label}
                        size="small"
                        value={formRow.age}
                      />
                    )
                  }

                  const isDateField = column.key === 'birthday' || column.key === 'dateApplied'
                  if (isDateField) {
                    return (
                      <Box className="gip-date-field" key={column.key}>
                        <Typography className="gip-field-label" component="label" htmlFor={`gip-${column.key}`}>
                          {column.label}
                          {column.key === 'birthday' && <span aria-hidden="true"> *</span>}
                        </Typography>
                        <TextField
                          id={`gip-${column.key}`}
                          inputProps={{ 'aria-label': column.label }}
                          onChange={updateField}
                          required={column.key === 'birthday'}
                          size="small"
                          type="date"
                          value={formRow[column.key]}
                        />
                      </Box>
                    )
                  }

                  return (
                    <TextField
                      key={column.key}
                      label={column.label}
                      onChange={updateField}
                      required={column.key === 'lastName' || column.key === 'firstName'}
                      size="small"
                      type={isDateField ? 'date' : 'text'}
                      value={formRow[column.key]}
                    />
                  )
                })}
              </Box>
            </Box>
          ))}
        </DialogContent>
        <DialogActions className="gip-form-actions">
          <Button onClick={closeForm}>Cancel</Button>
          <Button disabled={saving} onClick={saveRow} variant="contained">
            {saving ? 'Saving...' : 'Save Applicant'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog onClose={() => setDeleteTarget(null)} open={Boolean(deleteTarget)}>
        <DialogTitle>Delete applicant?</DialogTitle>
        <DialogContent>
          This applicant record will be permanently removed from the table.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" onClick={deleteRow} variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </main>
  )
}

export default Gip