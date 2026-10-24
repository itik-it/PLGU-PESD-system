// Mounted at /api/gip/batches
const express = require('express')

const { gipPool } = require('../db')
const { requireAdmin } = require('../auth/auth.middleware')
const {
  createBatchSchema,
  updateBatchSchema,
} = require('../schemas/batch.schema')
const { asyncHandler } = require('../utils/async-handler')
const { parseId } = require('../utils/parse-id')
const { toBatchResponse, getBatchOrFail } = require('../utils/batch.utils')
const applicantsRouter = require('./gip-applicants.routes')
const excelRouter = require('./gip-excel.routes')

const router = express.Router()

const BATCH_SELECT = `
  SELECT
    b.id, b.batch_year, b.batch_no, b.name, b.status, b.created_at,
    COUNT(ap.id) AS applicant_count
  FROM gip_batches b
  LEFT JOIN applications ap ON ap.batch_id = b.id
`

async function findBatch(batchId) {
  const [rows] = await gipPool.query(
    `${BATCH_SELECT} WHERE b.id = ? GROUP BY b.id`,
    [batchId]
  )
  return toBatchResponse(rows[0])
}

// LIST BATCHES (newest first)

router.get(
  '/',
  asyncHandler(async (_request, response) => {
    const [rows] = await gipPool.query(
      `${BATCH_SELECT}
       GROUP BY b.id
       ORDER BY b.batch_year DESC, b.batch_no DESC`
    )

    response.json(rows.map(toBatchResponse))
  })
)

// CREATE BATCH  { year }   (admin only)
// The next batch number for that year is picked by the database.

router.post(
  '/',
  requireAdmin,
  asyncHandler(async (request, response) => {
    const { year, name } = createBatchSchema.parse(request.body)

    const [result] = await gipPool.query(
      `INSERT INTO gip_batches (batch_year, batch_no, name)
       SELECT
         ?,
         COALESCE(MAX(batch_no), 0) + 1,
         COALESCE(NULLIF(?, ''), CONCAT('Batch ', COALESCE(MAX(batch_no), 0) + 1))
       FROM gip_batches
       WHERE batch_year = ?`,
      [year, name || '', year]
    )

    response.status(201).json(await findBatch(result.insertId))
  })
)

// OPEN / CLOSE BATCH  { status: 'open' | 'closed' }   (admin only)

router.patch(
  '/:batchId',
  requireAdmin,
  asyncHandler(async (request, response) => {
    const batchId = parseId(request.params.batchId, 'Batch ID')
    const { status, name } = updateBatchSchema.parse(request.body)

    await getBatchOrFail(gipPool, batchId)

    const changes = {}
    if (status) changes.status = status
    if (name) changes.name = name
    await gipPool.query('UPDATE gip_batches SET ? WHERE id = ?', [changes, batchId])

    response.json(await findBatch(batchId))
  })
)

// APPLICANTS OF ONE BATCH  ->  /api/gip/batches/:batchId/applicants

router.use('/:batchId/applicants', applicantsRouter)

// EXCEL EXPORT / IMPORT  ->  /api/gip/batches/:batchId/export, /import

router.use('/:batchId', excelRouter)

module.exports = router
