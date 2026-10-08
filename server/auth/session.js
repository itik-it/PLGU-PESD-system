// Session = a signed JWT stored in an httpOnly cookie (JavaScript in the browser cannot read it).
require('../env')

const jwt = require('jsonwebtoken')

const COOKIE_NAME = 'lgu_session'
const SESSION_HOURS = Number(process.env.SESSION_HOURS || 8)

function getSecret() {
  const secret = process.env.JWT_SECRET

  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET is missing or shorter than 32 characters. Add it to server/.env (see .env.example).',
    )
  }

  return secret
}

// Fail at startup, not on the first login.
getSecret()

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.COOKIE_SECURE === 'true',
  path: '/',
})

function issueSession(response, userId) {
  const token = jwt.sign({ sub: String(userId) }, getSecret(), {
    algorithm: 'HS256',
    expiresIn: `${SESSION_HOURS}h`,
  })

  response.cookie(COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: SESSION_HOURS * 60 * 60 * 1000,
  })
}

function clearSession(response) {
  response.clearCookie(COOKIE_NAME, cookieOptions())
}

// Returns the user id from the cookie, or null if missing/invalid/expired.
function readSession(request) {
  const token = request.cookies?.[COOKIE_NAME]
  if (!token) return null

  try {
    const payload = jwt.verify(token, getSecret(), { algorithms: ['HS256'] })
    return Number(payload.sub)
  } catch {
    return null
  }
}

module.exports = { issueSession, clearSession, readSession }
