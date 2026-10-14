const { z } = require('zod')

const { MAX_IMPORT_ROWS } = require('../constants/gip-excel')

// Body of POST .../import. Each row is checked again with applicantSchema.
const importCommitSchema = z.object({
  rows: z
    .array(z.unknown())
    .min(1, 'There are no rows to import.')
    .max(MAX_IMPORT_ROWS, `You can import at most ${MAX_IMPORT_ROWS} rows at a time.`),
})

module.exports = { importCommitSchema }
