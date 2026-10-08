// All SQL for the lgu_users.users table lives here.
const { usersPool } = require('../db')

const PUBLIC_COLUMNS =
  'id, username, full_name, role, is_active, last_login_at, created_at'

// Shape sent to the browser. password_hash is never included.
function toPublicUser(row) {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    role: row.role,
    isActive: Boolean(row.is_active),
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  }
}

async function findByUsername(username) {
  const [rows] = await usersPool.query(
    `SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE username = ? LIMIT 1`,
    [username],
  )
  return rows[0] || null
}

async function findById(id) {
  const [rows] = await usersPool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ? LIMIT 1`,
    [id],
  )
  return rows[0] || null
}

async function listUsers() {
  const [rows] = await usersPool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY id`,
  )
  return rows
}

async function createUser({ username, passwordHash, fullName, role }) {
  const [result] = await usersPool.query(
    'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
    [username, passwordHash, fullName, role],
  )
  return findById(result.insertId)
}

async function setActive(id, isActive) {
  await usersPool.query('UPDATE users SET is_active = ? WHERE id = ?', [isActive, id])
}

async function touchLastLogin(id) {
  await usersPool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id])
}

module.exports = {
  toPublicUser,
  findByUsername,
  findById,
  listUsers,
  createUser,
  setActive,
  touchLastLogin,
}
