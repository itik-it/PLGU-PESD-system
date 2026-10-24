// Mounted at /api/doktor (requireAuth is applied in app.js)
//   /batches                         list / create / open-close
//   /batches/:batchId/applicants     applicants of ONE batch
const express = require('express')
const { doktorPool } = require('../db')
const { requireAdmin } = require('../auth/auth.middleware')
const { HttpError } = require('../errors')
const { asyncHandler } = require('../utils/async-handler')
const { parseId } = require('../utils/parse-id')
const { createBatchesRouter, getBatchOrFail } = require('../utils/program-batches')

const fields = {
  dateApplied: 'date_applied', lastName: 'last_name', firstName: 'first_name', middleName: 'middle_name',
  nameExtension: 'name_extension', contactNumber: 'contact_number', sex: 'sex', birthdate: 'birthdate',
  address: 'address', age: 'age', civilStatus: 'civil_status', yearsResidency: 'years_of_residency',
  premedCourse: 'premed_course', medExamResult: 'med_entrance_exam_result', medExamDate: 'med_entrance_exam_date',
  nmatResult: 'nmat_result', nmatExamDate: 'nmat_exam_date', schoolLastAttended: 'school_last_attended',
  gwa: 'gwa', awards: 'awards', gwaFirstYear: 'gwa_first_year', gwaSecondYear: 'gwa_second_year',
  gwaThirdYear: 'gwa_third_year', gwaFourthYear: 'gwa_fourth_year', gwaInternship: 'gwa_internship',
  gwaReviewForBoard: 'gwa_review_for_board',
  employmentStatus: 'employment_status', placeOfWork: 'place_of_work',
}
const select = ['id', ...Object.entries(fields).map(([key, column]) => `${column} AS ${key}`)].join(', ')
const clean = (body) => Object.fromEntries(Object.entries(fields).map(([key, column]) => [column, body?.[key] === '' ? null : body?.[key] ?? null]))

const batchIdOf = (request) => parseId(request.params.batchId, 'Batch ID')

async function findOne(id, batchId) {
  const [rows] = await doktorPool.query(`SELECT ${select} FROM applicants WHERE id = ? AND batch_id = ?`, [id, batchId])
  if (!rows.length) throw new HttpError(404, 'Applicant not found in this batch.')
  return rows[0]
}

// mergeParams lets this router see :batchId from the parent route.
const applicants = express.Router({ mergeParams: true })

applicants.get('/', asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  await getBatchOrFail(doktorPool, batchId)
  const [rows] = await doktorPool.query(`SELECT ${select} FROM applicants WHERE batch_id = ? ORDER BY id`, [batchId])
  response.json(rows)
}))

applicants.post('/', asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  await getBatchOrFail(doktorPool, batchId, { requireOpen: true })
  const [result] = await doktorPool.query('INSERT INTO applicants SET ?', { ...clean(request.body), batch_id: batchId })
  response.status(201).json(await findOne(result.insertId, batchId))
}))

applicants.put('/:id', asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  const id = parseId(request.params.id, 'Applicant ID')
  await getBatchOrFail(doktorPool, batchId, { requireOpen: true })
  await doktorPool.query('UPDATE applicants SET ? WHERE id = ? AND batch_id = ?', [clean(request.body), id, batchId])
  response.json(await findOne(id, batchId))
}))

applicants.delete('/:id', requireAdmin, asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  const id = parseId(request.params.id, 'Applicant ID')
  await getBatchOrFail(doktorPool, batchId, { requireOpen: true })
  const [result] = await doktorPool.query('DELETE FROM applicants WHERE id = ? AND batch_id = ?', [id, batchId])
  if (!result.affectedRows) throw new HttpError(404, 'Applicant not found in this batch.')
  response.status(204).end()
}))

// Used by the Excel export / import (utils/program-excel-router.js).
const excel = {
  list: async (executor, batchId) => {
    const [rows] = await executor.query(`SELECT ${select} FROM applicants WHERE batch_id = ? ORDER BY id`, [batchId])
    return rows
  },
  insert: (connection, batchId, data) =>
    connection.query('INSERT INTO applicants SET ?', { ...clean(data), batch_id: batchId }),
}

const router = express.Router()
router.use('/batches', createBatchesRouter({ pool: doktorPool, program: 'DOKTOR', applicantsRouter: applicants, excel }))

module.exports = router
