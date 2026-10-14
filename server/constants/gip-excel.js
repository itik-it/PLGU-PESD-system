// Layout of the official GIP Excel form (templates/gip-template.xlsx).
// The export always writes people from FIRST_DATA_ROW (the form's design).
// Columns are 1-based: A = 1, B = 2, ... AI = 35.

const FIRST_DATA_ROW = 11

// The template has 176 pre-formatted data rows (11 to 186).
const LAST_TEMPLATE_ROW = 186

const MARK = '✓'

// Characters we accept as a "checked" mark when importing.
const MARK_CHARACTERS = ['✓', '✔', '☑', '√', '✅', '/']

const COLUMNS = {
  no: 2,
  lastName: 3,
  firstName: 4,
  middleName: 5,
  extensionName: 6,
  birthdate: 7,
  barangay: 8,
  municipality: 9,
  province: 10,
  course: 11,
  email: 12,
  contactNumber: 13,
  sex: 14,
  civilStatus: 15,
  age: 16,
  remarks: 17,
  supportingDocuments: 30,
  dateApplied: 35,
}

// Each requirement sits in a merged 2-column cell. We use the first column.
const REQUIREMENT_COLUMNS = {
  gipForm: 18,
  resume: 20,
  validId: 22,
  psa: 24,
  diploma: 26,
  tor: 28,
}

// Names must match classifications.classification_name in the database.
const CLASSIFICATION_COLUMNS = [
  { column: 32, name: 'Fresh Graduate' },
  { column: 33, name: 'First Time Job Seeker' },
  { column: 34, name: 'Young Professional' },
]

// First column of every merged pair in a data row (R:S, T:U, ... AD:AE).
const MERGED_PAIR_STARTS = [18, 20, 22, 24, 26, 28, 30]

// Import looks for the header row ("Last Name", "First Name", ...) in the
// first rows of the sheet. The people start on the row after it.
// If there is no header row, the people start on row 1.
const HEADER_SEARCH_ROWS = 30

const MAX_IMPORT_ROWS = 1000

module.exports = {
  FIRST_DATA_ROW,
  LAST_TEMPLATE_ROW,
  MARK,
  MARK_CHARACTERS,
  COLUMNS,
  REQUIREMENT_COLUMNS,
  CLASSIFICATION_COLUMNS,
  MERGED_PAIR_STARTS,
  HEADER_SEARCH_ROWS,
  MAX_IMPORT_ROWS,
}
