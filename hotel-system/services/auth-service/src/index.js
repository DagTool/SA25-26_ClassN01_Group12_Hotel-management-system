const express = require('express')
const cors = require('cors')
require('dotenv').config()

const authRoutes = require('./routes/authRoutes')
const { errorHandler, notFound } = require('./middlewares/errorHandler')
const { connectRedis } = require('./redis')
const pool = require('./db')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Tính chịu lỗi
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({
      status: 'healthy',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'auth-service',
      error: err.message,
    })
  }
})

// Routes
app.use('/api/auth', authRoutes)

// 404 + Error handler
app.use(notFound)
app.use(errorHandler)

// Khởi động
const start = async () => {
  try {
    await connectRedis()
    await pool.query('SELECT 1')
    console.log('PostgreSQL connected')
    app.listen(PORT, () => {
      console.log(`Auth Service running on port ${PORT}`)
    })
  } catch (err) {
    console.error('Startup error:', err.message)
    process.exit(1)
  }
}

start()