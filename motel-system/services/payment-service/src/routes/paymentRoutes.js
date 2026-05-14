const express = require('express')
const router = express.Router()
const {
  getPayments,
  getPaymentById,
  createPayment,
  confirmPayment,
  failPayment,
  getRevenueReport,
} = require('../controllers/paymentController')

router.get('/report', getRevenueReport)      // GET /api/payments/report?branch_id=...
router.get('/', getPayments)                 // GET /api/payments?branch_id=...
router.get('/:id', getPaymentById)           // GET /api/payments/:id
router.post('/', createPayment)              // POST /api/payments
router.patch('/:id/confirm', confirmPayment) // PATCH /api/payments/:id/confirm
router.patch('/:id/fail', failPayment)       // PATCH /api/payments/:id/fail

module.exports = router
