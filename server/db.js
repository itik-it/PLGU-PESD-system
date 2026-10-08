// Shared MySQL connection pools. Import from here instead of creating pools elsewhere.
require('./env')

const mysql = require('mysql2/promise')

const baseConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  dateStrings: true,
}

// GIP database
const gipPool = mysql.createPool({
  ...baseConfig,
  database: process.env.DB_GIP_NAME || 'lgu_gip',
})

// Login database
const usersPool = mysql.createPool({
  ...baseConfig,
  database: process.env.DB_USERS_NAME || 'lgu_users',
})

module.exports = { gipPool, usersPool }
