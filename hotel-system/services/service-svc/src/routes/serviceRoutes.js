const express = require('express')
const router = express.Router()
const {
  getServices,
  createService,
  updateService,
  deleteService,
  getBookingServices,
  addServiceToBooking,
  removeServiceFromBooking
} = require('../controllers/serviceController')

router.get('/', getServices)
router.post('/', createService)
router.put('/:id', updateService)
router.delete('/:id', deleteService)

router.get('/booking/:booking_id', getBookingServices)
router.post('/booking/:booking_id', addServiceToBooking)
router.delete('/booking/:booking_id/services/:id', removeServiceFromBooking)

module.exports = router
