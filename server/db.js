// Shared MySQL connection pools. Import from here instead of creating pools elsewhere.
const mysql = require('mysql2/promise')

const env = require('./env')

const baseConfig = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: env.DB_CONNECTION_LIMIT,
  dateStrings: true,
}

// GIP database
const gipPool = mysql.createPool({
  ...baseConfig,
  database: env.DB_GIP_NAME,
})

// SAGUT database
const sagutPool = mysql.createPool({
  ...baseConfig,
  database: env.DB_SAGUT_NAME,
})

// GUWIP databases
const guwipPool = mysql.createPool({
  ...baseConfig,
  database: env.DB_GUWIP_NAME,
})

// DOKTOR database
const doktorPool = mysql.createPool({
  ...baseConfig,
  database: env.DB_DOKTOR_NAME,
})

// TRPATU databases
const trpatuPool = mysql.createPool({
  ...baseConfig,
  database: env.DB_TRPATU_NAME,
})

// TUPAD database
const tupadPool = mysql.createPool({
  ...baseConfig,
  database: env.DB_TUPAD_NAME,
})

// OFW  databases
const ofwPool = mysql.createPool({
  ...baseConfig,
  database: env.DB_OFW_NAME,
})

// Livelihood databases
const livelihoodPool = mysql.createPool({
  ...baseConfig,
  database: env.DB_LIVELIHOOD_NAME,
})

// Login database
const usersPool = mysql.createPool({
  ...baseConfig,
  database: env.DB_USERS_NAME,
})

/**
 * Runs `work(connection)` inside a transaction.
 * Commits on success, rolls back on any error, always releases the connection.
 */
async function withTransaction(pool, work) {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()
    const result = await work(connection)
    await connection.commit()
    return result
  } catch (error) {
    try {
      await connection.rollback()
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError.message)
    }
    throw error
  } finally {
    connection.release()
  }
}

module.exports = {
  gipPool,
  usersPool,
  sagutPool,
  guwipPool,
  doktorPool,
  trpatuPool,
  tupadPool,
  ofwPool,
  livelihoodPool,
  withTransaction,
}