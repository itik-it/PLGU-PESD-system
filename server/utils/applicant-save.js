// Shared by the applicant routes and the Excel import.
const requirementMap = require('../constants/requirement-map')
const { HttpError } = require('../errors')
const { calculateAge } = require('./applicant.utils')

// Maps validated form data to `applicants` table columns.
function toApplicantRow(applicant) {
  return {
    last_name: applicant.lastName,
    first_name: applicant.firstName,
    middle_name: applicant.middleName || null,
    name_extension: applicant.extensionName || null,
    birthdate: applicant.birthdate,
    age: calculateAge(applicant.birthdate),
    sex: applicant.sex,
    civil_status: applicant.civilStatus,
    barangay: applicant.barangay,
    municipality: applicant.municipality,
    province: applicant.province,
    course: applicant.course || null,
    email: applicant.email || null,
    contact_number: applicant.contactNumber || null,
  }
}

// Classifications may be empty (Excel import allows it).
async function saveClassifications(connection, applicantId, names) {
  if (!names.length) return

  // One lookup instead of one query per name
  const [classificationRows] = await connection.query(
    `SELECT id, classification_name
     FROM classifications
     WHERE is_active = TRUE AND classification_name IN (?)`,
    [names]
  )

  const found = new Map(
    classificationRows.map((row) => [
      row.classification_name.toLowerCase(),
      row.id,
    ])
  )

  const invalid = names.filter((name) => !found.has(name.toLowerCase()))

  if (invalid.length) {
    throw new HttpError(400, `Invalid classification: ${invalid.join(', ')}`)
  }

  const classificationIds = [
    ...new Set(names.map((name) => found.get(name.toLowerCase()))),
  ]

  await connection.query(
    `INSERT INTO applicant_classifications (applicant_id, classification_id)
     VALUES ?`,
    [classificationIds.map((id) => [applicantId, id])]
  )
}

/**
 * Saves classifications, requirements and supporting documents.
 * With `replace: true` the old rows are deleted first (used by PUT).
 */
async function saveApplicationDetails(
  connection,
  { applicantId, applicationId, data, replace = false }
) {
  if (replace) {
    await connection.query(
      'DELETE FROM applicant_classifications WHERE applicant_id = ?',
      [applicantId]
    )
    await connection.query(
      'DELETE FROM application_requirements WHERE application_id = ?',
      [applicationId]
    )
    await connection.query(
      'DELETE FROM application_supporting_documents WHERE application_id = ?',
      [applicationId]
    )
  }

  await saveClassifications(connection, applicantId, data.classifications)

  // REQUIREMENTS (matched by name, using constants/requirement-map.js)
  const [typeRows] = await connection.query(
    `SELECT id, requirement_name
     FROM requirement_types
     WHERE is_active = TRUE AND requirement_name IN (?)`,
    [Object.values(requirementMap)]
  )
  const typeIdByName = new Map(
    typeRows.map((row) => [row.requirement_name, row.id])
  )

  const requirementValues = Object.entries(requirementMap).map(
    ([key, requirementName]) => {
      const typeId = typeIdByName.get(requirementName)

      if (!typeId) {
        // Server-side setup problem, so this stays a 500 on purpose.
        throw new Error(`Requirement type not found: ${requirementName}`)
      }

      const checked = data.requirements[key] === true

      return [
        applicationId,
        typeId,
        checked ? 'Submitted' : 'Pending',
        checked ? new Date() : null,
      ]
    }
  )

  await connection.query(
    `INSERT INTO application_requirements
       (application_id, requirement_type_id, status, submitted_at)
     VALUES ?`,
    [requirementValues]
  )

  // SUPPORTING DOCUMENTS
  if (data.supportingDocuments) {
    await connection.query(
      `INSERT INTO application_supporting_documents
         (application_id, document_description)
       VALUES (?, ?)`,
      [applicationId, data.supportingDocuments]
    )
  }
}

// Creates the person, their application in this batch, and all the details.
async function insertApplicant(connection, batchId, data) {
  const [applicantResult] = await connection.query(
    'INSERT INTO applicants SET ?',
    [toApplicantRow(data)]
  )
  const applicantId = applicantResult.insertId

  const [applicationResult] = await connection.query(
    'INSERT INTO applications SET ?',
    [
      {
        applicant_id: applicantId,
        batch_id: batchId,
        date_applied: data.dateApplied || null,
        remarks: data.remarks || null,
      },
    ]
  )
  const applicationId = applicationResult.insertId

  await saveApplicationDetails(connection, { applicantId, applicationId, data })

  return { applicantId, applicationId }
}

module.exports = { toApplicantRow, saveApplicationDetails, insertApplicant }
