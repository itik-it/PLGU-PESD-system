// Mounted at /api/users  (admin only)
const bcrypt = require('bcryptjs')
const express = require('express')
const { z } = require('zod')

const { createUserSchema, setActiveSchema, firstIssue } = require('./auth.schemas')
const { requireAuth, requireAdmin } = require('./auth.middleware')
const users = require('./users.repo')

const router = express.Router()

router.use(requireAuth, requireAdmin)

// GET /api/users
router.get('/', async (_request, response, next) => {
  try {
    const rows = await users.listUsers()
    response.json(rows.map(users.toPublicUser))
  } catch (error) {
    next(error)
  }
})

// POST /api/users   { username, fullName, password, role }
router.post('/', async (request, response, next) => {
  try {
    const input = createUserSchema.parse(request.body)
    const passwordHash = await bcrypt.hash(input.password, 12)

    const created = await users.createUser({
      username: input.username,
      passwordHash,
      fullName: input.fullName,
      role: input.role,
    })

    response.status(201).json(users.toPublicUser(created))
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({ message: firstIssue(error) })
      return
    }
    if (error.code === 'ER_DUP_ENTRY') {
      response.status(409).json({ message: 'That username is already taken.' })
      return
    }
    next(error)
  }
})

// PATCH /api/users/:id   { isActive }
router.patch('/:id', async (request, response, next) => {
  try {
    const id = Number(request.params.id)

    if (!Number.isInteger(id) || id < 1) {
      response.status(400).json({ message: 'User ID must be a positive integer.' })
      return
    }

    const { isActive } = setActiveSchema.parse(request.body)

    if (id === request.user.id && !isActive) {
      response.status(400).json({ message: 'You cannot deactivate your own account.' })
      return
    }

    if (!(await users.findById(id))) {
      response.status(404).json({ message: 'User not found.' })
      return
    }

    await users.setActive(id, isActive)
    response.json(users.toPublicUser(await users.findById(id)))
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({ message: firstIssue(error) })
      return
    }
    next(error)
  }
})

module.exports = router
