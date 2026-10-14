// Mounted at /api/gip/batches/:batchId/applicants
// Every route here works on ONE batch only.
const express = require('express')

const { gipPool, withTransaction } = require('../db')
const { HttpError } = require('../errors')
const { requireAdmin } = require('../auth/auth.middleware')
const { applicantSchema } = require('../schemas/applicant.schema')
const { asyncHandler } = require('../utils/async-handler')
const { listBatchApplicants } = require('../utils/applicant-list')
const {
  toApplicantRow,
  saveApplicationDetails,
  insertApplicant,
} = require('../utils/applicant-save')
const { getBatchOrFail } = require('../utils/batch.utils')
const { parseId } = require('../utils/parse-id')

// mergeParams lets this router see :batchId from the parent route.
const router = express.Router({ mergeParams: true })

// LIST APPLICANTS OF THIS BATCH

router.get(
  '/',
  asyncHandler(async (request, response) => {
    const batchId = parseId(request.params.batchId, 'Batch ID')
    await getBatchOrFail(gipPool, batchId)

    response.json(await listBatchApplicants(gipPool, batchId))
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

        return insertApplicant(connection, batchId, data)
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
