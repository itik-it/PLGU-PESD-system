const { z } = require('zod')

// The admin only types the year. The server picks the next batch number
// for that year and builds the name ("GIP 2026 - Batch 2").
const createBatchSchema = z.object({
  year: z.coerce
    .number({ error: 'Year is required.' })
    .int('Year must be a whole number.')
    .min(2000, 'Year must be 2000 or later.')
    .max(2100, 'Year must be 2100 or earlier.'),
})

const updateBatchSchema = z.object({
  status: z.enum(['open', 'closed'], {
    error: 'Status must be "open" or "closed".',
  }),
})

module.exports = { createBatchSchema, updateBatchSchema }
