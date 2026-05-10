const express = require('express')
const router = express.Router()
const {
  getBookings,
  checkIn,
  checkOut
} = require('../controllers/bookingController')

router.get('/', getBookings)
router.post('/check-in', checkIn)
router.post('/:id/check-out', checkOut)

module.exports = router
