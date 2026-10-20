// Mounted at /api/livelihood (requireAuth is applied in app.js)
const express = require('express')
const { z } = require('zod')

const { livelihoodPool } = require('../db')
const { requireAdmin } = require('../auth/auth.middleware')
const { HttpError } = require('../errors')
const { asyncHandler } = require('../utils/async-handler')
const { parseId } = require('../utils/parse-id')

const fields = {
  dateApplied: 'date_applied', projectName: 'project_name', projectLocation: 'project_location', projectType: 'project_type', projectComponent: 'project_component', implementationMode: 'implementation_mode',
  lastName: 'last_name', firstName: 'first_name', middleName: 'middle_name', nameExtension: 'name_extension', houseBlockLot: 'house_block_lot', street: 'street', barangay: 'barangay', municipality: 'municipality', province: 'province', sex: 'sex', civilStatus: 'civil_status', civilStatusOther: 'civil_status_other', birthdate: 'birthdate', birthplace: 'birthplace', disability: 'disability', disabilityOther: 'disability_other', contactNumber: 'contact_number', beneficiaryType: 'beneficiary_type', overseasWork: 'overseas_work', tesdaGraduate: 'tesda_graduate', tesdaCertificate: 'tesda_certificate', monthlyNetIncome: 'monthly_net_income', childrenCount: 'children_count', is4psBeneficiary: 'is_4ps_beneficiary', beneficiaryName: 'beneficiary_name', beneficiaryContactNumber: 'beneficiary_contact_number', is4psGraduate: 'is_4ps_graduate', idType: 'id_type', idNumber: 'id_number', hasCertIndigency: 'has_cert_indigency', facebook: 'facebook', instagram: 'instagram', email: 'email',
}
const required = ['dateApplied', 'projectName', 'projectType', 'projectComponent', 'implementationMode', 'lastName', 'firstName', 'barangay', 'municipality', 'sex', 'birthdate']
const dateFields = new Set(['dateApplied', 'birthdate'])
const numberFields = new Set(['monthlyNetIncome', 'childrenCount'])
const select = Object.entries(fields).map(([key, column]) => `${column} AS ${key}`).join(', ')
const schema = z.object(Object.fromEntries(Object.keys(fields).map((key) => [key, z.any().optional()])))
const clean = (body) => {
  const parsed = schema.parse(body || {})
  for (const key of required) if (!String(parsed[key] ?? '').trim()) throw new HttpError(400, `${key} is required.`)
  const data = {}
  for (const [key, column] of Object.entries(fields)) {
    const value = parsed[key]
    if (value === '' || value === undefined || value === null) data[column] = null
    else if (dateFields.has(key)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value)) || String(value) > new Date().toISOString().slice(0, 10)) throw new HttpError(400, `${key} must be a valid date.`)
      data[column] = value
    } else if (numberFields.has(key)) {
      const number = Number(value)
      if (!Number.isFinite(number) || number < 0) throw new HttpError(400, `${key} must be a non-negative number.`)
      data[column] = number
    } else data[column] = String(value).trim()
  }
  return data
}
const readOne = async (id) => {
  const [rows] = await livelihoodPool.query(`SELECT id, ${select} FROM applicants WHERE id = ?`, [id])
  if (!rows.length) throw new HttpError(404, 'Livelihood applicant not found.')
  return rows[0]
}

const router = express.Router()
router.get('/applicants', asyncHandler(async (_request, response) => {
  const [rows] = await livelihoodPool.query(`SELECT id, ${select} FROM applicants ORDER BY id`)
  response.json(rows)
}))
router.post('/applicants', asyncHandler(async (request, response) => {
  const [result] = await livelihoodPool.query('INSERT INTO applicants SET ?', clean(request.body))
  response.status(201).json({ id: result.insertId })
}))
router.put('/applicants/:id', asyncHandler(async (request, response) => {
  const id = parseId(request.params.id, 'Applicant ID')
  await readOne(id)
  await livelihoodPool.query('UPDATE applicants SET ? WHERE id = ?', [clean(request.body), id])
  response.json(await readOne(id))
}))
router.delete('/applicants/:id', requireAdmin, asyncHandler(async (request, response) => {
  const id = parseId(request.params.id, 'Applicant ID')
  const [result] = await livelihoodPool.query('DELETE FROM applicants WHERE id = ?', [id])
  if (!result.affectedRows) throw new HttpError(404, 'Livelihood applicant not found.')
  response.status(204).end()
}))

module.exports = router