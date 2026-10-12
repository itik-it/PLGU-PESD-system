const { z } = require('zod')

const { HttpError } = require('../errors')

// 404 for unknown routes
function notFoundHandler(_request, response) {
  response.status(404).json({
    message: 'The requested API endpoint was not found.',
  })
}

// Central error handler: turns known errors into the right status code.
// eslint-disable-next-line no-unused-vars
function errorHandler(error, _request, response, _next) {
  if (error instanceof z.ZodError) {
    response.status(400).json({
      message: 'Invalid applicant data.',
      errors: error.issues,
    })
    return
  }

  if (error instanceof HttpError) {
    response.status(error.status).json({ message: error.message })
    return
  }

  // body-parser errors (malformed JSON, body too large)
  if (error.type === 'entity.parse.failed') {
    response.status(400).json({ message: 'Malformed JSON in request body.' })
    return
  }

  if (error.type === 'entity.too.large') {
    response.status(413).json({ message: 'Request body is too large.' })
    return
  }

  // Duplicate entry in a unique key
  if (error.code === 'ER_DUP_ENTRY') {
    response.status(409).json({ message: 'That record already exists.' })
    return
  }

  console.error('Unhandled server error:', error)

  response.status(500).json({
    message: 'The server could not complete the request.',
  })
}

module.exports = { errorHandler, notFoundHandler }