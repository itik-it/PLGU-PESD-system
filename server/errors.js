// Throw this for errors caused by the client (bad input, not found, etc.)
// so they return the right status instead of a generic 500.
class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

module.exports = { HttpError }