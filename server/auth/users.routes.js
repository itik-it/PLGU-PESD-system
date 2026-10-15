// Mounted at /api/users  (admin only)
const bcrypt = require('bcryptjs')
const express = require('express')
const { z } = require('zod')

const { createUserSchema, setActiveSchema, firstIssue } = require('./auth.schemas')
const { requireAuth, requireAdmin } = require('./auth.middleware')
const users = require('./users.repo')

const router = express.Router()

router.use(requireAuth, requireAdmin)

// Edit form: name and role only (username and password are not changed here).
const editUserSchema = z.object({
  fullName: z
    .string({ error: 'Full name is required.' })
    .trim()
    .min(1, 'Full name is required.')
    .max(100, 'Full name must be 100 characters or less.'),
  role: z.enum(['admin', 'staff'], { error: 'Role must be "admin" or "staff".' }),
})

// Reads and checks :id. Sends the 400 itself and returns null when it is bad.
function readId(request, response) {
  const id = Number(request.params.id)

  if (!Number.isInteger(id) || id < 1) {
    response.status(400).json({ message: 'User ID must be a positive integer.' })
    return null
  }

  return id
}

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

// PUT /api/users/:id   { fullName, role }
router.put('/:id', async (request, response, next) => {
  try {
    const id = readId(request, response)
    if (id === null) return

    const input = editUserSchema.parse(request.body)

    const target = await users.findById(id)
    if (!target) {
      response.status(404).json({ message: 'User not found.' })
      return
    }

    if (id === request.user.id && input.role !== users.toPublicUser(target).role) {
      response.status(400).json({ message: 'You cannot change your own role.' })
      return
    }

    await users.updateProfile(id, input)
    response.json(users.toPublicUser(await users.findById(id)))
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({ message: firstIssue(error) })
      return
    }
    next(error)
  }
})

// PATCH /api/users/:id   { isActive }
router.patch('/:id', async (request, response, next) => {
  try {
    const id = readId(request, response)
    if (id === null) return

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

// DELETE /api/users/:id
// Because only an active admin can reach this route and cannot delete themselves,
// at least one admin (the caller) always remains.
router.delete('/:id', async (request, response, next) => {
  try {
    const id = readId(request, response)
    if (id === null) return

    if (id === request.user.id) {
      response.status(400).json({ message: 'You cannot delete your own account.' })
      return
    }

    if (!(await users.findById(id))) {
      response.status(404).json({ message: 'User not found.' })
      return
    }

    await users.deleteUser(id)
    response.status(204).end()
  } catch (error) {
    // The user is referenced by other records (for example, who encoded something).
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
      response.status(409).json({
        message: 'This user has records in the system and cannot be deleted. Deactivate the account instead.',
      })
      return
    }
    next(error)
  }
})

module.exports = router
