// Mounted at /api/gip/batches/:batchId
// Excel export and import for ONE batch. Admin and staff may both use these.
const express = require('express')
const multer = require('multer')

const { gipPool, withTransaction } = require('../db')
const { HttpError } = require('../errors')
const { importApplicantSchema } = require('../schemas/import-applicant.schema')
const { importCommitSchema } = require('../schemas/import.schema')
const { asyncHandler } = require('../utils/async-handler')
const { listBatchApplicants } = require('../utils/applicant-list')
const { insertApplicant } = require('../utils/applicant-save')
const { getBatchOrFail } = require('../utils/batch.utils')
const { buildGipWorkbook } = require('../utils/gip-export')
const {
  buildImportPreview,
  findExistingPeople,
  personKey,
} = require('../utils/gip-import')
const { parseId } = require('../utils/parse-id')

const router = express.Router({ mergeParams: true })

const XLSX_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// Uploads are kept in memory (max 5 MB, .xlsx only) and never written to disk.
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
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'The file is too large (maximum 5 MB).'
          : 'The file could not be uploaded.'
      next(new HttpError(400, message))
      return
    }
    next(error)
  })
}

// EXPORT THE BATCH AS THE OFFICIAL EXCEL FORM

router.get(
  '/export',
  asyncHandler(async (request, response) => {
    const batchId = parseId(request.params.batchId, 'Batch ID')
    const batch = await getBatchOrFail(gipPool, batchId)

    const applicants = await listBatchApplicants(gipPool, batchId)
    const file = await buildGipWorkbook({ batch, applicants })

    // Personal data leaves the system here, so keep a trace of who did it.
    console.log(
      `[export] ${request.user.username} exported "${batch.name}" (${applicants.length} rows)`
    )

    const fileName = `${batch.name.replace(/[^A-Za-z0-9 -]/g, '')}.xlsx`

    response.setHeader('Content-Type', XLSX_TYPE)
    response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    response.send(Buffer.from(file))
  })
)

// IMPORT STEP 1: read the uploaded file and show what would happen.
// Nothing is saved.

router.post(
  '/import/preview',
  receiveFile,
  asyncHandler(async (request, response) => {
    const batchId = parseId(request.params.batchId, 'Batch ID')
    await getBatchOrFail(gipPool, batchId, { requireOpen: true })

    if (!request.file) {
      throw new HttpError(400, 'Choose an .xlsx file to upload.')
    }

    response.json(await buildImportPreview(gipPool, request.file.buffer))
  })
)

// IMPORT STEP 2: save the rows the user confirmed.
// Everything is checked again here, and it is all-or-nothing.

router.post(
  '/import',
  asyncHandler(async (request, response) => {
    const batchId = parseId(request.params.batchId, 'Batch ID')
    const { rows } = importCommitSchema.parse(request.body)

    const result = await withTransaction(gipPool, async (connection) => {
      await getBatchOrFail(connection, batchId, { requireOpen: true })

      const people = rows.map((row, index) => {
        const parsed = importApplicantSchema.safeParse(row)

        if (!parsed.success) {
          throw new HttpError(400, `Row ${index + 1}: ${parsed.error.issues[0].message}`)
        }

        return parsed.data
      })

      const existing = await findExistingPeople(connection, people)
      const seen = new Set()
      let imported = 0
      let skipped = 0

      for (const person of people) {
        const key = personKey(person.lastName, person.firstName, person.birthdate)

        if (existing.has(key) || seen.has(key)) {
          skipped += 1
          continue
        }

        seen.add(key)
        await insertApplicant(connection, batchId, person)
        imported += 1
      }

      return { imported, skipped }
    })

    console.log(
      `[import] ${request.user.username} imported ${result.imported} row(s) into batch ${batchId} (${result.skipped} skipped)`
    )

    response.json({
      message: `Imported ${result.imported} applicant(s).`,
      ...result,
    })
  })
)

module.exports = router
