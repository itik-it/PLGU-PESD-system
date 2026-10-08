const { requireAuth, requireAdmin } = require('./auth.middleware')

module.exports = {
  authRoutes: require('./auth.routes'),
  usersRoutes: require('./users.routes'),
  requireAuth,
  requireAdmin,
}
