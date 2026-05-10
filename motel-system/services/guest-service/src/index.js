const express = require('express')
const cors = require('cors')
require('dotenv').config()

const guestRoutes = require('./routes/guestRoutes')
const { errorHandler, notFound } = require('./middlewares/errorHandler')
const pool = require('./db')

const app = express()
const PORT = process.env.PORT || 3004

app.use(cors())
app.use(express.json())

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({
      status: 'healthy',
      service: 'guest-service',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'guest-service',
      error: err.message,
    })
  }
})

// Routes
app.use('/api/guests', guestRoutes)

// 404 + Error handler
app.use(notFound)
app.use(errorHandler)

const start = async () => {
  try {
    await pool.query('SELECT 1')
    app.listen(PORT, () => {
      console.log(`Guest Service running on port ${PORT}`)
    })
  } catch (err) {
    console.error('Startup error:', err.message)
    process.exit(1)
  }
}

start()
