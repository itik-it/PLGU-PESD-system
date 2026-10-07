import {
  Box, Chip, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow,
} from '@mui/material'
import { columns, groupLabels, requirementKeys } from '../gipSettings'
import { displayValue, formatDate } from '../gipHelpers'

function GipTable({ rows, loading, search, onRowClick, onEdit, onDelete }) {
  return (
    <TableContainer className="gip-table-container">
      <Table stickyHeader aria-label="GIP beneficiary records" className="gip-table" size="small">
        <TableHead>
          <TableRow>
            {Object.entries(groupLabels).map(([group, label]) => (
              <TableCell
                align="center"
                colSpan={columns.filter((c) => c.group === group).length}
                key={group}
                className="gip-group-header"
              >
                {label}
              </TableCell>
            ))}
            <TableCell align="center" className="gip-group-header">ACTIONS</TableCell>
          </TableRow>
          <TableRow>
            {columns.map((c) => (
              <TableCell className="gip-column-header" key={c.key}>{c.label}</TableCell>
            ))}
            <TableCell className="gip-column-header">Manage</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell align="center" colSpan={columns.length + 1}>
                Loading applicants...
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell align="center" colSpan={columns.length + 1}>
                {search
                  ? 'No applicants match your search.'
                  : 'No applicants yet. Add an applicant to begin.'}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                hover
                className="gip-data-row"
                key={row.id}
                onClick={() => onRowClick(row)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onRowClick(row)
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
                          {Array.isArray(row[column.key]) && row[column.key].length
                            ? row[column.key].map((status) => (
                                <Chip
                                  className="gip-employment-chip"
                                  key={status}
                                  label={status}
                                  size="small"
                                />
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

                <TableCell
                  className="gip-actions-cell"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconButton
                    aria-label="Edit applicant"
                    color="primary"
                    onClick={() => onEdit(row)}
                    size="small"
                  >
                    <span aria-hidden="true">✎</span>
                  </IconButton>
                  <IconButton
                    aria-label="Delete applicant"
                    color="error"
                    onClick={() => onDelete(row)}
                    size="small"
                  >
                    <span aria-hidden="true">×</span>
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default GipTable