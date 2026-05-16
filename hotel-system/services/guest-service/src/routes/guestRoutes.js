const express = require('express')
const router = express.Router()
const {
  getGuests,
  createGuest,
  updateGuest,
  toggleBlacklist
} = require('../controllers/guestController')

router.get('/', getGuests)
router.post('/', createGuest)
router.put('/:id', updateGuest)
router.patch('/:id/blacklist', toggleBlacklist)

module.exports = router
