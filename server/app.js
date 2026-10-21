const cookieParser = require('cookie-parser')
const cors = require('cors')
const express = require('express')
const helmet = require('helmet')

const env = require('./env')
const { authRoutes, usersRoutes, requireAuth } = require('./auth')
const {
  gipPool, usersPool, guwipPool, doktorPool, trpatuPool, tupadPool, ofwPool, dilpPool,
  jobseekerPool, spesPool, bridgingPool, jobvacancyPool,
} = require('./db')
const {
  errorHandler,
  notFoundHandler,
} = require('./middleware/errorHandler')
const gipRoutes = require('./routes/gip.routes')
const sagutRoutes = require('./routes/sagut.routes')
const guwipRoutes = require('./routes/guwip.routes')
const doktorRoutes = require('./routes/doktor.routes')
const trpatuRoutes = require('./routes/trpatu.routes')
const tupadRoutes = require('./routes/tupad.routes')
const ofwRoutes = require('./routes/ofw.routes')
const dilpRoutes = require('./routes/dilp.routes')
const jobseekerRoutes = require('./routes/jobseeker.routes')
const spesRoutes = require('./routes/spes.routes')
const bridgingRoutes = require('./routes/bridging.routes')
const jobvacancyRoutes = require('./routes/jobvacancy.routes')

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
    await tupadPool.query('SELECT 1')
    await ofwPool.query('SELECT 1')
    await dilpPool.query('SELECT 1')
    await jobseekerPool.query('SELECT 1')
    await spesPool.query('SELECT 1')
    await bridgingPool.query('SELECT 1')
    await jobvacancyPool.query('SELECT 1')

    response.json({
      status: 'ok',
      gipDatabase: 'connected',
      usersDatabase: 'connected',
      guwipDatabase: 'connected',
      doktorDatabase: 'connected',
      trpatuDatabase: 'connected',
      tupadDatabase: 'connected',
      ofwDatabase: 'connected',
      dilpDatabase: 'connected',
      jobseekerDatabase: 'connected',
      spesDatabase: 'connected',
      bridgingDatabase: 'connected',
      jobvacancyDatabase: 'connected',
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
      tupadDatabase: 'disconnected',
      ofwDatabase: 'disconnected',
      dilpDatabase: 'disconnected',
      jobseekerDatabase: 'disconnected',
      spesDatabase: 'disconnected',
      bridgingDatabase: 'disconnected',
      jobvacancyDatabase: 'disconnected',
    })
  }
})

// Everything under /api/gip requires a logged-in user.
app.use('/api/gip', requireAuth, gipRoutes)
app.use('/api/sagut', requireAuth, sagutRoutes)
app.use('/api/guwip', requireAuth, guwipRoutes)
app.use('/api/doktor', requireAuth, doktorRoutes)
app.use('/api/trpatu', requireAuth, trpatuRoutes)
app.use('/api/tupad', requireAuth, tupadRoutes)
app.use('/api/ofw', requireAuth, ofwRoutes)
app.use('/api/dilp', requireAuth, dilpRoutes)
app.use('/api/jobseeker', requireAuth, jobseekerRoutes)
app.use('/api/spes', requireAuth, spesRoutes)
app.use('/api/bridging', requireAuth, bridgingRoutes)
app.use('/api/jobvacancy', requireAuth, jobvacancyRoutes)

// ERRORS (must stay last)

app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app
