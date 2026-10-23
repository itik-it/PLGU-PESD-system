// Shared batch logic for DOKTOR, GUWIP and TRPATU.
// Each of those databases has its own `batches` table and `applicants.batch_id`.
// (GIP keeps its own gip_batches code.)
const express = require('express')

const { requireAdmin } = require('../auth/auth.middleware')
const { HttpError } = require('../errors')
const {
  createBatchSchema,
  updateBatchSchema,
} = require('../schemas/batch.schema')
const { asyncHandler } = require('./async-handler')
const { parseId } = require('./parse-id')
const { toBatchResponse } = require('./batch.utils')

const batchSelect = (recordsTable) => `
  SELECT
    b.id, b.batch_year, b.batch_no, b.name, b.status, b.created_at,
    COUNT(a.id) AS applicant_count
  FROM batches b
  LEFT JOIN ${recordsTable} a ON a.batch_id = b.id
`

/**
 * Loads a batch or throws 404.
 * With `requireOpen: true` it also throws 409 when the batch is closed.
 * `executor` is a pool or a transaction connection (both have .query).
 */
async function getBatchOrFail(executor, batchId, { requireOpen = false } = {}) {
  const [rows] = await executor.query(
    'SELECT id, status, name, batch_year FROM batches WHERE id = ?',
    [batchId]
  )

  if (!rows.length) throw new HttpError(404, 'Batch not found.')

  if (requireOpen && rows[0].status !== 'open') {
    throw new HttpError(
      409,
      'This batch is closed. Ask an administrator to reopen it.'
    )
  }

  return rows[0]
}

/**
 * Builds the router for  /batches  and  /batches/:batchId/applicants
 *   pool            the program's MySQL pool (doktorPool, guwipPool, ...)
 *   program         prefix for generated names, e.g. 'DOKTOR' -> "DOKTOR 2026 - Batch 1"
 *   applicantsRouter  router created with express.Router({ mergeParams: true })
 */
function createBatchesRouter({ pool, program, applicantsRouter, recordsTable = 'applicants' }) {
  const router = express.Router()

  const findBatch = async (batchId) => {
    const [rows] = await pool.query(
      `${batchSelect(recordsTable)} WHERE b.id = ? GROUP BY b.id`,
      [batchId]
    )
    return toBatchResponse(rows[0])
  }

  // LIST (newest first)
  router.get(
    '/',
    asyncHandler(async (_request, response) => {
      const [rows] = await pool.query(
        `${batchSelect(recordsTable)}
         GROUP BY b.id
         ORDER BY b.batch_year DESC, b.batch_no DESC`
      )
      response.json(rows.map(toBatchResponse))
    })
  )

  // CREATE  { year }  (admin only) - the database picks the next batch number
  router.post(
    '/',
    requireAdmin,
    asyncHandler(async (request, response) => {
      const { year, name } = createBatchSchema.parse(request.body)

      const [result] = await pool.query(
        `INSERT INTO batches (batch_year, batch_no, name)
         SELECT
           ?,
           COALESCE(MAX(batch_no), 0) + 1,
           COALESCE(NULLIF(?, ''), CONCAT('Batch ', COALESCE(MAX(batch_no), 0) + 1))
         FROM batches
         WHERE batch_year = ?`,
        [year, name || '', year]
      )

      response.status(201).json(await findBatch(result.insertId))
    })
  )

  // OPEN / CLOSE  { status: 'open' | 'closed' }  (admin only)
  router.patch(
    '/:batchId',
    requireAdmin,
    asyncHandler(async (request, response) => {
      const batchId = parseId(request.params.batchId, 'Batch ID')
      const { status, name } = updateBatchSchema.parse(request.body)

      await getBatchOrFail(pool, batchId)
      const changes = {}
      if (status) changes.status = status
      if (name) changes.name = name
      await pool.query('UPDATE batches SET ? WHERE id = ?', [changes, batchId])

      response.json(await findBatch(batchId))
    })
  )

  router.use('/:batchId/applicants', applicantsRouter)

  return router
}

module.exports = { createBatchesRouter, getBatchOrFail }
