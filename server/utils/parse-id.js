const { HttpError } = require('../errors')

// Turns a URL parameter like "12" into the number 12, or throws a 400.
function parseId(value, label = 'ID') {
  const id = Number(value)

  if (!Number.isInteger(id) || id < 1) {
    throw new HttpError(400, `${label} must be a positive integer.`)
  }

  return id
}

module.exports = { parseId }
