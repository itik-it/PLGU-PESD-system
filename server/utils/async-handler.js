/**
 * Wraps an async route so rejected promises reach the error handler.
 * Needed on Express 4; harmless on Express 5.
 */
function asyncHandler(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next)
  }
}

module.exports = { asyncHandler }