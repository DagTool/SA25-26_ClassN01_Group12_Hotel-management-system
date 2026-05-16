const pool = require('../db')
const axios = require('axios')
const { v4: uuidv4 } = require('uuid')

const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://localhost:3005/api/bookings'
const SERVICE_SVC_URL = process.env.SERVICE_SVC_URL || 'http://localhost:3003/api/services'

// GET /api/payments?branch_id=...&booking_id=...
const getPayments = async (req, res, next) => {
  try {
    const { branch_id, booking_id } = req.query

    if (!branch_id) {
      return res.status(400).json({ success: false, message: 'branch_id is required' })
    }

    let query = 'SELECT * FROM payments WHERE branch_id = $1'
    const params = [branch_id]

    if (booking_id) {
      query += ' AND booking_id = $2'
      params.push(booking_id)
    }

    query += ' ORDER BY created_at DESC'

    const result = await pool.query(query, params)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    next(err)
  }
}

// GET /api/payments/:id
const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT * FROM payments WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment not found' })
    }

    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    next(err)
  }
}

// POST /api/payments
// Body: { branch_id, booking_id, amount?, method, note? }
// Nếu không truyền amount, service sẽ tự lấy total_amount từ booking-service
const createPayment = async (req, res, next) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { branch_id, booking_id, amount, method, note } = req.body

    if (!branch_id || !booking_id || !method) {
      return res.status(400).json({
        success: false,
        message: 'branch_id, booking_id, and method are required',
      })
    }

    const allowedMethods = ['cash', 'transfer', 'card']
    if (!allowedMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message: `method must be one of: ${allowedMethods.join(', ')}`,
      })
    }

    // Kiểm tra chưa có payment 'success' cho booking này (tránh thanh toán 2 lần)
    const existing = await client.query(
      "SELECT id FROM payments WHERE booking_id = $1 AND status = 'success'",
      [booking_id]
    )
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Booking đã được thanh toán thành công trước đó',
      })
    }

    // Nếu không truyền amount, lấy total_amount từ booking-service
    let finalAmount = amount
    if (!finalAmount) {
      try {
        const bookingRes = await axios.get(`${BOOKING_SERVICE_URL}?branch_id=${branch_id}`)
        const booking = bookingRes.data.data.find((b) => b.id === booking_id)
        if (!booking) {
          throw new Error('Booking not found in booking-service')
        }
        finalAmount = booking.total_amount
      } catch (err) {
        return res.status(502).json({
          success: false,
          message: 'Không thể lấy thông tin booking: ' + err.message,
        })
      }
    }

    if (!finalAmount || Number(finalAmount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Số tiền thanh toán không hợp lệ. Hãy truyền amount hoặc đảm bảo booking đã check-out.',
      })
    }

    // Cộng thêm tiền dịch vụ nếu có (lấy từ service-svc/booking_services)
    let serviceTotal = 0
    try {
      const svcRes = await axios.get(`${SERVICE_SVC_URL}/booking/${booking_id}`)
      if (svcRes.data && svcRes.data.data) {
        serviceTotal = svcRes.data.data.reduce((sum, item) => sum + Number(item.total_price), 0)
      }
    } catch (_) {
      // Nếu không lấy được booking_services thì bỏ qua, chỉ tính tiền phòng
      console.warn('Warning: Could not fetch booking services. Using room price only.')
    }

    const grandTotal = Number(finalAmount) + serviceTotal

    const result = await client.query(
      `INSERT INTO payments (id, branch_id, booking_id, amount, method, status, note)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6) RETURNING *`,
      [uuidv4(), branch_id, booking_id, grandTotal, method, note || null]
    )

    await client.query('COMMIT')
    res.status(201).json({
      success: true,
      data: result.rows[0],
      breakdown: {
        room_amount: Number(finalAmount),
        service_amount: serviceTotal,
        total: grandTotal,
      },
    })
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
}

// PATCH /api/payments/:id/confirm
// Xác nhận thanh toán thành công (từ pending → success)
const confirmPayment = async (req, res, next) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { id } = req.params

    const paymentRes = await client.query(
      "SELECT * FROM payments WHERE id = $1 AND status = 'pending' FOR UPDATE",
      [id]
    )

    if (paymentRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or not in pending status',
      })
    }

    const result = await client.query(
      "UPDATE payments SET status = 'success' WHERE id = $1 RETURNING *",
      [id]
    )

    await client.query('COMMIT')
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
}

// PATCH /api/payments/:id/fail
// Đánh dấu thanh toán thất bại
const failPayment = async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      "UPDATE payments SET status = 'failed' WHERE id = $1 AND status = 'pending' RETURNING *",
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or not in pending status',
      })
    }

    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    next(err)
  }
}

// GET /api/payments/report?branch_id=...&from=...&to=...
// Báo cáo doanh thu theo khoảng thời gian
const getRevenueReport = async (req, res, next) => {
  try {
    const { branch_id, from, to } = req.query

    if (!branch_id) {
      return res.status(400).json({ success: false, message: 'branch_id is required' })
    }

    let query = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'success') AS total_transactions,
        COALESCE(SUM(amount) FILTER (WHERE status = 'success'), 0) AS total_revenue,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS pending_amount,
        method,
        DATE_TRUNC('day', created_at) AS date
      FROM payments
      WHERE branch_id = $1
    `
    const params = [branch_id]
    let paramIdx = 2

    if (from) {
      query += ` AND created_at >= $${paramIdx++}`
      params.push(from)
    }
    if (to) {
      query += ` AND created_at <= $${paramIdx++}`
      params.push(to)
    }

    query += ' GROUP BY method, DATE_TRUNC(\'day\', created_at) ORDER BY date DESC'

    const result = await pool.query(query, params)

    // Tổng hợp
    const summaryRes = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'success') AS total_transactions,
         COALESCE(SUM(amount) FILTER (WHERE status = 'success'), 0) AS total_revenue
       FROM payments WHERE branch_id = $1`,
      [branch_id]
    )

    res.json({
      success: true,
      summary: summaryRes.rows[0],
      breakdown: result.rows,
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getPayments,
  getPaymentById,
  createPayment,
  confirmPayment,
  failPayment,
  getRevenueReport,
}
