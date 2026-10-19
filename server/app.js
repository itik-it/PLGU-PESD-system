const cookieParser = require('cookie-parser')
const cors = require('cors')
const express = require('express')
const helmet = require('helmet')

const env = require('./env')
const { authRoutes, usersRoutes, requireAuth } = require('./auth')
const { gipPool, usersPool, guwipPool, doktorPool, trpatuPool } = require('./db')
const {
  errorHandler,
  notFoundHandler,
} = require('./middleware/errorHandler')
const gipRoutes = require('./routes/gip.routes')
const sagutRoutes = require('./routes/sagut.routes')
const guwipRoutes = require('./routes/guwip.routes')
const doktorRoutes = require('./routes/doktor.routes')
const trpatuRoutes = require('./routes/trpatu.routes')

const app = express()

// MIDDLEWARE

app.use(helmet())

app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  })
)

app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// AUTHENTICATION

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)

// ROUTES

app.get('/', (_request, response) => {
  response.json({ message: 'LGU/PESO API is running.' })
})

// Public on purpose (for uptime checks). Keep the body minimal.
app.get('/api/health', async (_request, response) => {
  try {
    await gipPool.query('SELECT 1')
    await usersPool.query('SELECT 1')
    await guwipPool.query('SELECT 1')
    await doktorPool.query('SELECT 1')
    await trpatuPool.query('SELECT 1')

    response.json({
      status: 'ok',
      gipDatabase: 'connected',
      usersDatabase: 'connected',
      guwipDatabase: 'connected',
      doktorDatabase: 'connected',
      trpatuDatabase: 'connected',
    })
  } catch (error) {
    console.error('Database health check failed:', error.message)

    response.status(503).json({
      status: 'error',
      gipDatabase: 'disconnected',
      usersDatabase: 'disconnected',
      guwipDatabase: 'disconnected',
      doktorDatabase: 'disconnected',
      trpatuDatabase: 'disconnected',
    })
  }
})

// Everything under /api/gip requires a logged-in user.
app.use('/api/gip', requireAuth, gipRoutes)
app.use('/api/sagut', requireAuth, sagutRoutes)
app.use('/api/guwip', requireAuth, guwipRoutes)
app.use('/api/doktor', requireAuth, doktorRoutes)
app.use('/api/trpatu', requireAuth, trpatuRoutes)

// ERRORS (must stay last)

app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app

