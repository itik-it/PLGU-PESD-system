const { readSession } = require('./session')
const users = require('./users.repo')

// Blocks the request unless the cookie holds a valid session for an ACTIVE user.
// The user is re-checked in the database each time, so deactivating an account
// takes effect immediately.
async function requireAuth(request, response, next) {
  try {
    const userId = readSession(request)

    if (!userId) {
      response.status(401).json({ message: 'Please log in to continue.' })
      return
    }

    const user = await users.findById(userId)

    if (!user || !user.is_active) {
      response.status(401).json({ message: 'Your session is no longer valid. Please log in again.' })
      return
    }

    request.user = users.toPublicUser(user)
    next()
  } catch (error) {
    next(error)
  }
}

// Use after requireAuth.
function requireAdmin(request, response, next) {
  if (request.user?.role !== 'admin') {
    response.status(403).json({ message: 'Administrator access is required.' })
    return
  }

  next()
}

module.exports = { requireAuth, requireAdmin }
