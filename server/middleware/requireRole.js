// Allows the request only if the logged-in user has one of the given roles.
// Use AFTER requireAuth.
//
// ASSUMPTION: requireAuth (auth/auth.middleware.js) sets `request.user.role`.
// Check that file and change the line below if your auth code stores the
// role somewhere else.
function requireRole(...allowedRoles) {
  return (request, response, next) => {
    const role = request.user?.role

    if (!role || !allowedRoles.includes(role)) {
      response.status(403).json({
        message: 'You do not have permission to do this.',
      })
      return
    }

    next()
  }
}

module.exports = { requireRole }