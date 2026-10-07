export const columns = [
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

export const employmentOptions = [
  'Fresh Graduate',
  'First Time Job Seeker',
  'Young Professional',
]

export const groupLabels = {
  beneficiary: 'BENEFICIARY INFORMATION',
  requirements: 'REQUIREMENTS',
  employment: 'CURRENT EMPLOYMENT',
}

export const formGroupDescriptions = {
  beneficiary: 'Personal and contact information',
  requirements: 'Documents submitted by the applicant',
  employment: 'Employment history and application details',
}

export const requirementKeys = new Set(
  columns
    .filter((c) => c.group === 'requirements' && c.key !== 'supportingDocs')
    .map((c) => c.key),
)

// A blank row for the "Add New" form
export const createEmptyRow = (id = null) =>
  columns.reduce((row, column) => {
    if (column.key === 'employmentStatus') row[column.key] = []
    else if (requirementKeys.has(column.key)) row[column.key] = false
    else row[column.key] = ''
    return row
  }, { id })