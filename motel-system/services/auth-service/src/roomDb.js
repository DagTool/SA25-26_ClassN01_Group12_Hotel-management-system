const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.ROOM_DATABASE_URL,
})

pool.on('connect', () => {
  console.log('PostgreSQL connected to room_db')
})

pool.on('error', (err) => {
  console.error('PostgreSQL room_db error:', err.message)
})

module.exports = pool
