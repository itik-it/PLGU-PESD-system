// Mounted at /api/auth
const bcrypt = require('bcryptjs')
const express = require('express')
const rateLimit = require('express-rate-limit')
const { z } = require('zod')

const { loginSchema, firstIssue } = require('./auth.schemas')
const { requireAuth } = require('./auth.middleware')
const { issueSession, clearSession } = require('./session')
const users = require('./users.repo')

const router = express.Router()

// Compared against when the username does not exist, so a wrong username
// takes as long to reject as a wrong password.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12)

// Only FAILED attempts count. 10 failures per IP, then locked for 15 minutes.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many failed login attempts. Try again in 15 minutes.' },
})

// POST /api/auth/login   { username, password }
router.post('/login', loginLimiter, async (request, response, next) => {
  try {
    const { username, password } = loginSchema.parse(request.body)

    const user = await users.findByUsername(username)
    const passwordMatches = await bcrypt.compare(
      password,
      user ? user.password_hash : DUMMY_HASH,
    )

    // One message for every failure so the form never reveals which usernames exist.
    if (!user || !passwordMatches || !user.is_active) {
      response.status(401).json({ message: 'Invalid username or password.' })
      return
    }

    await users.touchLastLogin(user.id)
    issueSession(response, user.id)
    response.json({ user: users.toPublicUser(user) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({ message: firstIssue(error) })
      return
    }
    next(error)
  }
})

// POST /api/auth/logout
router.post('/logout', (_request, response) => {
  clearSession(response)
  response.status(204).end()
})

// GET /api/auth/me  -> who is logged in (used by React on page load)
router.get('/me', requireAuth, (request, response) => {
  response.json({ user: request.user })
})

module.exports = router
