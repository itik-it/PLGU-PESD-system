const { HttpError } = require('../errors')

// Shape sent to the browser.
function toBatchResponse(row) {
  return {
    id: row.id,
    year: row.batch_year,
    batchNo: row.batch_no,
    name: row.name,
    status: row.status,
    applicantCount: Number(row.applicant_count ?? 0),
    createdAt: row.created_at,
  }
}

/**
 * Loads a batch or throws 404.
 * With `requireOpen: true` it also throws 409 when the batch is closed,
 * so a closed batch can never be changed by accident.
 *
 * `executor` is gipPool or a transaction connection (both have .query).
 */
async function getBatchOrFail(executor, batchId, { requireOpen = false } = {}) {
  const [rows] = await executor.query(
    'SELECT id, status, name, batch_year FROM gip_batches WHERE id = ?',
    [batchId]
  )

  if (!rows.length) {
    throw new HttpError(404, 'Batch not found.')
  }

  if (requireOpen && rows[0].status !== 'open') {
    throw new HttpError(
      409,
      'This batch is closed. Ask an administrator to reopen it.'
    )
  }

  return rows[0]
}

module.exports = { toBatchResponse, getBatchOrFail }
