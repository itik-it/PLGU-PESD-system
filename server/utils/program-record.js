const { z } = require('zod')

const { HttpError } = require('../errors')

function createCleaner(fields, options = {}) {
  const schema = z.object(Object.fromEntries(Object.keys(fields).map((key) => [key, z.any().optional()])))
  const dateFields = new Set(options.dateFields || [])
  const numberFields = new Set(options.numberFields || [])
  const booleanFields = new Set(options.booleanFields || [])
  const required = options.required || []

  return (body) => {
    const parsed = schema.parse(body || {})
    for (const key of required) {
      if (!String(parsed[key] ?? '').trim()) throw new HttpError(400, `${key} is required.`)
    }

    const result = {}
    for (const [key, column] of Object.entries(fields)) {
      const value = parsed[key]
      if (value === '' || value === undefined || value === null) {
        result[column] = null
      } else if (dateFields.has(key)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value)) || String(value) > new Date().toISOString().slice(0, 10)) {
          throw new HttpError(400, `${key} must be a valid date.`)
        }
        result[column] = value
      } else if (numberFields.has(key)) {
        const number = Number(value)
        if (!Number.isFinite(number) || number < 0) throw new HttpError(400, `${key} must be a non-negative number.`)
        result[column] = number
      } else if (booleanFields.has(key)) {
        result[column] = value === true || value === 1 || value === '1' ? 1 : 0
      } else {
        result[column] = String(value).trim()
      }
    }
    return result
  }
}

const cleanItems = (items, fields, options) => {
  if (!Array.isArray(items)) throw new HttpError(400, `${options.name} must be an array.`)
  const clean = createCleaner(fields, options)
  return items.map((item) => clean(item))
}

module.exports = { createCleaner, cleanItems }
