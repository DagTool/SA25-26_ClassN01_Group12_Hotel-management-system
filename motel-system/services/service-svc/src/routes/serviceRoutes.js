const express = require('express')
const router = express.Router()
const {
  getServices,
  createService,
  updateService,
  deleteService,
  getBookingServices,
  addServiceToBooking
} = require('../controllers/serviceController')

router.get('/', getServices)
router.post('/', createService)
router.put('/:id', updateService)
router.delete('/:id', deleteService)

router.get('/booking/:booking_id', getBookingServices)
router.post('/booking/:booking_id', addServiceToBooking)

module.exports = router
