const express = require('express')
const cors = require('cors')
require('dotenv').config()

const paymentRoutes = require('./routes/paymentRoutes')
const { errorHandler, notFound } = require('./middlewares/errorHandler')
const pool = require('./db')

const app = express()
const PORT = process.env.PORT || 3006

app.use(cors())
app.use(express.json())

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({
      status: 'healthy',
      service: 'payment-service',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'payment-service',
      error: err.message,
    })
  }
})

app.use('/api/payments', paymentRoutes)

app.use(notFound)
app.use(errorHandler)

const start = async () => {
  try {
    await pool.query('SELECT 1')
    app.listen(PORT, () => {
      console.log(`Payment Service running on port ${PORT}`)
    })
  } catch (err) {
    console.error('Startup error:', err.message)
    process.exit(1)
  }
}

start()
