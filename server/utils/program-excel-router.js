// Excel export / import routes shared by GUWIP, DOKTOR, TRPATU and SAGUT.
// Mounted by createBatchesRouter at /api/<program>/batches/:batchId  ->  /export, /import/preview, /import
// `excel` = { list(executor, batchId) -> rows, insert(connection, batchId, data) }
const express = require('express')
const multer = require('multer')

const { withTransaction } = require('../db')
const { HttpError } = require('../errors')
const { importCommitSchema } = require('../schemas/import.schema')
const { asyncHandler } = require('./async-handler')
const { parseId } = require('./parse-id')
const { buildProgramWorkbook, buildImportPreview, prepareImport } = require('./program-excel')

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// Uploads stay in memory (max 5 MB, .xlsx only).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!/\.xlsx$/i.test(file.originalname)) {
      callback(new HttpError(400, 'Only .xlsx files are supported.'))
      return
    }
    callback(null, true)
  },
})

function receiveFile(request, response, next) {
  upload.single('file')(request, response, (error) => {
    if (error instanceof multer.MulterError) {
      next(new HttpError(400, error.code === 'LIMIT_FILE_SIZE' ? 'The file is too large (maximum 5 MB).' : 'The file could not be uploaded.'))
      return
    }
    next(error)
  })
}

function createExcelRouter({ pool, programKey, excel, getBatchOrFail }) {
  const router = express.Router({ mergeParams: true })
  const batchIdOf = (request) => parseId(request.params.batchId, 'Batch ID')

  // EXPORT the batch into the program's Excel template
  router.get('/export', asyncHandler(async (request, response) => {
    const batchId = batchIdOf(request)
    const batch = await getBatchOrFail(pool, batchId)
    const rows = await excel.list(pool, batchId)
    const file = await buildProgramWorkbook({ programKey, batch, rows, role: request.user.role })

    // Personal data leaves the system here, so keep a trace of who did it.
    console.log(`[export] ${request.user.username} exported "${batch.name}" (${rows.length} rows)`)

    const fileName = `${batch.name.replace(/[^A-Za-z0-9 -]/g, '')}.xlsx`
    response.setHeader('Content-Type', XLSX_TYPE)
    response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    response.send(Buffer.from(file))
  }))

  // IMPORT step 1: read the file and show what would happen. Nothing is saved.
  router.post('/import/preview', receiveFile, asyncHandler(async (request, response) => {
    const batchId = batchIdOf(request)
    await getBatchOrFail(pool, batchId, { requireOpen: true })
    if (!request.file) throw new HttpError(400, 'Choose an .xlsx file to upload.')

    const existing = await excel.list(pool, batchId)
    response.json(await buildImportPreview(programKey, request.file.buffer, existing))
  }))

  // IMPORT step 2: save the rows the user confirmed (all-or-nothing, checked again here).
  router.post('/import', asyncHandler(async (request, response) => {
    const batchId = batchIdOf(request)
    const { rows } = importCommitSchema.parse(request.body)

    const result = await withTransaction(pool, async (connection) => {
      await getBatchOrFail(connection, batchId, { requireOpen: true })
      const existing = await excel.list(connection, batchId)
      const { accepted, skipped } = prepareImport(programKey, rows, existing)
      for (const data of accepted) await excel.insert(connection, batchId, data)
      return { imported: accepted.length, skipped }
    })

    console.log(`[import] ${request.user.username} imported ${result.imported} row(s) into ${programKey} batch ${batchId} (${result.skipped} skipped)`)
    response.json({ message: `Imported ${result.imported} applicant(s).`, ...result })
  }))

  return router
}

module.exports = { createExcelRouter }
