const express = require('express')
const { doktorPool, withTransaction } = require('../db')
const { asyncHandler } = require('../utils/async-handler')

const router = express.Router()
const fields = {
  dateApplied: 'date_applied', lastName: 'last_name', firstName: 'first_name', middleName: 'middle_name',
  nameExtension: 'name_extension', contactNumber: 'contact_number', sex: 'sex', birthdate: 'birthdate',
  address: 'address', age: 'age', civilStatus: 'civil_status', yearsResidency: 'years_of_residency',
  premedCourse: 'premed_course', medExamResult: 'med_entrance_exam_result', medExamDate: 'med_entrance_exam_date',
  nmatResult: 'nmat_result', nmatExamDate: 'nmat_exam_date', schoolLastAttended: 'school_last_attended',
  gwa: 'gwa', awards: 'awards', gwaFirstYear: 'gwa_first_year', gwaSecondYear: 'gwa_second_year',
  gwaThirdYear: 'gwa_third_year', gwaFourthYear: 'gwa_fourth_year', gwaInternship: 'gwa_internship',
  gwaReviewForBoard: 'gwa_review_for_board', batch: 'batch',
}
const columns = Object.values(fields)
const select = ['id', ...Object.entries(fields).map(([key, column]) => `${column} AS ${key}`)].join(', ')
const clean = (body) => Object.fromEntries(Object.entries(fields).map(([key, column]) => [column, body?.[key] === '' ? null : body?.[key] ?? null]))

router.get('/', asyncHandler(async (_request, response) => {
  const [rows] = await doktorPool.query(`SELECT ${select} FROM applicants ORDER BY id`)
  response.json(rows)
}))

router.post('/', asyncHandler(async (request, response) => {
  const [result] = await doktorPool.query('INSERT INTO applicants SET ?', clean(request.body))
  const [rows] = await doktorPool.query(`SELECT ${select} FROM applicants WHERE id = ?`, [result.insertId])
  response.status(201).json(rows[0])
}))

router.put('/:id', asyncHandler(async (request, response) => {
  await doktorPool.query('UPDATE applicants SET ? WHERE id = ?', [clean(request.body), request.params.id])
  const [rows] = await doktorPool.query(`SELECT ${select} FROM applicants WHERE id = ?`, [request.params.id])
  response.json(rows[0])
}))

router.delete('/:id', asyncHandler(async (request, response) => {
  await doktorPool.query('DELETE FROM applicants WHERE id = ?', [request.params.id])
  response.status(204).end()
}))

module.exports = router
