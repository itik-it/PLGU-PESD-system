// Creates the FIRST admin account (or resets an existing admin's password).
// Run from the server folder:   node scripts/create-admin.js
const readline = require('readline/promises')
const bcrypt = require('bcryptjs')

const { usersPool } = require('../db')
const { createUserSchema, firstIssue } = require('../auth/auth.schemas')

// Reads one line per prompt. Works when typing in a terminal and when input is piped.
async function askAll(prompts) {
  const rl = readline.createInterface({ input: process.stdin })
  const lines = rl[Symbol.asyncIterator]()
  const answers = []

  for (const prompt of prompts) {
    process.stdout.write(prompt)
    const { value, done } = await lines.next()
    if (done) break
    answers.push(value)
  }

  rl.close()
  return answers
}

async function main() {
  const [username = '', fullName = '', password = ''] = await askAll([
    'Admin username: ',
    'Full name: ',
    'Password (min 8 characters, visible as you type): ',
  ])

  const parsed = createUserSchema.safeParse({ username, fullName, password, role: 'admin' })

  if (!parsed.success) {
    console.error(`\nNot saved: ${firstIssue(parsed.error)}`)
    process.exitCode = 1
    return
  }

  const input = parsed.data
  const passwordHash = await bcrypt.hash(input.password, 12)

  const [existing] = await usersPool.query(
    'SELECT id FROM users WHERE username = ? LIMIT 1',
    [input.username],
  )

  if (existing.length) {
    await usersPool.query(
      `UPDATE users
       SET password_hash = ?, full_name = ?, role = 'admin', is_active = TRUE
       WHERE id = ?`,
      [passwordHash, input.fullName, existing[0].id],
    )
    console.log(`\nUpdated existing account "${input.username}": new password set, role = admin.`)
  } else {
    await usersPool.query(
      `INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, 'admin')`,
      [input.username, passwordHash, input.fullName],
    )
    console.log(`\nAdmin account "${input.username}" created.`)
  }
}

main()
  .catch((error) => {
    console.error('Failed:', error.message)
    process.exitCode = 1
  })
  .finally(() => usersPool.end())
