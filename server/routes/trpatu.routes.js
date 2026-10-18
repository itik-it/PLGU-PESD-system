const express = require('express')
const { trpatuPool, withTransaction } = require('../db')
const { asyncHandler } = require('../utils/async-handler')

const router = express.Router()
const applicantFields = {
  lastName: 'last_name', firstName: 'first_name', middleName: 'middle_name', nameExtension: 'name_extension',
  birthdate: 'birthdate', address: 'address', idType: 'id_type', idNumber: 'id_number', contactNumber: 'contact_number',
  occupation: 'occupation', sex: 'sex', civilStatus: 'civil_status', averageMonthlyIncome: 'average_monthly_income', remarks: 'remarks',
}
const beneficiaryFields = {
  beneficiaryType: 'beneficiary_type', beneficiaryFirstName: 'first_name', beneficiaryMiddleName: 'middle_name',
  beneficiaryLastName: 'last_name', skillsTrainingNeed: 'skills_training_need', yearLevel: 'year_level',
}
const select = `a.id, ${Object.entries(applicantFields).map(([key, column]) => `a.${column} AS ${key}`).join(', ')},
  b.beneficiary_type AS beneficiaryType, b.first_name AS beneficiaryFirstName, b.middle_name AS beneficiaryMiddleName,
  b.last_name AS beneficiaryLastName, b.skills_training_need AS skillsTrainingNeed, b.year_level AS yearLevel`
const values = (body, map) => Object.fromEntries(Object.entries(map).map(([key, column]) => [column, body?.[key] === '' ? null : body?.[key] ?? null]))

async function findOne(pool, id) {
  const [rows] = await pool.query(`SELECT ${select} FROM applicants a LEFT JOIN beneficiaries b ON b.applicant_id = a.id WHERE a.id = ?`, [id])
  return rows[0]
}

router.get('/', asyncHandler(async (_request, response) => {
  const [rows] = await trpatuPool.query(`SELECT ${select} FROM applicants a LEFT JOIN beneficiaries b ON b.applicant_id = a.id ORDER BY a.id`)
  response.json(rows)
}))

router.post('/', asyncHandler(async (request, response) => {
  const id = await withTransaction(trpatuPool, async (connection) => {
    const [result] = await connection.query('INSERT INTO applicants SET ?', values(request.body, applicantFields))
    await connection.query('INSERT INTO beneficiaries SET ?', { applicant_id: result.insertId, ...values(request.body, beneficiaryFields) })
    return result.insertId
  })
  response.status(201).json(await findOne(trpatuPool, id))
}))

router.put('/:id', asyncHandler(async (request, response) => {
  await withTransaction(trpatuPool, async (connection) => {
    await connection.query('UPDATE applicants SET ? WHERE id = ?', [values(request.body, applicantFields), request.params.id])
    await connection.query('DELETE FROM beneficiaries WHERE applicant_id = ?', [request.params.id])
    await connection.query('INSERT INTO beneficiaries SET ?', { applicant_id: request.params.id, ...values(request.body, beneficiaryFields) })
  })
  response.json(await findOne(trpatuPool, request.params.id))
}))

router.delete('/:id', asyncHandler(async (request, response) => {
  await trpatuPool.query('DELETE FROM applicants WHERE id = ?', [request.params.id])
  response.status(204).end()
}))

module.exports = router
