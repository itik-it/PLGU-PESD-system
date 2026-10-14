// Loads every applicant of ONE batch in the shape the frontend expects.
// Shared by the applicants list route and the Excel export.
const requirementMap = require('../constants/requirement-map')

async function listBatchApplicants(executor, batchId) {
  const [applicants] = await executor.query(
    `SELECT
       a.id, a.last_name, a.first_name, a.middle_name, a.name_extension,
       a.birthdate, a.age, a.sex, a.civil_status,
       a.barangay, a.municipality, a.province,
       a.course, a.email, a.contact_number,
       ap.id AS application_id, ap.date_applied, ap.remarks
     FROM applications ap
     INNER JOIN applicants a ON a.id = ap.applicant_id
     WHERE ap.batch_id = ?
     ORDER BY ap.id DESC`,
    [batchId]
  )

  // Only this batch's rows are loaded (not the whole database).
  const [classificationRows] = await executor.query(
    `SELECT ac.applicant_id, c.classification_name
     FROM applicant_classifications ac
     INNER JOIN classifications c ON c.id = ac.classification_id
     INNER JOIN applications ap ON ap.applicant_id = ac.applicant_id
     WHERE ap.batch_id = ?
     ORDER BY c.id`,
    [batchId]
  )

  const [requirementRows] = await executor.query(
    `SELECT ar.application_id, rt.requirement_name, ar.status
     FROM application_requirements ar
     INNER JOIN requirement_types rt ON rt.id = ar.requirement_type_id
     INNER JOIN applications ap ON ap.id = ar.application_id
     WHERE ap.batch_id = ?
     ORDER BY rt.id`,
    [batchId]
  )

  const [supportingRows] = await executor.query(
    `SELECT sd.application_id, sd.document_description
     FROM application_supporting_documents sd
     INNER JOIN applications ap ON ap.id = sd.application_id
     WHERE ap.batch_id = ?`,
    [batchId]
  )

  // Group once, then look up per applicant (no repeated filtering).
  const classificationsByApplicant = new Map()
  for (const row of classificationRows) {
    if (!classificationsByApplicant.has(row.applicant_id)) {
      classificationsByApplicant.set(row.applicant_id, [])
    }
    classificationsByApplicant
      .get(row.applicant_id)
      .push(row.classification_name)
  }

  const submittedByApplication = new Map()
  for (const row of requirementRows) {
    if (!submittedByApplication.has(row.application_id)) {
      submittedByApplication.set(row.application_id, new Set())
    }
    if (row.status === 'Submitted') {
      submittedByApplication.get(row.application_id).add(row.requirement_name)
    }
  }

  const supportingByApplication = new Map()
  for (const row of supportingRows) {
    if (!supportingByApplication.has(row.application_id)) {
      supportingByApplication.set(row.application_id, row.document_description)
    }
  }

  return applicants.map((applicant) => {
    const submitted =
      submittedByApplication.get(applicant.application_id) || new Set()

    const requirements = {}
    for (const [key, requirementName] of Object.entries(requirementMap)) {
      requirements[key] = submitted.has(requirementName)
    }

    return {
      id: applicant.id,
      lastName: applicant.last_name,
      firstName: applicant.first_name,
      middleName: applicant.middle_name || '',
      extensionName: applicant.name_extension || '',
      birthdate: applicant.birthdate,
      age: applicant.age,
      sex: applicant.sex,
      civilStatus: applicant.civil_status,
      barangay: applicant.barangay,
      municipality: applicant.municipality,
      province: applicant.province,
      course: applicant.course || '',
      email: applicant.email || '',
      contactNumber: applicant.contact_number || '',
      classifications: classificationsByApplicant.get(applicant.id) || [],
      applicationId: applicant.application_id,
      batchId,
      dateApplied: applicant.date_applied || '',
      remarks: applicant.remarks || '',
      requirements,
      supportingDocuments:
        supportingByApplication.get(applicant.application_id) || '',
    }
  })
}

module.exports = { listBatchApplicants }
