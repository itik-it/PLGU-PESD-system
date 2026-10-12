// Mounted at /api/gip (requireAuth is applied in app.js)
const express = require('express')

const { gipPool } = require('../db')
const { asyncHandler } = require('../utils/async-handler')
const batchesRouter = require('./gip-batches.routes')

const router = express.Router()

// LOOKUP LISTS

router.get(
  '/classifications',
  asyncHandler(async (_request, response) => {
    const [rows] = await gipPool.query(`
      SELECT id, classification_name
      FROM classifications
      WHERE is_active = TRUE
      ORDER BY id
    `)

    response.json(rows)
  })
)

router.get(
  '/requirements',
  asyncHandler(async (_request, response) => {
    const [rows] = await gipPool.query(`
      SELECT id, requirement_name, is_required
      FROM requirement_types
      WHERE is_active = TRUE
      ORDER BY id
    `)

    response.json(rows)
  })
)

// BATCHES and the applicants inside them

router.use('/batches', batchesRouter)

module.exports = router
