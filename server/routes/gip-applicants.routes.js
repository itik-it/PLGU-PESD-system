// Mounted at /api/gip/batches/:batchId/applicants
// Every route here works on ONE batch only.
const express = require('express')

const requirementMap = require('../constants/requirement-map')
const { gipPool, withTransaction } = require('../db')
const { HttpError } = require('../errors')
const { requireAdmin } = require('../auth/auth.middleware')
const { applicantSchema } = require('../schemas/applicant.schema')
const { asyncHandler } = require('../utils/async-handler')
const { calculateAge } = require('../utils/applicant.utils')
const { getBatchOrFail } = require('../utils/batch.utils')
const { parseId } = require('../utils/parse-id')

// mergeParams lets this router see :batchId from the parent route.
const router = express.Router({ mergeParams: true })

// HELPERS

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

/**
 * Saves classifications, requirements and supporting documents.
 * Shared by POST and PUT. With `replace: true` the old rows are deleted first.
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

  // CLASSIFICATIONS (one lookup instead of one query per name)
  const [classificationRows] = await connection.query(
    `SELECT id, classification_name
     FROM classifications
     WHERE is_active = TRUE AND classification_name IN (?)`,
    [data.classifications]
  )

  const found = new Map(
    classificationRows.map((row) => [
      row.classification_name.toLowerCase(),
      row.id,
    ])
  )

  const invalid = data.classifications.filter(
    (name) => !found.has(name.toLowerCase())
  )

  if (invalid.length) {
    throw new HttpError(400, `Invalid classification: ${invalid.join(', ')}`)
  }

  const classificationIds = [
    ...new Set(data.classifications.map((n) => found.get(n.toLowerCase()))),
  ]

  await connection.query(
    `INSERT INTO applicant_classifications (applicant_id, classification_id)
     VALUES ?`,
    [classificationIds.map((id) => [applicantId, id])]
  )

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

// LIST APPLICANTS OF THIS BATCH

router.get(
  '/',
  asyncHandler(async (request, response) => {
    const batchId = parseId(request.params.batchId, 'Batch ID')
    await getBatchOrFail(gipPool, batchId)

    const [applicants] = await gipPool.query(
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
    const [classificationRows] = await gipPool.query(
      `SELECT ac.applicant_id, c.classification_name
       FROM applicant_classifications ac
       INNER JOIN classifications c ON c.id = ac.classification_id
       INNER JOIN applications ap ON ap.applicant_id = ac.applicant_id
       WHERE ap.batch_id = ?
       ORDER BY c.id`,
      [batchId]
    )

    const [requirementRows] = await gipPool.query(
      `SELECT ar.application_id, rt.requirement_name, ar.status
       FROM application_requirements ar
       INNER JOIN requirement_types rt ON rt.id = ar.requirement_type_id
       INNER JOIN applications ap ON ap.id = ar.application_id
       WHERE ap.batch_id = ?
       ORDER BY rt.id`,
      [batchId]
    )

    const [supportingRows] = await gipPool.query(
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
        supportingByApplication.set(
          row.application_id,
          row.document_description
        )
      }
    }

    const result = applicants.map((applicant) => {
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

    response.json(result)
  })
)

// ADD APPLICANT TO THIS BATCH (batch must be open)

router.post(
  '/',
  asyncHandler(async (request, response) => {
    const batchId = parseId(request.params.batchId, 'Batch ID')
    const data = applicantSchema.parse(request.body)

    const { applicantId, applicationId } = await withTransaction(
      gipPool,
      async (connection) => {
        await getBatchOrFail(connection, batchId, { requireOpen: true })

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

        await saveApplicationDetails(connection, {
          applicantId,
          applicationId,
          data,
        })

        return { applicantId, applicationId }
      }
    )

    response.status(201).json({
      message: 'Applicant created successfully.',
      applicantId,
      applicationId,
    })
  })
)

// UPDATE AN APPLICANT IN THIS BATCH (batch must be open)

router.put(
  '/:id',
  asyncHandler(async (request, response) => {
    const batchId = parseId(request.params.batchId, 'Batch ID')
    const applicantId = parseId(request.params.id, 'Applicant ID')
    const data = applicantSchema.parse(request.body)

    const applicationId = await withTransaction(
      gipPool,
      async (connection) => {
        await getBatchOrFail(connection, batchId, { requireOpen: true })

        const [existing] = await connection.query(
          'SELECT id FROM applicants WHERE id = ? FOR UPDATE',
          [applicantId]
        )

        if (!existing.length) {
          throw new HttpError(404, 'Applicant not found.')
        }

        const [applicationRows] = await connection.query(
          'SELECT id FROM applications WHERE applicant_id = ? AND batch_id = ?',
          [applicantId, batchId]
        )

        if (!applicationRows.length) {
          throw new HttpError(404, 'Applicant not found in this batch.')
        }

        const applicationId = applicationRows[0].id

        await connection.query('UPDATE applicants SET ? WHERE id = ?', [
          toApplicantRow(data),
          applicantId,
        ])

        await connection.query(
          'UPDATE applications SET date_applied = ?, remarks = ? WHERE id = ?',
          [data.dateApplied || null, data.remarks || null, applicationId]
        )

        await saveApplicationDetails(connection, {
          applicantId,
          applicationId,
          data,
          replace: true,
        })

        return applicationId
      }
    )

    response.json({
      message: 'Applicant updated successfully.',
      applicantId,
      applicationId,
    })
  })
)

// REMOVE AN APPLICANT FROM THIS BATCH (admin only, batch must be open)
//
// Only this batch's application is deleted. The person's record is deleted
// too only if they have no application left in any other batch.

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (request, response) => {
    const batchId = parseId(request.params.batchId, 'Batch ID')
    const applicantId = parseId(request.params.id, 'Applicant ID')

    await withTransaction(gipPool, async (connection) => {
      await getBatchOrFail(connection, batchId, { requireOpen: true })

      const [result] = await connection.query(
        'DELETE FROM applications WHERE applicant_id = ? AND batch_id = ?',
        [applicantId, batchId]
      )

      if (!result.affectedRows) {
        throw new HttpError(404, 'Applicant not found in this batch.')
      }

      const [remaining] = await connection.query(
        'SELECT id FROM applications WHERE applicant_id = ? LIMIT 1',
        [applicantId]
      )

      if (!remaining.length) {
        await connection.query('DELETE FROM applicants WHERE id = ?', [
          applicantId,
        ])
      }
    })

    response.status(204).end()
  })
)

module.exports = router
