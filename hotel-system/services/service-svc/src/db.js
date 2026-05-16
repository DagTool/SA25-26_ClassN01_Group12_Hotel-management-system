const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

pool.on('connect', () => {
  console.log('PostgreSQL connected (Service-svc)')
})

pool.on('error', (err) => {
  console.error('PostgreSQL error:', err.message)
})

module.exports = pool
