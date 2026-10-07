import {
  Box, Button, Checkbox, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, FormControlLabel, TextField, Typography,
} from '@mui/material'
import {
  columns, employmentOptions, groupLabels, formGroupDescriptions,
  requirementKeys, createEmptyRow,
} from '../gipSettings'
import { calculateAge } from '../gipHelpers'

function GipFormDialog({ row, saving, onClose, onChange, onSave }) {
  const open = Boolean(row)

  // Called when any field changes; the page owns the row object.
  const updateField = (key, value) => {
    onChange({
      ...row,
      [key]: value,
      ...(key === 'birthday' ? { age: calculateAge(value) } : {}),
    })
  }

  return (
    <Dialog
      fullWidth
      maxWidth="lg"
      onClose={onClose}
      open={open}
      PaperProps={{ className: 'gip-form-dialog' }}
    >
      <DialogTitle className="gip-form-title">
        <Typography component="span" variant="h6">
          {row?.id === null ? 'Add New Applicant' : 'Edit Applicant'}
        </Typography>
        <Typography component="span" variant="body2">
          Complete the applicant information below.
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {row &&
          Object.entries(groupLabels).map(([group, label]) => (
            <Box className="gip-form-section" key={group}>
              <Box className="gip-form-section-heading">
                <Typography component="h2" variant="subtitle1">{label}</Typography>
                <Typography component="p" variant="caption">
                  {formGroupDescriptions[group]}
                </Typography>
              </Box>

              <Box className="gip-form-grid">
                {columns
                  .filter((c) => c.group === group)
                  .map((column) => {
                    // --- Employment multi-checkbox ---
                    if (column.key === 'employmentStatus') {
                      const selected = Array.isArray(row[column.key])
                        ? row[column.key]
                        : row[column.key] ? [row[column.key]] : []

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
                                control={
                                  <Checkbox
                                    checked={selected.includes(option)}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? [...selected, option]
                                        : selected.filter((v) => v !== option)
                                      updateField(column.key, next)
                                    }}
                                    size="small"
                                  />
                                }
                                key={option}
                                label={option}
                              />
                            ))}
                          </Box>
                        </FormControl>
                      )
                    }

                    // --- Requirement checkboxes ---
                    if (requirementKeys.has(column.key)) {
                      return (
                        <FormControlLabel
                          className="gip-requirement-checkbox"
                          control={
                            <Checkbox
                              checked={Boolean(row[column.key])}
                              onChange={(e) => updateField(column.key, e.target.checked)}
                              size="small"
                            />
                          }
                          key={column.key}
                          label={column.label}
                        />
                      )
                    }

                    // --- Age (readonly, computed) ---
                    if (column.key === 'age') {
                      return (
                        <TextField
                          disabled
                          helperText="Calculated from birthday"
                          key={column.key}
                          label={column.label}
                          size="small"
                          value={row.age}
                        />
                      )
                    }

                    // --- Date fields ---
                    if (column.key === 'birthday' || column.key === 'dateApplied') {
                      return (
                        <Box className="gip-date-field" key={column.key}>
                          <Typography
                            className="gip-field-label"
                            component="label"
                            htmlFor={`gip-${column.key}`}
                          >
                            {column.label}
                            {column.key === 'birthday' && <span aria-hidden="true"> *</span>}
                          </Typography>
                          <TextField
                            id={`gip-${column.key}`}
                            inputProps={{ 'aria-label': column.label }}
                            onChange={(e) => updateField(column.key, e.target.value)}
                            required={column.key === 'birthday'}
                            size="small"
                            type="date"
                            value={row[column.key]}
                          />
                        </Box>
                      )
                    }

                    // --- Everything else (plain text input) ---
                    return (
                      <TextField
                        key={column.key}
                        label={column.label}
                        onChange={(e) => updateField(column.key, e.target.value)}
                        required={column.key === 'lastName' || column.key === 'firstName'}
                        size="small"
                        value={row[column.key]}
                      />
                    )
                  })}
              </Box>
            </Box>
          ))}
      </DialogContent>

      <DialogActions className="gip-form-actions">
        <Button onClick={onClose}>Cancel</Button>
        <Button disabled={saving} onClick={onSave} variant="contained">
          {saving ? 'Saving...' : 'Save Applicant'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default GipFormDialog

// Optional: re-export for convenience
export { createEmptyRow }